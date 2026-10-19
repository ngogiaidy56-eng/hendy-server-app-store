import "./style.css";

type Release = {id:string;name:string;version:string;platform:string;channel?:string;status?:string;downloadUrl?:string|null;sha256?:string|null;fileSize?:number;build?:number;releaseNotes?:string;mandatory?:boolean};
type ApiResult = {releases?:Release[];release?:Release;error?:string;message?:string;success?:boolean};
const API = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "hendy-store-admin-token";
let token = sessionStorage.getItem(TOKEN_KEY) || "";
let records: Release[] = [];
const el = <T extends HTMLElement>(selector:string):T => {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error("Missing UI element: " + selector);
  return node;
};
function esc(value:unknown):string { return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!)); }
function fmt(bytes=0):string { if (!bytes) return "—"; const units=["B","KB","MB","GB"]; let i=0,n=bytes; while(n>=1024&&i<3){n/=1024;i++;} return n.toFixed(i?1:0)+" "+units[i]; }
function msg(text:string,kind="info"):void { el("#message").textContent=text; el("#message").className="message "+kind; }
async function api(path:string,init:RequestInit={}):Promise<ApiResult>{
  const headers=new Headers(init.headers); headers.set("Accept","application/json");
  if(token) headers.set("Authorization","Bearer "+token);
  const response=await fetch(API+path,{...init,headers});
  let data:ApiResult={}; try{data=await response.json() as ApiResult;}catch{}
  if(!response.ok) throw new Error(data.error||data.message||("API error "+response.status));
  return data;
}
function render():void{
  const published=records.filter(r=>r.status==="published").length;
  el("#metric-total").textContent=String(records.length);
  el("#metric-published").textContent=String(published);
  el("#metric-platforms").textContent=String(new Set(records.map(r=>r.platform)).size);
  el("#metric-status").textContent=token?"Connected":"Locked";
  if(!records.length){el("#release-list").innerHTML='<div class="empty">Chưa có release trong kho quản trị.</div>';return;}
  el("#release-list").innerHTML=records.map(r=>{
    const next=r.status==="published"?"draft":"published";
    const label=r.status==="published"?"Đã xuất bản":r.status==="archived"?"Đã lưu trữ":"Bản nháp";
    return '<article class="release-row"><div class="release-row-title"><b>'+esc(r.name)+' <span>v'+esc(r.version)+'</span></b><small>'+esc(r.platform)+' · '+esc(r.channel||"stable")+' · '+fmt(r.fileSize)+'</small></div><em class="tag tag-'+esc(r.status||"draft")+'">'+label+'</em><div class="row-actions"><button class="btn btn-mini" data-action="'+next+'" data-id="'+esc(r.id)+'">'+(next==="published"?"Xuất bản":"Thu hồi")+'</button><button class="btn btn-mini btn-red" data-action="delete" data-id="'+esc(r.id)+'">Xóa</button></div></article>';
  }).join("");
}
async function refresh():Promise<void>{const data=await api("/api/admin/releases");records=Array.isArray(data.releases)?data.releases:[];render();}
function connected(value:boolean):void{
  el("#auth-notice").classList.toggle("connected",value);
  (el("#admin-token") as HTMLInputElement).disabled=value;
  (el("#token-form button") as HTMLButtonElement).hidden=value;
  el("#logout-btn").hidden=!value;
  el("#connect-btn").hidden=value;
}
async function connect(candidate:string):Promise<void>{
  token=candidate;
  const data=await api("/api/admin/releases");
  records=Array.isArray(data.releases)?data.releases:[];
  sessionStorage.setItem(TOKEN_KEY,token); connected(true);
  el("#api-health").textContent="Đã xác thực";
  msg("Đã kết nối đến API quản trị.", "success"); render();
}
el("#token-form").addEventListener("submit",async event=>{
  event.preventDefault(); const candidate=(el("#admin-token") as HTMLInputElement).value.trim();
  try{msg("Đang xác thực…");await connect(candidate);}
  catch(error){token="";sessionStorage.removeItem(TOKEN_KEY);connected(false);msg((error as Error).message,"error");}
});
el("#connect-btn").addEventListener("click",()=>{el("#auth-notice").scrollIntoView({behavior:"smooth",block:"center"});(el("#admin-token") as HTMLInputElement).focus();});
el("#logout-btn").addEventListener("click",()=>{token="";records=[];sessionStorage.removeItem(TOKEN_KEY);connected(false);render();msg("Đã thoát khỏi phiên quản trị.");el("#admin-token").setAttribute("value","");});
el("#refresh-releases").addEventListener("click",async()=>{try{await refresh();msg("Đã làm mới danh sách.","success");}catch(error){msg((error as Error).message,"error");}});
el("#release-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!token){msg("Cần xác thực token quản trị trước.","error");return;}
  const form=event.currentTarget as HTMLFormElement;const fd=new FormData(form);
  const payload={name:String(fd.get("name")||"").trim(),version:String(fd.get("version")||"").trim(),platform:String(fd.get("platform")||"windows"),channel:String(fd.get("channel")||"stable"),downloadUrl:String(fd.get("downloadUrl")||"").trim()||null,sha256:String(fd.get("sha256")||"").trim().toLowerCase()||null,fileSize:Number(fd.get("fileSize")||0),build:Number(fd.get("build")||0),releaseNotes:String(fd.get("releaseNotes")||""),mandatory:fd.get("mandatory")==="on",status:String(fd.get("status")||"draft")};
  const btn=form.querySelector<HTMLButtonElement>("button[type=submit]")!;btn.disabled=true;
  try{await api("/api/admin/releases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});msg("Đã tạo release metadata.","success");form.reset();(form.elements.namedItem("name") as HTMLInputElement).value="Hendy Tools";await refresh();}
  catch(error){msg((error as Error).message,"error");}finally{btn.disabled=false;}
});
el("#release-list").addEventListener("click",async event=>{
  const b=(event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");if(!b)return;
  const id=b.dataset.id||"",action=b.dataset.action;const release=records.find(r=>r.id===id);if(!release)return;
  if(action==="delete"&&!confirm("Xóa "+release.name+" v"+release.version+"?"))return;
  b.disabled=true;try{
    if(action==="delete")await api("/api/admin/releases/"+encodeURIComponent(id),{method:"DELETE"});
    else await api("/api/admin/releases/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:action})});
    msg(action==="delete"?"Đã xóa release.":action==="published"?"Đã xuất bản release.":"Đã thu hồi release.","success");await refresh();
  }catch(error){msg((error as Error).message,"error");}finally{b.disabled=false;}
});
document.querySelectorAll<HTMLButtonElement>("[data-section]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-section]").forEach(item=>item.classList.remove("active"));button.classList.add("active");
  const section=button.dataset.section||"overview";const title=section==="releases"?"Bản phát hành":section==="pipelines"?"Pipeline phát hành":section==="settings"?"Cấu hình hệ thống":"Tổng quan hệ thống";
  el("#page-title").textContent=title;
  if(section==="pipelines")el("#pipeline-section").scrollIntoView({behavior:"smooth"});
  else if(section==="releases")el("#release-panel").scrollIntoView({behavior:"smooth"});
  else if(section==="settings")el("#ops-panel").scrollIntoView({behavior:"smooth"});
  else window.scrollTo({top:0,behavior:"smooth"});
}));
connected(false);
el("#metric-total").textContent="—";el("#metric-published").textContent="—";el("#metric-platforms").textContent="—";
if(token) void connect(token).catch(()=>{token="";sessionStorage.removeItem(TOKEN_KEY);connected(false);});
fetch(API+"/api/health").then(r=>{if(!r.ok)throw new Error();el("#api-health").textContent="Online";}).catch(()=>{el("#api-health").textContent="Offline";});
