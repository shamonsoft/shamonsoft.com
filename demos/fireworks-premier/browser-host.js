/* Fireworks Premier browser host. No account API, server upload or native Windows bridge. */
(()=>{'use strict';
 const listeners=new Set(),MAX=512*1024*1024,base=new URL('./',document.currentScript.src);
 const dbReady=new Promise((resolve,reject)=>{const q=indexedDB.open('ShamonSoft.FireworksPremier.Demo',1);q.onupgradeneeded=()=>{for(const n of ['state','projects','scenes','chunks'])q.result.createObjectStore(n)};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 async function store(name,mode,job){const db=await dbReady;return new Promise((resolve,reject)=>{const tx=db.transaction(name,mode);let value;const q=job(tx.objectStore(name));if(q)q.onsuccess=()=>value=q.result;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Browser storage is unavailable. Browser saves require local storage.'))})}
 const get=(n,k)=>store(n,'readonly',o=>o.get(k)),put=(n,k,v)=>store(n,'readwrite',o=>o.put(v,k)),del=(n,k)=>store(n,'readwrite',o=>o.delete(k)),all=n=>store(n,'readonly',o=>o.getAll());
 const emit=data=>{for(const listener of listeners)listener({data})};
 const native=(type,value)=>window.__studioNativeEvent?.(type,value);
 const clean=name=>String(name||'Fireworks Show').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,120);
 let currentProject=null,recording=null,wake=null,converting=false,queue=Promise.resolve();
 async function savedShows(){window.__studioSavedShows?.((await all('projects')).map(p=>({name:p.name,path:p.id,modified:new Date(p.updated).toLocaleString(),detail:'Saved in this browser · media included'})))}
 async function releaseWake(){try{await wake?.release()}catch{}wake=null}
 async function scenes(){emit({type:'custom-scenes',items:await all('scenes')})}
 async function handle(type,payload){
  switch(type){
   case 'request-sample-music':emit({type:'sample-music-list',files:['45th Street.mp3','Alien Pulse.mp3','Celtic Knot.mp3','Harbor Nights.mp3','Soft Breathing Sky.mp3']});return;
   case 'request-saved-shows':await savedShows();return;
   case 'save-project':case 'save-project-close':{
    if(!payload||typeof payload.json!=='string')throw Error('The project could not be packaged.');
    if(payload.json.length>128*1024*1024)throw Error('This browser project exceeds 128 MB. Reduce imported media before saving.');
    const parsed=JSON.parse(payload.json),id=payload.saveAs||!currentProject?crypto.randomUUID():currentProject;
    const name=clean(parsed.name||'Fireworks Show');await put('projects',id,{id,name,json:payload.json,updated:Date.now()});currentProject=id;
    native('project-saved',{id:payload.id,name:'Saved in this browser'});await savedShows();return;
   }
   case 'open-project':{
    const input=document.createElement('input');input.type='file';input.accept='.sfsproject,.json';
    input.onchange=async()=>{try{const f=input.files?.[0];if(!f)return;if(f.size>128*1024*1024)throw Error('Project exceeds the 128 MB browser limit.');if(await window.__studioLoadProject(await f.text()))currentProject=null}catch(e){native('native-error',e.message)}};input.click();return;
   }
   case 'open-saved-show':{const item=await get('projects',payload);if(!item)throw Error('This saved show is no longer available.');if(await window.__studioLoadProject(item.json))currentProject=item.id;return;}
   case 'project-reset':currentProject=null;return;
   case 'export-request':case 'capture-start':case 'capture-chunk':case 'capture-finish':case 'capture-abort':case 'retry-export':case 'save-still':throw Error('Feature locked in demo');
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
   case 'export-sources':window.open(new URL('browser-adapter-source.zip',base),'_blank','noopener');return;
   case 'fullscreen':if(payload){try{await document.documentElement.requestFullscreen()}catch{}}else if(document.fullscreenElement)await document.exitFullscreen();return;
   case 'project-dirty':case 'project-load-result':case 'close-ready':case 'system-load-start':return;
   default:throw Error('Unsupported browser action: '+type);
  }
 }
 window.__fwBrowserHost={captureChunk:data=>{const result=queue.catch(()=>{}).then(()=>handle('capture-chunk',{data}));queue=result.catch(()=>{});return result},addEventListener:(name,fn)=>{if(name==='message')listeners.add(fn)},postMessage:message=>{
  const run=async()=>{try{await handle(message.type,message.payload)}catch(e){await releaseWake();if(message.type==='save-custom-scene')emit({type:'custom-scene-error',message:e.message});else native('native-error',e.message||String(e))}};
  queue=queue.catch(()=>{}).then(run);
 }};
 document.addEventListener('DOMContentLoaded',()=>{if(document.querySelector('#retryBrowserExport'))document.querySelector('#retryBrowserExport').onclick=()=>window.__fwBrowserHost.postMessage({type:'retry-export'})});
})();
