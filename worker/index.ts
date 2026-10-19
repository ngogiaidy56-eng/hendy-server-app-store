interface Env { RENDER_API_ORIGIN?: string; ALLOWED_ORIGIN?: string; }
const SECURITY: Record<string,string> = {"x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=()","cache-control":"no-store"};
const METHODS="GET,HEAD,POST,PATCH,DELETE,OPTIONS", HEADERS="Authorization,Content-Type,X-Filename,X-Platform";
function json(body:unknown,status=200,extra:Record<string,string>={}):Response{return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8",...SECURITY,...extra}});}
function originOf(value?:string):string|null{if(!value)return null;try{const u=new URL(value);if(u.protocol!=="https:"||!u.hostname||u.username||u.password||u.pathname!=="/"||u.search||u.hash)return null;return u.origin;}catch{return null;}}
function cors(origin:string|null,allowed:string|null):Record<string,string>{return origin&&allowed&&origin===allowed?{"access-control-allow-origin":allowed,"access-control-allow-methods":METHODS,"access-control-allow-headers":HEADERS,"access-control-max-age":"600","vary":"Origin"}:{};}
function withHeaders(response:Response,extra:Record<string,string>):Response{const h=new Headers(response.headers);Object.entries(SECURITY).forEach(([k,v])=>h.set(k,v));Object.entries(extra).forEach(([k,v])=>h.set(k,v));h.set("x-hendy-edge","cloudflare-worker");return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});}
export default {async fetch(request:Request,env:Env):Promise<Response>{
  const incoming=new URL(request.url),origin=request.headers.get("origin"),allowed=originOf(env.ALLOWED_ORIGIN),corsHeaders=cors(origin,allowed);
  if(incoming.pathname==="/"&&request.method==="GET")return json({service:"Hendy Server App Store Edge",version:"2.0.0",status:"ok",upstreamConfigured:Boolean(originOf(env.RENDER_API_ORIGIN)),endpoints:["/api/health","/api/meta","/api/releases","/api/update-check"]});
  const health=incoming.pathname==="/health",api=incoming.pathname==="/api"||incoming.pathname.startsWith("/api/");
  if(!api&&!health)return json({error:"Route not found."},404,corsHeaders);
  if(origin&&(!allowed||origin!==allowed))return json({error:"Origin không được cho phép."},403);
  if(request.method==="OPTIONS"){if(!origin||!allowed||origin!==allowed)return json({error:"CORS preflight bị từ chối."},403);return new Response(null,{status:204,headers:corsHeaders});}
  if(!["GET","HEAD","POST","PATCH","DELETE"].includes(request.method))return json({error:"Method not allowed."},405,{allow:METHODS});
  const upstream=originOf(env.RENDER_API_ORIGIN);if(!upstream)return json({error:"RENDER_API_ORIGIN chưa được cấu hình bằng HTTPS origin hợp lệ."},503,corsHeaders);
  const target=new URL(incoming.pathname+incoming.search,upstream);if(health)target.pathname="/api/health";
  const headers=new Headers(request.headers);["host","origin","cf-connecting-ip","cf-ray","cf-visitor"].forEach(k=>headers.delete(k));headers.set("x-forwarded-proto","https");
  const init:RequestInit={method:request.method,headers,redirect:"manual"};if(request.method!=="GET"&&request.method!=="HEAD")init.body=request.body;
  try{return withHeaders(await fetch(new Request(target.toString(),init)),corsHeaders);}catch{return json({error:"Render API upstream không phản hồi."},502,corsHeaders);}
}};