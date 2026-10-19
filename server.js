import express from "express";
import path from "node:path";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Pool } from "pg";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express(), PORT = Number(process.env.PORT || 10000), MAX_UPLOAD = 50 * 1024 * 1024;
const PLATFORMS = new Set(["windows", "android", "ios"]), CHANNELS = new Set(["stable", "beta", "preview"]), STATUSES = new Set(["draft", "published", "archived"]);
const EXTENSIONS = new Set([".exe", ".msi", ".msix", ".zip", ".7z", ".apk", ".aab", ".dmg", ".pkg", ".ipa", ".appimage"]);
let pool, schemaPromise, s3Client;
const rate = new Map();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "128kb", strict: true }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin"); res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
  const origin = req.get("origin"), allowed = String(process.env.CORS_ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes(origin)) return req.path.startsWith("/api/") ? res.status(403).json({ error: "Origin không được cho phép." }) : next();
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin); res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Filename,X-Platform"); res.setHeader("Access-Control-Max-Age", "600"); res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.path.startsWith("/api/")) {
    const key = String(req.ip || req.socket.remoteAddress || "unknown"), now = Date.now(), bucket = rate.get(key);
    if (!bucket || now - bucket.start > 60000) rate.set(key, { start: now, count: 1 });
    else if (++bucket.count > 240) return res.status(429).json({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." });
    if (rate.size > 5000) for (const [ip, value] of rate) if (now - value.start > 120000) rate.delete(ip);
  }
  next();
});
function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }, max: 8, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, allowExitOnIdle: true });
  return pool;
}
async function ensureSchema() {
  const db = getPool(); if (!db) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!schemaPromise) schemaPromise = (async () => {
    await db.query("CREATE TABLE IF NOT EXISTS releases (id TEXT PRIMARY KEY, name TEXT NOT NULL, version TEXT NOT NULL, build INTEGER NOT NULL DEFAULT 0, platform TEXT NOT NULL CHECK (platform IN ('windows','android','ios')), channel TEXT NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable','beta','preview')), release_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), file_size BIGINT NOT NULL DEFAULT 0, download_url TEXT, sha256 TEXT, release_notes TEXT NOT NULL DEFAULT '', mandatory BOOLEAN NOT NULL DEFAULT FALSE, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')), r2_key TEXT, downloads BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(platform, channel, version))");
    await db.query("CREATE INDEX IF NOT EXISTS releases_public_lookup ON releases(status, platform, channel, release_date DESC)");
    await db.query("CREATE TABLE IF NOT EXISTS audit_events (id BIGSERIAL PRIMARY KEY, event_type TEXT NOT NULL, release_id TEXT, actor TEXT NOT NULL DEFAULT 'admin-token', details JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  })().catch(error => { schemaPromise = undefined; throw error; });
  await schemaPromise; return db;
}
function rowToRelease(r) { return { id:String(r.id), name:String(r.name), version:String(r.version), build:Number(r.build||0), platform:r.platform, channel:r.channel||"stable", releaseDate:new Date(r.release_date).toISOString(), fileSize:Number(r.file_size||0), downloadUrl:r.download_url||null, sha256:r.sha256||null, releaseNotes:r.release_notes||"", mandatory:Boolean(r.mandatory), status:r.status, r2Key:r.r2_key||null, downloads:Number(r.downloads||0), createdAt:new Date(r.created_at).toISOString(), updatedAt:new Date(r.updated_at).toISOString() }; }
function safeHttps(value) { try { const u = new URL(String(value||"")); return u.protocol === "https:" && Boolean(u.hostname) && !u.username && !u.password; } catch { return false; } }
function configured() {
  try {
    const data = JSON.parse(process.env.RELEASES_JSON || "[]"); if (!Array.isArray(data)) return [];
    return data.map((r,i) => ({ id:String(r.id||"manifest-"+i), name:String(r.name||"Hendy App"), version:String(r.version||"0.0.0"), build:Number(r.build||0), platform:String(r.platform||"windows"), channel:String(r.channel||"stable"), releaseDate:r.releaseDate||null, fileSize:Number(r.fileSize||0), downloadUrl:safeHttps(r.downloadUrl)?r.downloadUrl:null, sha256:/^[a-f0-9]{64}$/i.test(String(r.sha256||""))?String(r.sha256).toLowerCase():null, releaseNotes:String(r.releaseNotes||""), mandatory:Boolean(r.mandatory), status:String(r.status||"published"), downloads:Number(r.downloads||0) })).filter(r => PLATFORMS.has(r.platform) && CHANNELS.has(r.channel));
  } catch { return []; }
}
async function listReleases(includePrivate=false) {
  const db=getPool(); if (!db) return configured().filter(r => includePrivate || r.status==="published");
  await ensureSchema(); const result=await db.query(includePrivate?"SELECT * FROM releases ORDER BY updated_at DESC":"SELECT * FROM releases WHERE status='published' ORDER BY release_date DESC");
  return result.rows.map(rowToRelease);
}
function compareVersions(left,right) {
  const clean=v=>String(v||"0").replace(/^v/i,"").split("+")[0].split("-");
  const l=clean(left),r=clean(right),a=l[0].split(".").map(n=>Number(n)||0),b=r[0].split(".").map(n=>Number(n)||0);
  for(let i=0;i<Math.max(a.length,b.length);i++) if((a[i]||0)!==(b[i]||0)) return (a[i]||0)-(b[i]||0);
  if(l.length===r.length)return 0;if(l.length===1)return 1;if(r.length===1)return -1;return l[1].localeCompare(r[1],undefined,{numeric:true});
}
function normalize(body) {
  const name=String(body?.name||"").trim().slice(0,120),version=String(body?.version||"").trim().replace(/^v/i,"").slice(0,64);
  const platform=String(body?.platform||""),channel=String(body?.channel||"stable"),status=String(body?.status||"draft");
  const build=Number(body?.build||0),fileSize=Number(body?.fileSize||0),downloadUrl=body?.downloadUrl?String(body.downloadUrl).trim():null,sha256=body?.sha256?String(body.sha256).trim().toLowerCase():null;
  if(!name||!version)throw new Error("Tên ứng dụng và phiên bản là bắt buộc.");
  if(!/^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$/.test(version))throw new Error("Phiên bản không đúng định dạng.");
  if(!PLATFORMS.has(platform)||!CHANNELS.has(channel)||!STATUSES.has(status))throw new Error("Nền tảng, kênh hoặc trạng thái không hợp lệ.");
  if(!Number.isSafeInteger(build)||build<0||!Number.isSafeInteger(fileSize)||fileSize<0)throw new Error("Build number hoặc dung lượng tệp không hợp lệ.");
  if(downloadUrl&&!safeHttps(downloadUrl))throw new Error("URL tải phải sử dụng HTTPS.");
  if(sha256&&!/^[a-f0-9]{64}$/i.test(sha256))throw new Error("SHA-256 phải có 64 ký tự hex.");
  if(status==="published"&&(!downloadUrl||!sha256||fileSize<1))throw new Error("Để xuất bản, cần URL HTTPS, SHA-256 hợp lệ và dung lượng lớn hơn 0.");
  return {name,version,platform,channel,status,build,fileSize,downloadUrl,sha256:sha256||null,releaseNotes:String(body?.releaseNotes||"").trim().slice(0,8000),mandatory:Boolean(body?.mandatory),r2Key:body?.r2Key?String(body.r2Key).slice(0,512):null};
}
function authorized(req) {
  const expected=String(process.env.ADMIN_API_TOKEN||""),received=String(req.get("authorization")||"").replace(/^Bearer\s+/i,"");
  if(!expected||!received)return false;const a=Buffer.from(expected),b=Buffer.from(received);return a.length===b.length&&timingSafeEqual(a,b);
}
function requireAdmin(req,res,next) {
  if(!process.env.ADMIN_API_TOKEN)return res.status(503).json({error:"ADMIN_API_TOKEN chưa được cấu hình."});
  if(!authorized(req))return res.status(401).json({error:"Token quản trị không hợp lệ."});
  if(!getPool())return res.status(503).json({error:"Cần DATABASE_URL để bật quản trị có lưu trữ bền vững."});
  next();
}
function getS3() {
  if(!process.env.R2_ACCOUNT_ID||!process.env.R2_ACCESS_KEY_ID||!process.env.R2_SECRET_ACCESS_KEY||!process.env.R2_BUCKET_NAME)return null;
  if(!s3Client)s3Client=new S3Client({region:"auto",endpoint:"https://"+process.env.R2_ACCOUNT_ID+".r2.cloudflarestorage.com",credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
  return s3Client;
}
function publicUrl(key) { const base=String(process.env.R2_PUBLIC_BASE_URL||"").replace(/\/+$/,"");return safeHttps(base)?base+"/"+key.split("/").map(encodeURIComponent).join("/"):null; }
async function audit(type,id,details={}) { const db=getPool();if(!db)return;try{await db.query("INSERT INTO audit_events(event_type,release_id,details) VALUES($1,$2,$3::jsonb)",[type,id||null,JSON.stringify(details)]);}catch(e){console.error("Audit write failed:",e.message);} }

app.get(["/api/health","/health"],async(_req,res)=>{
  try {
    if(!getPool()){const prod=process.env.NODE_ENV==="production";return res.status(prod?503:200).json({status:prod?"degraded":"ok",service:"hendy-server-app-store",version:"2.0.0",database:"manifest-read-only",storage:Boolean(getS3()),timestamp:new Date().toISOString()});}
    const db=await ensureSchema();await db.query("SELECT 1");res.json({status:"ok",service:"hendy-server-app-store",version:"2.0.0",database:"postgres",storage:Boolean(getS3()&&process.env.R2_PUBLIC_BASE_URL),timestamp:new Date().toISOString()});
  }catch{res.status(503).json({status:"degraded",service:"hendy-server-app-store",database:"unavailable",timestamp:new Date().toISOString()});}
});
app.get("/api/meta",(_req,res)=>res.json({service:"Hendy Server App Store API",version:"2.0.0",routes:{health:"/api/health",releases:"/api/releases",updateCheck:"/api/update-check",admin:"/api/admin/releases"},platforms:Array.from(PLATFORMS),channels:Array.from(CHANNELS)}));
app.get("/api/releases",async(_req,res,next)=>{try{const releases=await listReleases();res.json({success:true,total:releases.length,releases});}catch(e){next(e);}});
app.get("/api/releases/:id",async(req,res,next)=>{try{const release=(await listReleases()).find(r=>r.id===req.params.id);if(!release)return res.status(404).json({error:"Không tìm thấy bản phát hành."});res.json({success:true,release});}catch(e){next(e);}});
app.get("/api/update-check",async(req,res,next)=>{
  try {
    const platform=String(req.query.platform||"windows"),channel=String(req.query.channel||"stable"),currentVersion=String(req.query.currentVersion||"0.0.0");
    if(!PLATFORMS.has(platform)||!CHANNELS.has(channel))return res.status(400).json({error:"Nền tảng hoặc kênh phát hành không hợp lệ."});
    const candidates=(await listReleases()).filter(r=>r.platform===platform&&r.channel===channel).sort((a,b)=>compareVersions(b.version,a.version)),latest=candidates[0];
    if(!latest)return res.json({updateAvailable:false,platform,channel,currentVersion,message:"Chưa có bản phát hành phù hợp."});
    res.json({updateAvailable:compareVersions(latest.version,currentVersion)>0,currentVersion,latestVersion:latest.version,platform,channel,downloadUrl:latest.downloadUrl,sha256:latest.sha256,fileSize:latest.fileSize,releaseNotes:latest.releaseNotes,mandatory:latest.mandatory});
  }catch(e){next(e);}
});
app.get("/api/download/:id",async(req,res,next)=>{
  try {
    let release;const db=getPool();
    if(db){await ensureSchema();const r=await db.query("UPDATE releases SET downloads=downloads+1 WHERE id=$1 AND status='published' RETURNING download_url",[req.params.id]);if(r.rowCount)release={downloadUrl:r.rows[0].download_url};}
    else release=(await listReleases()).find(r=>r.id===req.params.id);
    if(!release||!safeHttps(release.downloadUrl))return res.status(404).json({error:"Không có liên kết tải hợp lệ."});res.redirect(302,release.downloadUrl);
  }catch(e){next(e);}
});
app.get("/api/telemetry",async(_req,res,next)=>{try{res.json({service:"hendy-server-app-store",version:"2.0.0",uptimeSeconds:Math.floor(process.uptime()),publishedReleases:(await listReleases()).length,timestamp:new Date().toISOString()});}catch(e){next(e);}});

app.use("/api/admin",requireAdmin);
app.get("/api/admin/releases",async(_req,res,next)=>{try{const releases=await listReleases(true);res.json({success:true,total:releases.length,releases});}catch(e){next(e);}});
app.get("/api/admin/overview",async(_req,res,next)=>{
  try{const db=await ensureSchema();const counts=await db.query("SELECT status,COUNT(*)::int AS count,COALESCE(SUM(downloads),0)::bigint AS downloads FROM releases GROUP BY status");const events=await db.query("SELECT id,event_type,release_id,details,created_at FROM audit_events ORDER BY created_at DESC LIMIT 20");res.json({success:true,summary:counts.rows.map(r=>({status:r.status,count:Number(r.count),downloads:Number(r.downloads)})),recentEvents:events.rows.map(r=>({id:r.id,type:r.event_type,releaseId:r.release_id,details:r.details,createdAt:r.created_at}))});}catch(e){next(e);}
});
app.post("/api/admin/releases",async(req,res,next)=>{
  try{const d=normalize(req.body),db=await ensureSchema(),id=randomUUID();const r=await db.query("INSERT INTO releases(id,name,version,build,platform,channel,file_size,download_url,sha256,release_notes,mandatory,status,r2_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *",[id,d.name,d.version,d.build,d.platform,d.channel,d.fileSize,d.downloadUrl,d.sha256,d.releaseNotes,d.mandatory,d.status,d.r2Key]);await audit("release.created",id,{version:d.version,platform:d.platform,status:d.status});res.status(201).json({success:true,release:rowToRelease(r.rows[0])});}
  catch(e){if(e?.code==="23505")return res.status(409).json({error:"Phiên bản đã tồn tại trên cùng nền tảng và kênh."});if(e instanceof Error&&!e.code)return res.status(400).json({error:e.message});next(e);}
});
app.patch("/api/admin/releases/:id",async(req,res,next)=>{
  try{const db=await ensureSchema(),cur=await db.query("SELECT * FROM releases WHERE id=$1",[req.params.id]);if(!cur.rows.length)return res.status(404).json({error:"Không tìm thấy bản phát hành."});const d=normalize({...rowToRelease(cur.rows[0]),...req.body});const r=await db.query("UPDATE releases SET name=$2,version=$3,build=$4,platform=$5,channel=$6,file_size=$7,download_url=$8,sha256=$9,release_notes=$10,mandatory=$11,status=$12,r2_key=$13,updated_at=NOW() WHERE id=$1 RETURNING *",[req.params.id,d.name,d.version,d.build,d.platform,d.channel,d.fileSize,d.downloadUrl,d.sha256,d.releaseNotes,d.mandatory,d.status,d.r2Key]);await audit("release.updated",req.params.id,{status:d.status,version:d.version});res.json({success:true,release:rowToRelease(r.rows[0])});}
  catch(e){if(e?.code==="23505")return res.status(409).json({error:"Phiên bản đã tồn tại trên cùng nền tảng và kênh."});if(e instanceof Error&&!e.code)return res.status(400).json({error:e.message});next(e);}
});
app.delete("/api/admin/releases/:id",async(req,res,next)=>{
  try{const db=await ensureSchema(),r=await db.query("DELETE FROM releases WHERE id=$1 RETURNING r2_key,version,platform",[req.params.id]);if(!r.rows.length)return res.status(404).json({error:"Không tìm thấy bản phát hành."});await audit("release.deleted",req.params.id,{version:r.rows[0].version,platform:r.rows[0].platform});if(r.rows[0].r2_key&&getS3())try{await getS3().send(new DeleteObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:r.rows[0].r2_key}));}catch(e){console.error("R2 delete failed:",e.message);}res.json({success:true});}
  catch(e){next(e);}
});
app.post("/api/admin/uploads",express.raw({type:"application/octet-stream",limit:MAX_UPLOAD}),async(req,res)=>{
  try{
    const bytes=req.body;if(!Buffer.isBuffer(bytes)||bytes.length<1)return res.status(400).json({error:"Gửi tệp dưới dạng application/octet-stream."});
    const platform=String(req.get("x-platform")||"windows");if(!PLATFORMS.has(platform))return res.status(400).json({error:"Nền tảng không hợp lệ."});
    const filename=path.basename(String(req.get("x-filename")||"release.bin")).replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,100);if(!EXTENSIONS.has(path.extname(filename).toLowerCase()))return res.status(400).json({error:"Định dạng tệp không được hỗ trợ."});
    const s3=getS3();if(!s3||!safeHttps(process.env.R2_PUBLIC_BASE_URL))return res.status(503).json({error:"Cần cấu hình Cloudflare R2 và R2_PUBLIC_BASE_URL HTTPS."});
    const sha256=createHash("sha256").update(bytes).digest("hex"),key="releases/"+platform+"/"+new Date().toISOString().slice(0,10)+"/"+randomUUID()+"-"+filename;
    await s3.send(new PutObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:key,Body:bytes,ContentLength:bytes.length,ContentType:"application/octet-stream",ContentDisposition:"attachment; filename="+filename,Metadata:{sha256,platform}}));
    const downloadUrl=publicUrl(key);if(!downloadUrl)return res.status(503).json({error:"URL R2 chưa hợp lệ. Kiểm tra R2_PUBLIC_BASE_URL."});res.status(201).json({success:true,key,filename,downloadUrl,fileSize:bytes.length,sha256});
  }catch(e){console.error("R2 upload failed:",e?.message||e);res.status(500).json({error:"Không thể tải tệp lên kho lưu trữ."});}
});
app.use(express.static(path.join(root,"dist"),{index:false,maxAge:"1h",fallthrough:true}));
app.get("/",(_req,res,next)=>res.sendFile(path.join(root,"dist","index.html"),e=>{if(e)next(e);}));
app.get(["/admin","/admin/"],(_req,res,next)=>res.sendFile(path.join(root,"dist","admin.html"),e=>{if(e)next(e);}));
app.use((req,res,next)=>{if(req.method!=="GET"&&req.method!=="HEAD")return res.status(404).json({error:"Route not found."});if(req.path==="/api"||req.path.startsWith("/api/"))return res.status(404).json({error:"API route not found."});if(req.path==="/control-plane")return res.redirect(301,"/control-plane/");if(req.path==="/studio")return res.redirect(301,"/studio/");if(req.accepts("html"))return res.sendFile(path.join(root,"dist","index.html"),e=>{if(e)next(e);});res.status(404).json({error:"Not found."});});
app.use((error,_req,res,_next)=>{if(error?.type==="entity.too.large")return res.status(413).json({error:"Yêu cầu vượt quá giới hạn cho phép."});if(error?.type==="entity.parse.failed")return res.status(400).json({error:"JSON request không hợp lệ."});console.error("Request error:",error?.message||error);if(!res.headersSent)res.status(500).json({error:"Lỗi máy chủ. Vui lòng thử lại sau."});});
const entry=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(entry){const server=app.listen(PORT,"0.0.0.0",()=>console.log("Hendy Server App Store 2.0 listening on "+PORT));const stop=()=>server.close(async()=>{try{if(pool)await pool.end();}catch{}process.exit(0);});process.on("SIGTERM",stop);process.on("SIGINT",stop);}
export {app};
