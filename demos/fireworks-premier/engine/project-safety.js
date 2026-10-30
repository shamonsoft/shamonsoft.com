// Project transactions, save receipts and media-complete recovery. No agreement or account state.
let projectLoading=false,projectSaving=null,recoveryInitializing=true,recoveryTimer=0,recoveryDbPromise=null,recoveryChain=Promise.resolve(),recoveryWarning=false;
const recoveryMediaKnown=new Map();
const projectSaves=new Map(),RECOVERY_DB='shamonsoft-fireworks-recovery',RECOVERY_KEY='current';
function recoveryStatus(message,failed=false){
 let label=Q('#recoveryStatus');
 if(!label){label=document.createElement('span');label.id='recoveryStatus';label.setAttribute('role','status');Q('footer').append(label)}
 label.textContent=message;label.style.color=failed?'#eeb783':'';
}
function recoveryDatabase(){
 if(!recoveryDbPromise)recoveryDbPromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open(RECOVERY_DB,1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('checkpoints'))db.createObjectStore('checkpoints');if(!db.objectStoreNames.contains('media'))db.createObjectStore('media')};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Recovery storage is unavailable'));
 });
 return recoveryDbPromise;
}
function requestResult(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=transaction.onabort=()=>reject(transaction.error||new Error('Recovery could not be saved'))})}
function trackRecord(track){return{id:track.id,name:track.name,type:track.file.type||'audio/mpeg',lastModified:track.file.lastModified||0,beats:track.beats||[],waveform:track.waveform||[],analysis:track.analysis||null,waveformVersion:track.waveformVersion||0,durationSeconds:track.durationSeconds||0,duration:track.duration||'',status:track.status||'',sampleName:track.sampleName||''}}
function queueRecovery(){
 if(recoveryInitializing||projectLoading)return;
 clearTimeout(recoveryTimer);recoveryTimer=setTimeout(flushRecovery,600);
}
function flushRecovery(discard=false){
 clearTimeout(recoveryTimer);
 if(recoveryInitializing||projectLoading)return recoveryChain;
 const files=playlist.map(track=>({...trackRecord(track),file:track.file}));
 const record={schema:1,updatedAt:Date.now(),project:JSON.parse(snapshot()),tracks:files.map(({file,...meta})=>meta),activeTrack,savedFingerprint:savedProjectFingerprint,dirty:discard?false:hasProjectChanges()};
 recoveryChain=recoveryChain.catch(()=>{}).then(async()=>{
  const db=await recoveryDatabase(),tx=db.transaction(['checkpoints','media'],'readwrite'),done=transactionDone(tx),media=tx.objectStore('media');
  for(const track of files)if(recoveryMediaKnown.get(track.id)!==track.file)media.put(track.file,track.id);
  tx.objectStore('checkpoints').put(record,RECOVERY_KEY);
  await done;for(const track of files)recoveryMediaKnown.set(track.id,track.file);recoveryWarning=false;recoveryStatus(record.dirty?'Recovery saved':'All changes saved');
 }).catch(error=>{recoveryStatus('Recovery unavailable — save your project',true);if(!recoveryWarning){toast('Automatic recovery could not be saved. Please save your project.');recoveryWarning=true}});
 return recoveryChain;
}
async function readRecovery(){
 const db=await recoveryDatabase(),tx=db.transaction(['checkpoints','media'],'readonly');
 const record=await requestResult(tx.objectStore('checkpoints').get(RECOVERY_KEY));
 if(!record)return null;
 // Use a new transaction after the first asynchronous request; completed transactions cannot accept new requests.
 const mediaTx=db.transaction('media','readonly');
 const files=await Promise.all((record.tracks||[]).map(track=>requestResult(mediaTx.objectStore('media').get(track.id))));
 record.tracks=(record.tracks||[]).map((track,i)=>({...track,file:files[i]}));
 return record;
}
function validateProject(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('This file is not a fireworks project.');
 if(input.version!=null&&![1,2].includes(+input.version))throw new Error('This project uses an unsupported format version.');
 if(!input.show||typeof input.show!=='object'||!Number.isFinite(+input.show.duration)||+input.show.duration<=0)throw new Error('The project has an invalid show duration.');
 if(!Array.isArray(input.shells)||!Array.isArray(input.events)||(input.markers!=null&&!Array.isArray(input.markers)))throw new Error('The project has invalid shell or timeline data.');
 const project=structuredClone(input);delete project.embeddedMusic;delete project.activeTrack;
 project.shells=project.shells.map(shell=>window.ShellDesign.validateShell(shell));
 const ids=new Set();
 for(const shell of project.shells){if(typeof shell.id!=='string'||!shell.id||ids.has(shell.id))throw new Error('The project has invalid or duplicate shell identifiers.');ids.add(shell.id)}
 for(const event of project.events){
  if(!event||typeof event!=='object'||!ids.has(event.shellId)||!Number.isFinite(+event.time)||+event.time<0||(+event.count||1)>10000)throw new Error('The project has an invalid timeline cue.');
 }
 for(const marker of project.markers||[])if(!marker||typeof marker.id!=='string'||!Number.isFinite(+marker.time)||+marker.time<0)throw new Error('The project has an invalid marker.');
 project.userShells=(project.userShells||[]).map(shell=>window.ShellDesign.validateShell(shell));
 project.audio={...freshState().audio,...project.audio};project.show={...freshState().show,...project.show};
 project.audio.volume=clamp(+project.audio.volume||0,0,1);project.currentTime=0;project.playing=false;
 return project;
}
async function prepareProjectTracks(tracks,fromRecovery=false){
 if(!Array.isArray(tracks))throw new Error('The project music list is invalid.');
 const prepared=[];
 for(const item of tracks){
  try{
   if(!item||typeof item.name!=='string')throw new Error('Invalid music entry');
   let file;
   if(fromRecovery){if(!(item.file instanceof Blob))throw new Error('The audio file is missing from recovery storage');file=new File([item.file],item.name,{type:item.type||item.file.type,lastModified:item.lastModified||0})}
   else{
    if(typeof item.data!=='string'||!/^data:[^,]*;base64,/i.test(item.data))throw new Error('The embedded audio is missing or invalid');
    const response=await fetch(item.data);if(!response.ok)throw new Error('The embedded audio could not be read');
    const blob=await response.blob();file=new File([blob],item.name,{type:item.type||blob.type,lastModified:item.lastModified||0});
   }
   if(!file.size)throw new Error('The audio file is empty');
   prepared.push({...item,id:item.id||uid(),file,url:null});
  }catch(error){throw new Error('Music "'+(item?.name||'unnamed track')+'" could not be restored. The current show was kept. Repair or re-import this music and save the project again.')}
 }
 return prepared;
}
function projectDecision(message){
 let dialog=Q('#projectDecisionDialog');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='projectDecisionDialog';dialog.innerHTML='<div class="dialog-head"><h2>Unsaved project</h2></div><p class="project-decision-text"></p><div class="dialog-actions"><button data-project-decision="cancel">CANCEL</button><button data-project-decision="discard">DISCARD CHANGES</button><button class="primary" data-project-decision="save">SAVE FIRST</button></div>';document.body.append(dialog)}
 dialog.querySelector('p').textContent=message;
 return new Promise(resolve=>{
  const finish=value=>{dialog.removeEventListener('click',click);dialog.removeEventListener('cancel',cancel);dialog.close();resolve(value)};
  const click=e=>{const value=e.target.closest('[data-project-decision]')?.dataset.projectDecision;if(value)finish(value)};
  const cancel=e=>{e.preventDefault();finish('cancel')};
  dialog.addEventListener('click',click);dialog.addEventListener('cancel',cancel);dialog.showModal();
 });
}
async function mayReplaceProject(){
 if(projectSaving&&!await projectSaving)return false;
 if(!hasProjectChanges())return true;
 const decision=await projectDecision('Save the current show before opening another project?');
 if(decision==='cancel')return false;
 if(decision==='discard')return true;
 if(!await saveProject())return false;
 if(hasProjectChanges()){toast('Newer edits are still unsaved. Opening was cancelled; save those edits first.');return false}
 return true;
}
async function packagedSnapshot(){
 const project=JSON.parse(snapshot()),tracks=playlist.map(track=>({...trackRecord(track),file:track.file})),selected=activeTrack;
 if(project.show.customBackground&&project.show.background==='custom'){
  const response=await fetch(project.show.customBackground);if(!response.ok)throw new Error('The scene media could not be packaged');
  project.show.customBackground=await fileDataUrl(await response.blob());
  if(project.show.customBackgroundThumbnail){const thumb=await fetch(project.show.customBackgroundThumbnail);if(!thumb.ok)throw new Error('The scene thumbnail could not be packaged');project.show.customBackgroundThumbnail=await fileDataUrl(await thumb.blob())}
 }
 project.embeddedMusic=await Promise.all(tracks.map(async({file,...track})=>({...track,data:await fileDataUrl(file)})));
 project.activeTrack=selected;
 return JSON.stringify(project);
}
async function saveProject(closeAfter=false,saveAs=false){
 if(projectSaving)return projectSaving;
 const task=(async()=>{
  const fingerprint=projectFingerprint(),id=uid();
  try{
   status(playlist.length?'PACKAGING PROJECT + MUSIC':'PACKAGING PROJECT');
   const json=await packagedSnapshot();
   return await new Promise(resolve=>{projectSaves.set(id,{fingerprint,resolve});post(closeAfter?'save-project-close':'save-project',{id,json,saveAs})});
  }catch(error){toast('Project could not be saved: '+(error.message||'Media packaging failed'));return false}
 })();
 projectSaving=task;try{return await task}finally{projectSaving=null}
}
function finishProjectSave(value,success=true){
 const pending=projectSaves.get(value?.id);
 if(!pending)return;
 projectSaves.delete(value.id);
 if(success){markProjectClean(pending.fingerprint);toast(value.name||'Project saved')}
 pending.resolve(success);
}
function failProjectSaves(message){for(const pending of projectSaves.values())pending.resolve(false);projectSaves.clear()}
async function loadProjectTransaction(json,options={}){
 if(projectLoading||projectSaving||exporting){toast('Finish the current save, load or export before opening a project.');return false}
 projectLoading=true;
 const created=[];
 let previous=null;
 try{
  const input=typeof json==='string'?JSON.parse(json):json,project=validateProject(input);
  const tracks=await prepareProjectTracks(options.recovery?.tracks||input.embeddedMusic||[],!!options.recovery);
  const selected=options.recovery?.activeTrack??input.activeTrack;
  if(selected!=null&&(!Number.isInteger(+selected)||+selected< -1||+selected>=tracks.length))throw new Error('The selected music track is missing or invalid.');
  if(selected!=null&&+selected>=0){try{await analyzePlaylistTrack(tracks[+selected])}catch{throw new Error('The selected music could not be decoded. The current show was kept. Repair or re-import this track and save again.')}}
  if(!tracks.length&&project.audio.name){
   if(!confirm('This older project did not include its music file. Open it without music and re-import the track? Cancel keeps the current show.'))return false;
   project.audio={...project.audio,name:'',beats:[],waveform:[],analysis:null};
  }
  if(!options.recovery&&!await mayReplaceProject())return false;
  for(const track of tracks){track.url=URL.createObjectURL(track.file);created.push(track.url)}
  previous={project:state,playlist,activeTrack,loadedTrack,audioUrl,undoStack,redoStack,savedProjectFingerprint,projectDirty,time:audioEl.currentTime,playing:state.playing};
  audioEl.pause();audioEl.removeAttribute('src');audioEl.load();loadedTrack=-1;audioUrl=null;
  loadState(project,false);playlist=tracks;activeTrack=selected==null?-1:+selected;
  timelineViewSeconds=state.show.duration;timelineFitted=false;Q('#timelineScroll').scrollLeft=0;
  const active=playlist[activeTrack];state.audio.name=active?.name||'';state.audio.beats=active?.beats||[];state.audio.waveform=active?.waveform||[];state.audio.analysis=active?.analysis||null;
  undoStack=[];redoStack=[];renderPlaylist();renderTimeline();
  markProjectClean(options.recovery?.savedFingerprint??projectFingerprint());
  for(const track of previous.playlist)URL.revokeObjectURL(track.url);
  toast(options.recovery?'Autosaved show restored':tracks.length?'Project loaded with '+tracks.length+' music track'+(tracks.length===1?'':'s'):'Project loaded');
  return true;
 }catch(error){
  for(const url of created)URL.revokeObjectURL(url);
  if(previous){
   state=previous.project;playlist=previous.playlist;activeTrack=previous.activeTrack;loadedTrack=-1;audioUrl=null;
   undoStack=previous.undoStack;redoStack=previous.redoStack;savedProjectFingerprint=previous.savedProjectFingerprint;projectDirty=previous.projectDirty;
   try{loadState(state,false);renderPlaylist();if(previous.loadedTrack>=0){loadPlaylistAudio(previous.loadedTrack);audioEl.currentTime=previous.time||0;if(previous.playing)audioEl.play().catch(()=>{})}}catch{}
  }
  toast('Project was not opened. '+(error?.message||'Invalid project data'));return false;
 }finally{projectLoading=false;queueRecovery()}
}
async function receiveProjectOpen(value){const success=await loadProjectTransaction(value.json);post('project-load-result',{id:value.id,success})}
window.__studioCloseSession=async discard=>{const fingerprint=projectFingerprint();await flushRecovery(discard);post('close-ready',{unchanged:projectFingerprint()===fingerprint})};
async function initializeRecovery(){recoveryStatus('Demo ready');recoveryInitializing=false}
