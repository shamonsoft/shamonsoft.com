/* Fireworks Premier browser host. No account API, server upload or native Windows bridge. */
(()=>{'use strict';
 const listeners=new Set(),MAX=512*1024*1024,base=new URL('./',document.currentScript.src);
 const dbReady=new Promise((resolve,reject)=>{const q=indexedDB.open('ShamonSoft.FireworksPremier.Demo',1);q.onupgradeneeded=()=>{for(const n of ['state','projects','scenes','chunks'])q.result.createObjectStore(n)};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 async function store(name,mode,job){const db=await dbReady;return new Promise((resolve,reject)=>{const tx=db.transaction(name,mode);let value;const q=job(tx.objectStore(name));if(q)q.onsuccess=()=>value=q.result;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Browser storage is unavailable. Save a project download.'))})}
 const get=(n,k)=>store(n,'readonly',o=>o.get(k)),put=(n,k,v)=>store(n,'readwrite',o=>o.put(v,k)),del=(n,k)=>store(n,'readwrite',o=>o.delete(k)),all=n=>store(n,'readonly',o=>o.getAll());
 const emit=data=>{for(const listener of listeners)listener({data})};
 const native=(type,value)=>window.__studioNativeEvent?.(type,value);
 const clean=name=>String(name||'Fireworks Show').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,120);
 async function download(blob,name){if(blob.size>MAX)throw Error('Download exceeds the 512 MB browser working limit. Recording retained.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=clean(name);a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
 let currentProject=null,recording=null,wake=null,converting=false,queue=Promise.resolve();
 async function savedShows(){window.__studioSavedShows?.((await all('projects')).map(p=>({name:p.name,path:p.id,modified:new Date(p.updated).toLocaleString(),detail:'Saved in this browser · media included'})))}
 async function releaseWake(){try{await wake?.release()}catch{}wake=null}
 async function scenes(){emit({type:'custom-scenes',items:await all('scenes')})}
 async function finishCapture(){
  if(converting)throw Error('Wait for conversion to finish.');
  const rec=recording||await get('state','capture');if(!rec||!rec.count)throw Error('No captured recording is available.');
  converting=true;
  try{const parts=[];for(let i=0;i<rec.count;i++){const b=await get('chunks',rec.id+':'+i);if(!b)throw Error('Retained recording is incomplete. Start a new recording.');parts.push(b)}
   const format=rec.options.format==='webm'?'webm-vp8':rec.options.format;
   if(!['webm-vp8','gif','png-sequence'].includes(format))throw Error('This export format is not available.');
   const options={format,durationSeconds:Math.min(30,Math.max(1,Number(rec.options.durationSeconds)||30)),resolution:{width:rec.options.width,height:rec.options.height},fps:rec.options.fps};
   const result=await FWBrowserExport.convert(new Blob(parts,{type:'video/webm'}),options,options.durationSeconds);
   const ext={"webm-vp8":'webm',gif:'gif','png-sequence':'zip'}[format];await download(result,rec.options.filename+'.'+ext);
   rec.downloadRequestedAt=Date.now();await put('state','capture',rec);native('export-complete','Download requested · recording retained for retry');
  }finally{converting=false;await releaseWake()}
 }
 async function handle(type,payload){
  switch(type){
   case 'request-sample-music':emit({type:'sample-music-list',files:['45th Street.mp3','Alien Pulse.mp3','Celtic Knot.mp3','Harbor Nights.mp3','Soft Breathing Sky.mp3']});return;
   case 'request-saved-shows':await savedShows();return;
   case 'save-project':case 'save-project-close':{
    if(!payload||typeof payload.json!=='string')throw Error('The project could not be packaged.');
    if(payload.json.length>128*1024*1024)throw Error('This browser project exceeds 128 MB. Reduce imported media before saving.');
    const parsed=JSON.parse(payload.json),id=payload.saveAs||!currentProject?crypto.randomUUID():currentProject;
    const name=clean(parsed.name||'Fireworks Show');await put('projects',id,{id,name,json:payload.json,updated:Date.now()});currentProject=id;
    await download(new Blob([payload.json],{type:'application/json'}),name+'.sfsproject');native('project-saved',{id:payload.id,name:'Saved in browser; project download requested'});await savedShows();return;
   }
   case 'open-project':{
    const input=document.createElement('input');input.type='file';input.accept='.sfsproject,.json';
    input.onchange=async()=>{try{const f=input.files?.[0];if(!f)return;if(f.size>128*1024*1024)throw Error('Project exceeds the 128 MB browser limit.');if(await window.__studioLoadProject(await f.text()))currentProject=null}catch(e){native('native-error',e.message)}};input.click();return;
   }
   case 'open-saved-show':{const item=await get('projects',payload);if(!item)throw Error('This saved show is no longer available.');if(await window.__studioLoadProject(item.json))currentProject=item.id;return;}
   case 'project-reset':currentProject=null;return;
   case 'export-request':{
    if(converting)throw Error('An export is still converting.');
    if(!['webm','gif','png-sequence'].includes(payload.format))throw Error('Choose WebM, GIF or PNG sequence.');
    const options={...payload,durationSeconds:Math.min(30,Math.max(1,Number(payload.durationSeconds)||30))};
    if(!Number.isFinite(options.width)||!Number.isFinite(options.height)||options.width<64||options.height<64||options.width>7680||options.height>7680)throw Error('Invalid output dimensions.');
    const previous=await get('state','capture');if(previous?.count&&!previous.downloadRequestedAt&&!confirm('Start a new export? This replaces the previous recoverable recording. Cancel to retry its download first.')){native('export-ready','cancel');return}if(previous?.id)await store('chunks','readwrite',o=>{for(let i=0;i<previous.count;i++)o.delete(previous.id+':'+i)});recording={id:crypto.randomUUID(),options,count:0,total:0,completed:false};await put('state','capture',recording);
    try{wake=await navigator.wakeLock?.request('screen')}catch{}native('export-ready','go');return;
   }
   case 'capture-start':return;
   case 'capture-chunk':{
    if(!recording)throw Error('Recording session is missing.');
    const bytes=Uint8Array.from(atob(payload.data),c=>c.charCodeAt(0));recording.total+=bytes.length;
    if(recording.total>MAX)throw Error('Recording exceeded 512 MB. Reduce resolution or frame rate.');
    await put('chunks',recording.id+':'+recording.count++,new Blob([bytes],{type:'video/webm'}));await put('state','capture',recording);return;
   }
   case 'capture-finish':recording.completed=true;await put('state','capture',recording);await finishCapture();return;
   case 'capture-abort':await releaseWake();return;
   case 'retry-export':if(window.__fwBrowserBusy?.())throw Error('Stop or finish the current recording first.');await finishCapture();return;
   case 'save-still':{const response=await fetch(payload.data);await download(await response.blob(),payload.filename);native('still-saved','Image download requested');return;}
   case 'request-custom-scenes':await scenes();return;
   case 'save-custom-scene':{
    if(typeof payload.data!=='string'||!/^data:(image|video)\//.test(payload.data)||payload.data.length>64*1024*1024)throw Error('Scene media is invalid or exceeds the 64 MB browser limit.');
    const item={id:crypto.randomUUID(),name:clean(payload.name),kind:payload.kind,mime:payload.mime,url:payload.data,thumbnail:payload.thumbnail};await put('scenes',item.id,item);emit({type:'custom-scene-saved',item});return;
   }
   case 'delete-custom-scene':await del('scenes',payload);emit({type:'custom-scene-deleted',id:payload});return;
   case 'support-clients':emit({type:'support-clients',clients:[]});return;
   case 'support-copy-address':await navigator.clipboard.writeText('support@shamonsoft.com');emit({type:'support-result',message:'Address copied'});return;
   case 'support-open-mail':location.href='mailto:support@shamonsoft.com';return;
   case 'export-licenses':window.open(new URL('THIRD-PARTY-NOTICES.txt',base),'_blank','noopener');return;
   case 'export-sources':await download(await(await fetch(new URL('browser-adapter-source.zip',base))).blob(),'Fireworks-Premier-browser-source.zip');return;
   case 'fullscreen':if(payload){try{await document.documentElement.requestFullscreen()}catch{}}else if(document.fullscreenElement)await document.exitFullscreen();return;
   case 'project-dirty':case 'project-load-result':case 'close-ready':case 'system-load-start':return;
   default:throw Error('Unsupported browser action: '+type);
  }
 }
 window.__fwBrowserHost={captureChunk:data=>{const result=queue.catch(()=>{}).then(()=>handle('capture-chunk',{data}));queue=result.catch(()=>{});return result},addEventListener:(name,fn)=>{if(name==='message')listeners.add(fn)},postMessage:message=>{
  const run=async()=>{try{await handle(message.type,message.payload)}catch(e){await releaseWake();if(message.type==='save-custom-scene')emit({type:'custom-scene-error',message:e.message});else native('native-error',e.message||String(e))}};
  queue=queue.catch(()=>{}).then(run);
 }};
 document.addEventListener('DOMContentLoaded',()=>{document.querySelector('#retryBrowserExport').onclick=()=>window.__fwBrowserHost.postMessage({type:'retry-export'})});
 window.addEventListener('beforeunload',event=>{if(!window.__fwCloseAllowed&&(window.__fwBrowserDirty?.()||window.__fwBrowserBusy?.()||converting)){event.preventDefault();event.returnValue=''}});
})();
