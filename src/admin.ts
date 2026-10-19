import "./style.css";
type Release={id:string;name:string;version:string;platform:string;channel:string;status:string;downloadUrl?:string|null;sha256?:string|null;fileSize?:number;build?:number;releaseNotes?:string;mandatory?:boolean};
type Data={success?:boolean;releases?:Release[];release?:Release;error?:string;downloadUrl?:string;fileSize?:number;sha256?:string;key?:string};
const API=String(import.meta.env.VITE_API_BASE_URL||"").replace(/\/+$/,""),TOKEN_KEY="hendy-store-admin-token-v2";
let token=sessionStorage.getItem(TOKEN_KEY)||"",releases:Release[]=[];
const $=<T extends HTMLElement>(s:string):T=>{const e=document.querySelector<T>(s);if(!e)throw new Error("Missing admin element: "+s);return e;};
function esc(v:unknown):string{return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));}
function msg(text:string,type="info"):void{$("#admin-message").textContent=text;$("#admin-message").className="inline-message "+type;}
function size(n=0):string{if(!n)return"—";const units=["B","KB","MB","GB"];let i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return n.toFixed(i?1:0)+" "+units[i];}
async function api(path:string,init:RequestInit={}):Promise<Data>{const h=new Headers(init.headers);h.set("Accept","application/json");if(token)h.set("Authorization","Bearer "+token);const r=await fetch(API+path,{...init,headers:h});let d:Data={};try{d=await r.json() as Data;}catch{}if(!r.ok)throw new Error(d.error||"API error "+r.status);return d;}
function setConnected(value:boolean):void{$("#admin-workspace").hidden=!value;($("#admin-token") as HTMLInputElement).disabled=value;const submit=document.querySelector<HTMLButtonElement>("#admin-login-form button[type=submit]");if(submit)submit.hidden=value;$("#admin-logout").hidden=!value;}
function render():void{
  const published=releases.filter(r=>r.status==="published").length;
  $("#admin-summary").innerHTML='<div><b>'+releases.length+'</b><span>Tổng release</span></div><div><b>'+published+'</b><span>Đã xuất bản</span></div><div><b>'+new Set(releases.map(r=>r.platform)).size+'</b><span>Nền tảng</span></div><div><b id="admin-connection">Đã mở</b><span>API admin</span></div>';
  if(!releases.length){$("#release-list").innerHTML='<div class="empty-state">Chưa có bản phát hành. Tạo release đầu tiên bằng biểu mẫu.</div>';return;}
  $("#release-list").innerHTML=releases.map(r=>{
    const action=r.status==="published"?"archive":"publish",label=r.status==="published"?"Đã xuất bản":r.status==="archived"?"Đã lưu trữ":"Bản nháp";
    return '<article class="release-row"><div class="release-main"><div class="release-app-icon">'+esc(r.platform.slice(0,1).toUpperCase())+'</div><div><b>'+esc(r.name)+' <span>v'+esc(r.version)+'</span></b><small>'+esc(r.platform)+' · '+esc(r.channel)+' · '+size(r.fileSize)+' · build '+Number(r.build||0)+'</small><small class="hash-preview">'+(r.sha256?"SHA-256: "+esc(r.sha256.slice(0,16))+"…":"Chưa có SHA-256")+'</small></div></div><span class="release-state state-'+esc(r.status)+'">'+label+'</span><div class="row-actions"><button class="button button-tiny" data-action="'+action+'" data-id="'+esc(r.id)+'">'+(action==="publish"?"Xuất bản":"Thu hồi")+'</button><button class="button button-tiny button-danger" data-action="delete" data-id="'+esc(r.id)+'">Xóa</button></div></article>';
  }).join("");
}
async function refresh():Promise<void>{const data=await api("/api/admin/releases");releases=Array.isArray(data.releases)?data.releases:[];render();}
async function connect(candidate:string):Promise<void>{token=candidate;await refresh();sessionStorage.setItem(TOKEN_KEY,token);setConnected(true);msg("Đã xác thực và tải dữ liệu từ API quản trị.","success");}
$("#admin-login-form").addEventListener("submit",async event=>{event.preventDefault();const candidate=($("#admin-token") as HTMLInputElement).value.trim();if(!candidate)return;const button=document.querySelector<HTMLButtonElement>("#admin-login-form button[type=submit]");if(button)button.disabled=true;try{msg("Đang xác thực token…");await connect(candidate);}catch(error){token="";sessionStorage.removeItem(TOKEN_KEY);setConnected(false);msg((error as Error).message,"error");}finally{if(button)button.disabled=false;}});
$("#admin-logout").addEventListener("click",()=>{token="";releases=[];sessionStorage.removeItem(TOKEN_KEY);($("#admin-token") as HTMLInputElement).value="";setConnected(false);render();msg("Đã kết thúc phiên quản trị.");});
$("#refresh-releases").addEventListener("click",async()=>{try{await refresh();msg("Danh sách đã được cập nhật.","success");}catch(e){msg((e as Error).message,"error");}});
$("#release-form").addEventListener("submit",async event=>{
  event.preventDefault();if(!token){msg("Cần xác thực token trước.","error");return;}
  const form=event.currentTarget as HTMLFormElement;
  const field=<T extends HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(n:string)=>form.elements.namedItem(n) as T;
  const file=field<HTMLInputElement>("file").files?.[0],submit=form.querySelector<HTMLButtonElement>("button[type=submit]");
  if(file&&file.size>50*1024*1024){msg("Tệp vượt giới hạn 50 MiB.","error");return;}
  if(submit)submit.disabled=true;
  try{
    let uploaded:Data={};
    if(file){
      msg("Đang tải gói lên Cloudflare R2…");
      const response=await fetch(API+"/api/admin/uploads",{method:"POST",headers:{"Content-Type":"application/octet-stream","X-Filename":file.name,"X-Platform":field<HTMLSelectElement>("platform").value,"Authorization":"Bearer "+token},body:file});
      uploaded=await response.json() as Data;if(!response.ok)throw new Error(uploaded.error||"Upload thất bại.");
    }
    const payload={name:field<HTMLInputElement>("name").value.trim(),version:field<HTMLInputElement>("version").value.trim(),platform:field<HTMLSelectElement>("platform").value,channel:field<HTMLSelectElement>("channel").value,build:Number(field<HTMLInputElement>("build").value||0),status:field<HTMLSelectElement>("status").value,downloadUrl:uploaded.downloadUrl||field<HTMLInputElement>("downloadUrl").value.trim()||null,sha256:uploaded.sha256||field<HTMLInputElement>("sha256").value.trim().toLowerCase()||null,fileSize:uploaded.fileSize||Number(field<HTMLInputElement>("fileSize").value||0),r2Key:uploaded.key||null,releaseNotes:field<HTMLTextAreaElement>("releaseNotes").value,mandatory:field<HTMLInputElement>("mandatory").checked};
    msg("Đang lưu metadata bản phát hành…");
    await api("/api/admin/releases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    form.reset();field<HTMLInputElement>("name").value="Hendy Tools";field<HTMLInputElement>("fileSize").value="0";field<HTMLInputElement>("build").value="0";
    await refresh();msg("Đã tạo bản phát hành.","success");
  }catch(error){msg((error as Error).message,"error");}finally{if(submit)submit.disabled=false;}
});
$("#release-list").addEventListener("click",async event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");if(!button)return;
  const id=button.dataset.id||"",action=button.dataset.action||"",release=releases.find(r=>r.id===id);if(!release)return;
  if(action==="delete"&&!confirm("Xóa "+release.name+" v"+release.version+"?"))return;
  button.disabled=true;
  try{
    if(action==="delete")await api("/api/admin/releases/"+encodeURIComponent(id),{method:"DELETE"});
    else await api("/api/admin/releases/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:action==="publish"?"published":"archived"})});
    await refresh();msg(action==="delete"?"Đã xóa release.":action==="publish"?"Đã xuất bản release.":"Đã thu hồi release.","success");
  }catch(error){msg((error as Error).message,"error");}finally{button.disabled=false;}
});
setConnected(false);
if(token)void connect(token).catch(()=>{token="";sessionStorage.removeItem(TOKEN_KEY);setConnected(false);msg("Phiên trước không còn hợp lệ. Hãy đăng nhập lại.","error");});
