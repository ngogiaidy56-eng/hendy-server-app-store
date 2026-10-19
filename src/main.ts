import "./style.css";
type Platform="windows"|"android"|"ios";
type Release={id:string;name:string;version:string;build?:number;platform:Platform;channel?:string;releaseDate?:string;fileSize?:number;downloadUrl?:string|null;sha256?:string|null;releaseNotes?:string;mandatory?:boolean;status?:string};
type Payload={releases?:Release[];total?:number;error?:string};
const API=String(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,"");
const catalog=[{id:"windows" as Platform,title:"Hendy for Windows",sub:"DESKTOP / X64",glyph:"▣",description:"Bộ công cụ dành cho máy tính Windows.",accent:"violet"},{id:"android" as Platform,title:"Hendy Mobile",sub:"ANDROID / APK",glyph:"◉",description:"Trải nghiệm tiện ích Hendy trên Android.",accent:"mint"},{id:"ios" as Platform,title:"Hendy for iOS",sub:"IOS / MOBILE",glyph:"◇",description:"Thông tin phát hành iOS khi có gói hợp lệ.",accent:"blue"}];
let releases:Release[]=[];let activeFilter="all";
const $=<T extends HTMLElement>(selector:string):T=>{const e=document.querySelector<T>(selector);if(!e)throw new Error("Missing UI element: "+selector);return e;};
function esc(v:unknown):string{return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));}
function validHttps(v?:string|null):boolean{try{return new URL(String(v||"")).protocol==="https:";}catch{return false;}}
function size(bytes?:number):string{if(!bytes||bytes<1)return"Chưa có tệp tải";const units=["B","KB","MB","GB"];let n=bytes,i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return n.toFixed(i?1:0)+" "+units[i];}
function newest(items:Release[]):Release[]{return [...items].sort((a,b)=>Number(b.build||0)-Number(a.build||0)||String(b.releaseDate||"").localeCompare(String(a.releaseDate||"")));}
function render():void{
  const visible=catalog.filter(item=>activeFilter==="all"||item.id===activeFilter);
  $("#app-grid").innerHTML=visible.map(item=>{
    const release=newest(releases.filter(r=>r.platform===item.id&&r.status==="published"))[0];
    const ready=Boolean(release&&validHttps(release.downloadUrl));
    const version=release?"v"+esc(release.version):"Chưa phát hành";
    const date=release?.releaseDate?new Date(release.releaseDate).toLocaleDateString("vi-VN"):"Đang chờ phát hành";
    const downloadPath=release?API+"/api/download/"+encodeURIComponent(release.id):"#";
    const link=ready?'<a class="button button-primary button-small" href="'+esc(downloadPath)+'">Tải ứng dụng <span>↓</span></a>':'<button class="button button-disabled button-small" type="button" disabled>Chưa có tệp tải</button>';
    const hash=release?.sha256?'<details class="checksum"><summary>SHA-256 <span>+</span></summary><code>'+esc(release.sha256)+'</code></details>':'<div class="checksum checksum-missing">Checksum chưa được công bố</div>';
    const notes=release?.releaseNotes?'<p class="card-notes">'+esc(release.releaseNotes)+'</p>':"";
    return '<article class="app-card accent-'+item.accent+'"><div class="card-top"><span class="app-glyph">'+item.glyph+'</span><span class="platform-chip">'+item.sub+'</span></div><div><h3>'+item.title+'</h3><p>'+item.description+'</p></div><div class="release-meta"><span class="version-label">'+version+'</span><span>'+esc(release?.channel||"stable").toUpperCase()+'</span><span>'+size(release?.fileSize)+'</span></div>'+notes+'<div class="card-footer"><span class="release-date">'+esc(date)+'</span>'+link+'</div>'+hash+'</article>';
  }).join("")||'<div class="empty-state">Không có nền tảng phù hợp bộ lọc.</div>';
  const published=releases.filter(r=>r.status==="published");
  $("#release-count").textContent=String(published.length);
  $("#platform-count").textContent=String(new Set(published.map(r=>r.platform)).size||3).padStart(2,"0");
}
async function refresh():Promise<void>{
  try{
    const response=await fetch(API+"/api/releases",{headers:{Accept:"application/json"}});
    const data=await response.json() as Payload;
    if(!response.ok)throw new Error(data.error||"API error "+response.status);
    releases=Array.isArray(data.releases)?data.releases.filter(r=>r.status==="published"):[];
    $("#api-status").textContent="Online";$("#api-label").textContent="CONNECTED";
    $("#catalog-message").textContent=releases.length?"Đã đồng bộ "+releases.length+" bản phát hành từ API.":"API đã kết nối nhưng chưa có bản phát hành công khai.";
    render();
  }catch(error){
    $("#api-status").textContent="Offline";$("#api-label").textContent="UNAVAILABLE";
    $("#catalog-message").textContent="Không thể tải danh mục. Kiểm tra VITE_API_BASE_URL và backend.";
    $("#app-grid").innerHTML='<div class="empty-state error-state"><b>Không kết nối được API.</b><p>'+esc((error as Error).message)+'</p><button id="retry-api" class="button button-muted" type="button">Thử lại ↻</button></div>';
    $("#retry-api")?.addEventListener("click",()=>void refresh());
  }
}
document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(button=>button.addEventListener("click",()=>{
  activeFilter=button.dataset.filter||"all";
  document.querySelectorAll("[data-filter]").forEach(item=>item.classList.toggle("active",item===button));
  render();
}));
void refresh();
