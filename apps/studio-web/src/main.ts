import "./style.css";

type Asset = {id:string;file:File;url:string;kind:"video"|"audio"|"image";duration:number};
type Clip = {id:string;assetId:string;name:string;track:"video"|"audio"|"subtitle";start:number;duration:number;scale:number;subtitle:string};
type ProjectManifest = {schemaVersion:"1.0";projectName:string;createdAt:string;assets:Array<{id:string;name:string;type:string;size:number;mimeType:string}>;clips:Clip[];notice:string};
const assets:Asset[]=[];
const clips:Clip[]=[];
let selectedClipId:string|null=null;
const $=<T extends HTMLElement>(s:string):T=>{const e=document.querySelector<T>(s);if(!e)throw new Error("Missing UI element: "+s);return e;};
function esc(v:unknown):string{return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));}
function formatTime(s:number):string{const ms=Math.max(0,Math.round(s*1000));const m=Math.floor(ms/60000);const sec=Math.floor(ms%60000/1000);const milli=ms%1000;return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0")+"."+String(milli).padStart(3,"0");}
function kindFor(file:File):Asset["kind"]{return file.type.startsWith("video/")?"video":file.type.startsWith("audio/")?"audio":"image";}
function message(text:string):void{$("#studio-message").textContent=text;}
function renderAssets():void{
  $("#asset-count").textContent=String(assets.length);$("#footer-media").textContent=String(assets.length);
  if(!assets.length){$("#media-list").innerHTML='<div class="empty-media">Chưa có media.<br>Thêm video, âm thanh hoặc ảnh từ thiết bị.</div>';return;}
  $("#media-list").innerHTML=assets.map(a=>'<button class="asset-item '+(clips.some(c=>c.assetId===a.id&&c.id===selectedClipId)?"selected":"")+'" data-asset-id="'+esc(a.id)+'"><span class="asset-type">'+(a.kind==="video"?"▶":a.kind==="audio"?"♫":"▧")+'</span><span class="asset-meta"><b>'+esc(a.file.name)+'</b><small>'+esc(a.kind.toUpperCase())+' · '+esc((a.file.size/1048576).toFixed(1))+' MB</small></span><span class="asset-add">＋</span></button>').join("");
}
function renderTrack(track:"video"|"audio"|"subtitle"):void{
  const box=$("#track-"+track);
  const items=clips.filter(c=>c.track===track);
  if(!items.length){box.innerHTML='<div class="track-empty">'+(track==="video"?"Import media, sau đó chọn một asset để thêm vào track.":track==="audio"?"Audio / BGM sẽ hiển thị ở track riêng.":"Phụ đề sẽ hiển thị ở đây.")+'</div>';return;}
  box.innerHTML=items.map(c=>{
    const scale=Math.max(12,Math.min(100,c.duration*3.5));
    return '<button class="clip '+track+'-clip '+(selectedClipId===c.id?"selected":"")+'" style="width:'+scale+'%;margin-left:'+Math.max(0,Math.min(70,c.start*1.15))+'%" data-clip-id="'+esc(c.id)+'"><b>'+esc(c.name)+'</b><small>'+formatTime(c.duration)+(c.subtitle?" · Vietsub":"")+'</small></button>';
  }).join("");
}
function renderTimeline():void{renderTrack("video");renderTrack("audio");renderTrack("subtitle");$("#footer-clips").textContent=String(clips.length);}
function showClip(clip:Clip|undefined):void{
  const form=$("#clip-form") as HTMLFormElement;const empty=$("#inspector-empty");
  if(!clip){selectedClipId=null;form.hidden=true;empty.hidden=false;$("#preview-video").hidden=true;$("#preview-image").hidden=true;$("#preview-title").hidden=false;$("#preview-subtitle").hidden=false;renderTimeline();renderAssets();return;}
  selectedClipId=clip.id;form.hidden=false;empty.hidden=true;
  (form.elements.namedItem("name") as HTMLInputElement).value=clip.name;
  (form.elements.namedItem("start") as HTMLInputElement).value=String(clip.start);
  (form.elements.namedItem("duration") as HTMLInputElement).value=String(clip.duration);
  (form.elements.namedItem("scale") as HTMLInputElement).value=String(clip.scale);
  (form.elements.namedItem("subtitle") as HTMLTextAreaElement).value=clip.subtitle;
  const asset=assets.find(a=>a.id===clip.assetId);
  const video=$("#preview-video") as HTMLVideoElement;const image=$("#preview-image") as HTMLImageElement;
  if(asset?.kind==="video"){video.src=asset.url;video.hidden=false;image.hidden=true;$("#preview-title").hidden=true;$("#preview-subtitle").hidden=true;}
  else if(asset?.kind==="image"){image.src=asset.url;image.hidden=false;video.hidden=true;$("#preview-title").hidden=true;$("#preview-subtitle").hidden=true;}
  else{video.hidden=true;image.hidden=true;$("#preview-title").hidden=false;$("#preview-subtitle").hidden=false;$("#preview-subtitle").textContent=clip.subtitle||"Audio clip selected.";}
  renderTimeline();renderAssets();
}
function addAsset(asset:Asset,track?: "video"|"audio"):void{
  const chosenTrack=track||(asset.kind==="audio"?"audio":"video");
  const clip:Clip={id:crypto.randomUUID(),assetId:asset.id,name:asset.file.name,track:chosenTrack,start:clips.filter(c=>c.track===chosenTrack).reduce((m,c)=>Math.max(m,c.start+c.duration),0),duration:asset.duration||5,scale:100,subtitle:""};
  clips.push(clip);showClip(clip);message("Đã thêm "+asset.file.name+" vào track "+chosenTrack.toUpperCase()+".");
}
$("#media-input").addEventListener("change",async()=>{
  const input=$("#media-input") as HTMLInputElement;
  for(const file of Array.from(input.files||[])){
    const kind=kindFor(file);const asset:Asset={id:crypto.randomUUID(),file,url:URL.createObjectURL(file),kind,duration:5};
    assets.push(asset);
    if(kind==="video"||kind==="audio") await new Promise<void>(resolve=>{
      const media=document.createElement(kind);media.preload="metadata";media.src=asset.url;
      media.onloadedmetadata=()=>{if(Number.isFinite(media.duration)&&media.duration>0)asset.duration=media.duration;resolve();};
      media.onerror=()=>resolve();
    });
  }
  renderAssets();message("Đã nạp "+input.files?.length+" asset từ thiết bị. Media không tự tải lên máy chủ.");input.value="";
});
$("#media-list").addEventListener("click",event=>{
  const b=(event.target as HTMLElement).closest<HTMLButtonElement>("[data-asset-id]");if(!b)return;
  const asset=assets.find(a=>a.id===b.dataset.assetId);if(asset)addAsset(asset);
});
$("#timeline").addEventListener("click",event=>{
  const b=(event.target as HTMLElement).closest<HTMLButtonElement>("[data-clip-id]");if(!b)return;
  showClip(clips.find(c=>c.id===b.dataset.clipId));
});
$("#clip-form").addEventListener("submit",event=>{
  event.preventDefault();const form=event.currentTarget as HTMLFormElement;const clip=clips.find(c=>c.id===selectedClipId);if(!clip)return;
  clip.name=(form.elements.namedItem("name") as HTMLInputElement).value.trim()||clip.name;
  clip.start=Math.max(0,Number((form.elements.namedItem("start") as HTMLInputElement).value)||0);
  clip.duration=Math.max(.1,Number((form.elements.namedItem("duration") as HTMLInputElement).value)||5);
  clip.scale=Math.max(10,Math.min(400,Number((form.elements.namedItem("scale") as HTMLInputElement).value)||100));
  clip.subtitle=(form.elements.namedItem("subtitle") as HTMLTextAreaElement).value;
  renderTimeline();message("Đã cập nhật metadata clip.");
});
$("#add-subtitle").addEventListener("click",()=>{
  const source=clips.find(c=>c.track==="video")||clips.find(c=>c.track==="audio");
  const clip:Clip={id:crypto.randomUUID(),assetId:source?.assetId||"",name:"Subtitle cue "+(clips.filter(c=>c.track==="subtitle").length+1),track:"subtitle",start:source?.start||0,duration:source?.duration||3,scale:100,subtitle:"Nhập nội dung Vietsub…"};
  clips.push(clip);showClip(clip);message("Đã tạo cue phụ đề. Sửa nội dung trong Inspector.");
});
$("#clear-timeline").addEventListener("click",()=>{if(!confirm("Xóa tất cả clip khỏi timeline? Media bin vẫn được giữ."))return;clips.splice(0,clips.length);showClip(undefined);message("Timeline đã được xóa.");});
$("#play-preview").addEventListener("click",()=>{
  const video=$("#preview-video") as HTMLVideoElement;
  if(!video.hidden){if(video.paused)void video.play();else video.pause();}
  else message("Chọn clip video để phát preview.");
});
$("#fit-canvas").addEventListener("click",()=>{$("#preview-frame").classList.toggle("fit");});
function manifest():ProjectManifest{return {schemaVersion:"1.0",projectName:($("#project-name").textContent||"Hendy Project").trim(),createdAt:new Date().toISOString(),assets:assets.map(a=>({id:a.id,name:a.file.name,type:a.kind,size:a.file.size,mimeType:a.file.type})),clips:clips.map(c=>({...c})),notice:"This JSON is an editable project manifest, not a rendered video file. Configure a trusted render worker to export MP4."};}
function saveManifest(download:boolean):void{
  const json=JSON.stringify(manifest(),null,2);sessionStorage.setItem("hendy-studio-project-manifest",json);
  if(download){const blob=new Blob([json],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="hendy-studio-project.json";a.click();URL.revokeObjectURL(url);message("Đã tải project manifest JSON. Đây chưa phải tệp MP4 đã render.");}
  else message("Đã lưu manifest vào session hiện tại. Dùng Xuất manifest để tải bản JSON xuống.");
}
$("#save-project").addEventListener("click",()=>saveManifest(false));
$("#export-project").addEventListener("click",()=>saveManifest(true));
renderAssets();renderTimeline();
