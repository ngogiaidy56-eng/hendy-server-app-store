import "./style.css";
type Release={id:string;name:string;version:string;platform:string;channel?:string;status?:string;fileSize?:number};
type Result={status?:string;service?:string;version?:string;database?:string;storage?:boolean;uptimeSeconds?:number;publishedReleases?:number;releases?:Release[];total?:number;error?:string};
const API=String(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,"");
const $=<T extends HTMLElement>(s:string):T=>{const e=document.querySelector<T>(s);if(!e)throw new Error("Missing control plane element "+s);return e;};
function esc(v:unknown):string{return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));}
function size(n=0):string{if(!n)return"—";const u=["B","KB","MB","GB"];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++;}return n.toFixed(i?1:0)+" "+u[i];}
async function get(p:string):Promise<Result>{const r=await fetch(API+p,{headers:{Accept:"application/json"}});const d=await r.json() as Result;if(!r.ok)throw new Error(d.error||p+" returned "+r.status);return d;}
async function load():Promise<void>{
  $("#cp-refresh").setAttribute("disabled","true");$("#cp-message").textContent="Đang đồng bộ trạng thái…";
  try{
    const [health,telemetry,catalog]=await Promise.all([get("/api/health"),get("/api/telemetry"),get("/api/releases")]);
    $("#health-state").textContent=health.status==="ok"?"Online":"Degraded";$("#health-state").className=health.status==="ok"?"cp-online":"cp-degraded";$("#health-detail").textContent=health.service||"API health";
    $("#release-total").textContent=String(telemetry.publishedReleases??catalog.total??0);const sec=Number(telemetry.uptimeSeconds||0);$("#uptime-total").textContent=sec>86400?Math.floor(sec/86400)+"d":sec>3600?Math.floor(sec/3600)+"h":Math.floor(sec/60)+"m";
    $("#health-card").innerHTML='<span class="cp-health-mark">✓</span><div><b>Backend đã phản hồi</b><p>'+esc(health.service)+' · phiên bản '+esc(health.version)+'</p></div>';
    $("#db-state").textContent=String(health.database||"unknown");$("#storage-state").textContent=health.storage?"Đã cấu hình":"Chưa cấu hình";$("#api-origin").textContent=API||location.origin;
    const items=Array.isArray(catalog.releases)?catalog.releases.slice(0,8):[];
    $("#cp-releases").innerHTML=items.length?items.map(r=>'<article class="cp-release-row"><span class="cp-release-platform">'+esc(r.platform.slice(0,1).toUpperCase())+'</span><div><b>'+esc(r.name)+' <span>v'+esc(r.version)+'</span></b><small>'+esc(r.platform)+' · '+esc(r.channel||"stable")+' · '+size(r.fileSize)+'</small></div><span class="cp-release-status">PUBLISHED</span></article>').join(""):'<p class="cp-empty">Chưa có bản phát hành công khai.</p>';
    $("#cp-message").textContent="Đồng bộ thành công lúc "+new Date().toLocaleTimeString("vi-VN");
  }catch(e){$("#health-state").textContent="Offline";$("#health-state").className="cp-degraded";$("#health-detail").textContent="Không kết nối API";$("#health-card").innerHTML='<span class="cp-error-mark">!</span><div><b>Không thể kiểm tra backend</b><p>'+esc((e as Error).message)+'</p></div>';$("#cp-message").textContent="Kiểm tra Render health, VITE_API_BASE_URL và Worker.";}
  finally{$("#cp-refresh").removeAttribute("disabled");}
}
$("#cp-refresh").addEventListener("click",()=>void load());void load();
