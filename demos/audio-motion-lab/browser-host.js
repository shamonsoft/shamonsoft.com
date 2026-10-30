/* Audio Motion Lab browser adapter. All project/media data stays in this browser.
   Original desktop rendering/control files are preserved in the engine folder. */
(() => {
 'use strict';
 const base=new URL('./',document.currentScript.src), listeners=new Set(),uploads=new Map(),urls=new Map();
 const dbReady=new Promise((resolve,reject)=>{const q=indexedDB.open('ShamonSoft.AudioMotionLab.Demo',1);q.onupgradeneeded=()=>{for(const name of ['state','media','recordings','chunks'])q.result.createObjectStore(name)};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 async function store(name,mode,job){const db=await dbReady;return new Promise((resolve,reject)=>{const tx=db.transaction(name,mode);let result;try{const q=job(tx.objectStore(name));if(q)q.onsuccess=()=>result=q.result}catch(e){tx.abort();reject(e);return}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('Browser storage failed'));tx.onabort=()=>reject(tx.error||Error('Browser storage cancelled'))})}
 const get=(s,k)=>store(s,'readonly',o=>o.get(k)),put=(s,k,v)=>store(s,'readwrite',o=>o.put(v,k));
 const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const hash=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const clean=name=>String(name||'Untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,160);
 let projectHandle=null,projectName='Untitled.amllab',candidate=null,wake=null,conversion=null,closeAllowed=false;
 const emit=data=>{for(const f of listeners)f({data})};
 async function describe(m){if(!m)throw Error('Project media is missing from this browser. Re-import the original file.');return{id:m.Id,name:m.Name,type:m.Type,size:m.Size,hash:m.Hash,url:URL.createObjectURL(m.blob)}}
 async function addMedia(blob,name,type){const id=await hash(blob);let ext=(/\.[a-zA-Z0-9]{1,12}$/.exec(name)||['.bin'])[0].toLowerCase();const m={Id:id,Hash:id,Name:clean(name),Type:type||blob.type||'application/octet-stream',Size:blob.size,Extension:ext,blob};await put('media',id,m);return describe(m)}
 function required(state){return [...new Set([...(state.music?.tracks||[]).map(t=>t.mediaId),state.background?.mediaId].filter(Boolean))]}
 async function manifest(state){const media=[];for(const id of required(state)){if(!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid media identifier');const m=await get('media',id);if(!m)throw Error('Project media is unavailable');const {blob,...meta}=m;media.push(meta)}return{...state,media}}
 async function resolveProject(state){return{state,media:await Promise.all(required(state).map(async id=>describe(await get('media',id))))}}
 // HTML file inputs are opened from a synchronous user gesture by the adapter.
 async function openFile(){return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='.amllab,.json';input.hidden=true;document.body.append(input);input.onchange=()=>{const f=input.files[0];input.remove();resolve(f||null)};input.oncancel=()=>{input.remove();resolve(null)};input.click()})}
 async function readProject(file){if(file.size>1024*1024*1024)throw Error('Project exceeds this browser demo’s 1 GB import safety limit');if(file.name.endsWith('.json'))return JSON.parse(await file.text());const z=await JSZip.loadAsync(file,{checkCRC32:true});if(Object.keys(z.files).length>2049)throw Error('Project has too many media entries');const entry=z.file('project.json');if(!entry)throw Error('This is not an Audio Motion Lab project');const text=await entry.async('string');if(text.length>64*1024*1024)throw Error('Project manifest is too large');const state=JSON.parse(text);for(const m of state.media||[]){if(!/^[a-f0-9]{64}$/.test(m.Id)||!/^\.[a-z0-9]{1,12}$/.test(m.Extension))throw Error('Invalid project media entry');const f=z.file('media/'+m.Id+m.Extension);if(!f)throw Error('Project media missing: '+m.Name);const blob=new Blob([await f.async('uint8array')],{type:m.Type});if(blob.size!==m.Size||await hash(blob)!==m.Hash||m.Id!==m.Hash)throw Error('Project media integrity check failed: '+m.Name);await put('media',m.Id,{...m,blob})}return state}
 async function project(action,p){switch(action){
 case 'ready':return true;
 case 'media-begin':{const token=crypto.randomUUID();if(!Number.isSafeInteger(p.size)||p.size<0||p.size>1024**3)throw Error('Media size exceeds this browser’s import limit');uploads.set(token,{...p,parts:[],received:0});return{token}}
 case 'media-chunk':{const u=uploads.get(p.token);if(!u)throw Error('Media import expired');const bytes=decode(p.data);if(u.received+bytes.length>u.size)throw Error('Unexpected media length');u.parts.push(bytes);u.received+=bytes.length;return true}
 case 'media-finish':{const u=uploads.get(p.token);if(!u||u.received!==u.size)throw Error('Media import is incomplete');const result=await addMedia(new Blob(u.parts,{type:u.type}),u.name,u.type);uploads.delete(p.token);return result}
 case 'media-abort':uploads.delete(p.token);return true;
 case 'media-sample':{const url=new URL(p.url,location.href),prefix=new URL('engine/Synesthia/Sample Music/',base);if(url.origin!==prefix.origin||!url.href.startsWith(prefix.href)||!url.pathname.endsWith('.mp3'))throw Error('Sample URL is outside the demo');const response=await fetch(url);if(!response.ok)throw Error('Sample audio could not be loaded');const blob=await response.blob();return addMedia(blob,decodeURIComponent(url.pathname.split('/').pop()),'audio/mpeg')}
 case 'recovery-save':{const state=await manifest(p.state);await put('state','recovery',{project:state,baseline:p.baseline,dirty:!!p.dirty,updated:Date.now()});return true}
 case 'recovery-get':{const record=await get('state','recovery');return record?{record,resolved:await resolveProject(record.project)}:null}
 case 'save':{const state=await manifest(p.state);if(p.saveAs){const chosen=prompt('Save in this browser as:',projectName);if(chosen===null||!chosen.trim())return{cancelled:true};projectName=clean(chosen)}await put('state','saved-project',{name:projectName,state,updated:Date.now()});return{name:projectName+' (saved in this browser)'}}
 case 'open':{const saved=await get('state','saved-project');if(saved&&confirm('Open the project saved in this browser? Cancel to import a project file.')){candidate={token:crypto.randomUUID(),name:saved.name};return{token:candidate.token,project:await resolveProject(saved.state)}}const file=await openFile();if(!file)return{cancelled:true};const state=await readProject(file);candidate={token:crypto.randomUUID(),name:file.name};return{token:candidate.token,project:await resolveProject(state)}}
 case 'commit-open':if(p.success&&candidate?.token===p.token){projectName=candidate.name;projectHandle=null}candidate=null;return true;
 case 'new':projectName='Untitled.amllab';projectHandle=null;return true;
 case 'close-ready':closeAllowed=true;window.parent.postMessage({type:'aml-demo-close'},location.origin);return true;
 case 'reset-window':window.__shamonsoftPanelBrowser?.reset?.();window.parent.postMessage({type:'aml-demo-size'},location.origin);return true;
 default:throw Error('Unsupported project action: '+action);
 }}
 async function exportRequest(){throw Error('Exports are available in the paid Windows app.')}
 let projectQueue=Promise.resolve(),exportQueue=Promise.resolve();
 const host={addEventListener:(type,f)=>{if(type==='message')listeners.add(f)},postMessage(message){
  if(message.type==='aml-project-request'){const run=async()=>{try{window.__amlProjectReply(message.id,{ok:true,result:await project(message.action,message.payload||{})})}catch(e){window.__amlProjectReply(message.id,{ok:false,error:e.message||String(e)})}};projectQueue=projectQueue.catch(()=>{}).then(run)}
  else if(message.type==='aml-export-request'){const run=async()=>{try{window.__amlReply(message.id,{ok:true,result:await exportRequest(message.action,message.payload||{})})}catch(e){window.__amlReply(message.id,{ok:false,error:e.message||String(e)})}};if(message.action==='cancel')run();else exportQueue=exportQueue.catch(()=>{}).then(run)}
  else if(message.type==='aml-help'){const a=message.action;if(a==='support-clients')emit({type:'support-clients',clients:[]});else if(a==='support-copy-address')navigator.clipboard.writeText('support@shamonsoft.com').then(()=>emit({type:'support-result',message:'Support address copied'})).catch(()=>emit({type:'support-result',message:'Copy support@shamonsoft.com from the address field'}));else if(a==='support-open-mail')location.href='mailto:support@shamonsoft.com';else if(a==='export-licenses')window.open(new URL('THIRD-PARTY-NOTICES.txt',base),'_blank','noopener');else if(a==='export-sources')window.open(new URL('browser-adapter-source.zip',base),'_blank','noopener')}
 }};
 window.__amlBrowserHost=host;window.__amlAppVersion='6.7 Browser Demo';
 window.addEventListener('beforeunload',e=>{if(!closeAllowed&&(window.__amlProject?.dirty?.()||window.__amlExport?.busy?.())){e.preventDefault();e.returnValue=''}});
 window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='aml-demo-request-close')window.__amlProject?.requestClose()});
 window.AMLBrowserStorage={get,put,hash,readProject,resolveProject};
})();
