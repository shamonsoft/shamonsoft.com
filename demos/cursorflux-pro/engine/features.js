/* Named material recipes, set readiness, real Windows-pointer test area and local help. */
function adoptHostState(result){
  if(result.windows)windowsState=result.windows;
  if(typeof result.effectsActive==='boolean')effectsRunning=result.effectsActive;
  else if(typeof result.active==='boolean')effectsRunning=result.active;
  const toggle=$('effectsToggle');if(toggle)toggle.checked=effectsRunning;
}
function chooseSkin(id){
  const selected=materials.find(m=>m.Id===id);if(!selected?.Settings){setStatus('This skin has no material settings.',true);return}
  edit(()=>{
    project.Skin=clone(selected.Settings);
    if(selected.Color)project.Color=clone(selected.Color);
    else{project.Color.Primary=project.Skin.Primary;project.Color.Secondary=project.Skin.Secondary}
    if(selected.Rendering)project.Rendering=clone(selected.Rendering);
  });
  renderSettings();updateSkinStudioPreview();setStatus('Previewing '+selected.Id+'. Use in Windows applies the whole cursor set.');
}
const featureFocus=new Map();
function openFeature(id){
  featureFocus.set(id,document.activeElement);$(id).hidden=false;
  $(id).querySelector('button,input,select')?.focus();
}
function closeFeature(id){$(id).hidden=true;featureFocus.get(id)?.focus();if(id==='readinessOverlay'){readinessTicket++;readinessBusy=false;$('readinessCheckAgain').disabled=false}}
function featureDialog(id,title,body,footer='',large=false){
  const overlay=document.createElement('div');overlay.id=id;overlay.className='cf-overlay';overlay.hidden=true;
  overlay.innerHTML='<section class="cf-dialog '+(large?'large':'')+'" role="dialog" aria-modal="true" aria-labelledby="'+id+'Title"><header class="cf-head"><h2 id="'+id+'Title">'+title+'</h2><button data-cf-close="'+id+'" aria-label="Close '+title+'">Close</button></header>'+body+(footer?'<footer class="cf-foot">'+footer+'</footer>':'')+'</section>';
  document.body.appendChild(overlay);overlay.querySelector('[data-cf-close]').onclick=()=>closeFeature(id);
  overlay.onclick=e=>{if(e.target===overlay)closeFeature(id)};
}
function updateFeatureState(){
  if($('restorePrevious'))$('restorePrevious').disabled=commandBusy||!windowsState.CanRestorePrevious;
  if($('updateSkin'))$('updateSkin').disabled=commandBusy||!materials.some(m=>m.Group==='Custom'&&m.Id===project?.Skin.Material);
  if(!$('readinessOverlay')?.hidden&&readinessRevision!==revision&&!readinessBusy)$('readinessSummary').textContent='Settings changed. Choose Check again to refresh this list.';
}
const HELP_TOPICS=[
  {id:'start',title:'Getting started',body:'<p>A cursor set contains <strong>17 Windows roles</strong>, such as Normal, Text, Link and Busy. A theme supplies their shapes; a skin supplies their material and color.</p><ol><li>Choose a design theme on the left.</li><li>Select a skin in the middle library.</li><li>Choose a size and adjust Color, 3D Surface, Lighting or Texture on the right.</li><li>Use <strong>Check set</strong> to inspect all roles.</li><li>Save your project. Choose <strong>Use in Windows</strong> when you want to install the set.</li></ol><p>Preview edits do not replace Windows cursors. Desktop effects are separate and run only while the app is running.</p>',action:'check',label:'Open set checklist'},
  {id:'themes',title:'Themes and the 17 cursor roles',body:'<p>Choose a built-in theme or one of My themes from the left dropdown. Each role has its own thumbnail and pencil button. Select the thumbnail to preview that role, or the pencil to edit it in Cursor Lab.</p><p>Built-in themes are protected. Saving edits creates a named custom theme. Starting from a built-in theme copies unchanged roles; starting with Blank canvas leaves them empty until you design them.</p><p>The role count beside a custom theme indicates saved geometry. The <strong>Check set</strong> list also checks click points, visible output and custom animation safety.</p>'},
  {id:'skins',title:'Skins and materials',body:'<p>A skin changes the current theme’s surface without changing its shapes. Use the library filters or search to find glass, metals, ceramics, minerals, wood, luminous and technical finishes. <strong>Custom</strong> contains your named skins and automatically saved edited recipes.</p><p>Built-in skins apply their primary and secondary tints. Named custom skins can also restore their saved RGB, transparency and lighting settings. Every role uses the same selected skin through the common renderer.</p><p>The 3D Surface controls adjust depth, bevel, side thickness and dome. Texture controls add grain or an image; lighting changes reflections and contrast.</p>',action:'skin',label:'Create a custom skin'},
  {id:'custom',title:'Create, save and update custom skins',body:'<ol><li>Choose a skin close to the look you want.</li><li>Adjust Color, 3D Surface, Lighting and Texture. An imported texture is embedded in the project.</li><li>Choose <strong>Create skin</strong>, enter a unique name and select <strong>Save current look</strong>.</li></ol><p>The saved recipe includes surface settings, colors, RGB settings, transparency, lighting and any embedded texture. It appears in Custom and in Cursor Lab’s skin preview selector. Your current theme shapes are unchanged.</p><p>Choose a named custom skin, edit its look and use <strong>Update selected skin</strong> to replace that recipe after confirmation. To preserve both versions, use Create skin with a new name. Built-in skins cannot be overwritten.</p><p>Projects and exported cursor sets keep their own copies of the settings. Updating a library recipe does not rewrite previously saved projects or installers.</p>',action:'skin',label:'Open skin creator'},
  {id:'rgb',title:'RGB color and preview animation',body:'<p>Open Color and enable RGB. <strong>Cycle</strong> changes the whole tint; <strong>Flow</strong> moves a spectrum across the surface. Choose a 6, 12 or 18 second loop. Saturation changes color intensity; Flow spread and direction shape the moving bands.</p><p>Preparing an animated preview takes longer than a static image, especially at 256 px. The status reports frame progress. Frames are shaded once, cached and played locally. Windows animation is generated separately as ANI files.</p><p>If the preview needs recovery, it retries frame preparation and resumes when the window becomes visible. <strong>Restart preview</strong> requests fresh playback without changing Windows or project settings.</p><p>A custom design animation uses its own animation speed. RGB and design movement share the same loop in that case.</p>',action:'preview',label:'Restart the preview'},
  {id:'lab',title:'Cursor Lab: shapes, points and curves',body:'<p>Open a role with its pencil button. Use Add shape for a primitive or component, Freehand for a natural stroke, or Pen for precise corners and curves. Each result is ordinary editable geometry.</p><p><strong>Move shape</strong> moves an object; its corners resize and its top handle rotates. <strong>Edit points</strong> selects anchors: drag a box, Ctrl-click to add/remove points, then drag or nudge the group. Points & curves exposes handles, smoothing and simplification.</p><p>The shape list controls visibility, order, naming and locking. A locked shape rejects edits. Cut a hole, Keep overlap and Remove overlap combine shapes without changing their editable paths. Undo/Redo are at the top.</p><p>Cursor Lab’s skin selector is a geometry preview aid. Choose the actual whole-set skin in the main library.</p>'},
  {id:'click',title:'Click point (hotspot) and safe cursors',body:'<p>The gold click point is the exact coordinate Windows treats as a click. It must stay on or close to visible cursor geometry. Use Move click point to drag it or nudge it with arrows. Geometry snapping and grid snapping are separate aids.</p><p>The main preview’s Hotspot checkbox reveals the installed point. Set hotspot overrides it for the selected role; Reset restores the designed point.</p><p>Save checks visibility and the click point at Windows size. If a design is rejected, fix the gold point, keep a visible main cursor body, or reduce motion that moves the body away from the point.</p><p>Transparency affects real alpha. At 100%, the cursor disappears and a usable clickable role cannot pass safety checks.</p>'},
  {id:'animation',title:'Cursor Lab animation',body:'<p>The Animation tab offers context-appropriate presets. Selected decorative shapes can move while the main clicking body stays stable. Float and Orbit require suitable decorative shapes; Blink should affect decorations on clickable roles.</p><p>Spin Axis uses two gold endpoints for its rotation axis. Keep the endpoints apart. Speed sets the loop duration and Intensity controls movement strength. Some controls depend on the chosen preset.</p><p>Animation safety is checked before saving and during export. If an unsafe frame is identified, the preview can stop on that frame so you can correct it. Your Windows click point must remain consistent throughout the loop.</p>'},
  {id:'projects',title:'Projects, drafts, Undo and Redo',body:'<p>Save stores a named cursor-set project in My Projects. Save As creates a separate copy. New opens a fresh Classic set; Resume previous session retrieves the previous workspace.</p><p>The main Undo/Redo controls restore workspace edits and synchronize their draft storage and any active desktop effects. They do not replace Windows cursor imagery; use Use in Windows to apply a new image set.</p><p>Cursor Lab has its own Undo/Redo history and automatically saved draft. <strong>Save role to project</strong> commits the edited geometry to the custom theme. On role change or close, choose Save, Discard or Cancel.</p><p>Returning from Lab refreshes the current project identity. Save the overall project as well when you want a named project snapshot.</p>'},
  {id:'check',title:'Check your set before applying',body:'<p>Check set lists all 17 roles with plain-language results: Ready, Missing shape, Missing click point or Needs work. Built-in roles are inherited automatically; custom roles are checked for safe geometry and animation.</p><p>Choose Edit role beside a problem to open Cursor Lab directly. Preview role shows that role in the main preview at the chosen size. Use Check again after edits. The checklist never installs cursors.</p><p>The checklist is an inspection aid. Export and Windows installation retain their own validation. Final appearance and feel should be checked in the test area at your intended size.</p>',action:'check',label:'Inspect all 17 roles'},
  {id:'windows',title:'Use in Windows and restore a set',body:'<p>Use in Windows renders all 17 roles at the selected size, asks for confirmation and applies them to your Windows cursor scheme. Cancel stops preparation before the installation stage.</p><p>The immediately previous scheme is backed up after a successful installation. <strong>Restore previous</strong> brings it back; <strong>Windows defaults</strong> restores the standard Windows scheme. Both stop CursorFlux desktop effects. The original backup is preserved separately.</p><p>If Windows refuses an installation or reload, the app attempts to restore the settings captured before the change. If Windows still refuses to refresh, open Mouse Properties &gt; Pointers and choose a working scheme.</p><p>Exported installers use the same backup/rollback logic. Running a generated installer with <strong>--restore-previous</strong> offers restoration without reinstalling its payload.</p>'},
  {id:'test',title:'Try your cursor set',body:'<p>The test area exercises your actual Windows pointers, rather than substituting pictures. Apply the set first, then try normal movement, a link, editable text, resizing and busy/working states.</p><p>Use the role selector to inspect additional pointer states in the sample box. Different applications may choose their own cursor images. Browser role presentation is useful for checking a set, but does not reproduce every application’s behavior.</p><p>The test area never applies anything automatically. You can restore the previous set from the main preview actions if you prefer it.</p>',action:'test',label:'Open the test area'},
  {id:'effects',title:'Desktop effects and background mode',body:'<p>Effects include classic mouse trails, glass particles, click ripples, ribbons and cursor auras. Their preview is inside the app; the Effects switch starts/stops the separate desktop overlay.</p><p>Use in Windows starts the effects configured in your project. The switch follows their actual state. Editing or undoing settings updates a running overlay. Tray Stop effects stops it and reopens the workspace.</p><p>Enable Keep effects running after closing CursorFlux Pro to hide the active app to its tray icon. Open restores the window; Exit stops effects and closes the app. With background mode off, closing the app stops desktop effects. Installed CUR/ANI cursors remain installed.</p>'},
  {id:'share',title:'Export and import cursor sets',body:'<p>Export Set creates a single installable EXE containing all role files, an editable project and applicable license notices. It is unsigned, so Windows may display a publisher warning. Export does not install the set on your PC.</p><p>Import accepts a project JSON or a CursorFlux-generated installer. Imported EXEs are opened as package data and are never executed. Save your current work before replacing it with an import.</p><p>Project JSON imports and the project inside an installer are limited to 8 MB; installer payloads are limited to 512 MB and individual cursor files to 128 MB. Export checks these limits before writing an installer. For unusually large sets, reduce the exported sizes or RGB loop length.</p><p>Named custom skins travel through their saved project settings and embedded texture. Recipients do not need your local skin library.</p>'},
  {id:'shortcuts',title:'Keyboard shortcuts',body:'<ul><li><span class="cf-key">Ctrl+Z</span>: Undo in the active workspace.</li><li><span class="cf-key">Ctrl+Y</span> or <span class="cf-key">Ctrl+Shift+Z</span>: Redo.</li><li><span class="cf-key">Ctrl+S</span>: Save role in Cursor Lab.</li><li>Arrow keys: nudge selected Lab points/shapes or the click point; Shift multiplies the step by five.</li><li>Ctrl-click: add/remove selected Lab points.</li><li>Alt-drag or middle-button drag: pan the Lab canvas.</li><li>Enter: finish a Pen path.</li><li><span class="cf-key">F1</span>: Help Center. Escape closes the foremost help/test/creator dialog.</li></ul><p>Text inputs keep their normal text-editing shortcuts. Modal dialogs support Tab and Shift+Tab.</p>'},
  {id:'trouble',title:'Troubleshooting and license notices',body:'<h4>RGB preview appears still</h4><p>Wait for Preparing smooth preview to finish. Check that RGB is enabled, then use Restart preview. Hide/show recovery and bounded retries are automatic. The Windows pointer is independent of this canvas.</p><h4>One thumbnail is a simple backup picture</h4><p>A skin preview took too long or failed. The skin remains usable; select it to inspect the main rendered preview.</p><h4>A role cannot be saved</h4><p>Read the safety message. Set the gold click point near the visible main body, keep the body visible and animate decorations instead.</p><h4>Effects stop when the app closes</h4><p>Enable background mode and leave the app in its tray. Exit intentionally stops effects.</p><h4>Licenses</h4><p>The footer Licenses button displays embedded third-party notices. Exported installers also include a license viewer. Ordinary updates retain acceptance of the same ShamonSoft agreement.</p>',action:'licenses',label:'Read third-party notices'}
];
featureDialog('helpCenter','Help Center','<div class="cf-help-layout"><nav class="cf-help-nav" aria-label="Help topics"><input id="helpSearch" type="text" placeholder="Search help" aria-label="Search help"><div id="helpTopics"></div></nav><article id="helpArticle" class="cf-help-article"></article></div>','<span>CursorFlux Pro 7.1 · Local help</span>',true);
let helpTopicId='start';
function renderHelp(){
  const query=$('helpSearch').value.trim().toLowerCase(),filtered=HELP_TOPICS.filter(topic=>(topic.title+' '+topic.body.replace(/<[^>]+>/g,' ')).toLowerCase().includes(query));
  $('helpTopics').innerHTML=filtered.length?filtered.map(topic=>'<button data-help-topic="'+topic.id+'" class="'+(helpTopicId===topic.id?'selected':'')+'">'+escapeHtml(topic.title)+'</button>').join(''):'<p class="cf-help-empty">No topics match. Try “RGB”, “skin” or “click point”.</p>';
  $('helpTopics').querySelectorAll('[data-help-topic]').forEach(button=>button.onclick=()=>{helpTopicId=button.dataset.helpTopic;renderHelp();$('helpArticle').scrollTop=0});
  const topic=HELP_TOPICS.find(item=>item.id===helpTopicId)||HELP_TOPICS[0];
  $('helpArticle').innerHTML='<h3>'+escapeHtml(topic.title)+'</h3>'+topic.body+(topic.action?'<button class="primary" id="helpAction">'+escapeHtml(topic.label)+'</button>':'');
  if($('helpAction'))$('helpAction').onclick=()=>{closeFeature('helpCenter');if(topic.action==='licenses')$('showLicenses').click();else if(topic.action==='preview')restartPreview();else if(!window.isLabWindow){if(topic.action==='skin')openSkinCreator();if(topic.action==='check')openReadiness();if(topic.action==='test')openTestArea()}else if(topic.action==='skin')openSkinCreator();else labStatus('Return to the main workspace to use this feature.')};
}
function openHelp(topic='start'){helpTopicId=topic;$('helpSearch').value='';renderHelp();openFeature('helpCenter');$('helpSearch').focus()}
$('helpSearch').oninput=renderHelp;
const helpButton=document.createElement('button');helpButton.id='helpCenterButton';helpButton.textContent='Help Center';helpButton.title='Search the CursorFlux Pro Help Center (F1)';helpButton.onclick=()=>openHelp();document.querySelector('.mast-right').prepend(helpButton);

featureDialog('skinCreator','Create a custom skin','<div class="cf-body"><p>Save a named material recipe for any theme. Colors, RGB, lighting, surface and embedded texture are included. Shapes stay unchanged.</p><label for="customSkinName">Skin name</label><input id="customSkinName" type="text" maxlength="80" placeholder="Name your skin"><label for="skinBase">Optional starting skin</label><div class="cf-row"><select id="skinBase" aria-label="Starting skin"></select><button id="loadSkinBase">Load base</button></div><div class="cf-skin-look"><canvas id="skinStudioPreview" width="128" height="128" aria-label="Current material preview"></canvas><div><p id="skinStudioSummary"></p><div class="cf-skin-buttons"><button data-skin-customize="color">Color &amp; RGB</button><button data-skin-customize="material">3D Surface</button><button data-skin-customize="lighting">Lighting</button><button data-skin-customize="texture">Texture</button></div></div></div><p>Customize in the main workspace, then reopen Create skin to save the current look.</p><div id="skinCreatorStatus" class="cf-feedback" role="status"></div></div>','<button id="cancelSkinCreate">Cancel</button><button id="saveCustomSkin" class="primary">Save current look</button>');
let skinStudioTicket=0;
async function updateSkinStudioPreview(){
  if(!$('skinCreator')||$('skinCreator').hidden)return;
  const canvas=$('skinStudioPreview'),context=canvas.getContext('2d'),source=$('preview');
  const ticket=++skinStudioTicket,token=revision;
  context.clearRect(0,0,128,128);
  try{
    const snapshot=clone(project);snapshot.Color.Transparency=0;
    const result=await call('preview',{role,size:128,frame:0},snapshot),image=await decodeFrame(result.image);
    try{if(ticket===skinStudioTicket&&token===revision&&!$('skinCreator').hidden)context.drawImage(image,0,0,128,128)}finally{image.close()}
  }catch(error){if(ticket===skinStudioTicket&&source?.width)context.drawImage(source,0,0,128,128)}
  $('skinStudioSummary').textContent=(project.Skin.Material||'Current look')+' · '+(project.Color.Rgb?'RGB '+project.Color.Mode:'Fixed colors')+' · '+project.Skin.Finish+' finish';
}
function openSkinCreator(){
  if(commandBusy||!project||window.isLabWindow)return;
  $('skinBase').innerHTML=materials.map(m=>'<option value="'+escapeHtml(m.Id)+'">'+escapeHtml(m.Id)+'</option>').join('');$('skinBase').value=project.Skin.Material;
  if(!$('customSkinName').value)$('customSkinName').value='My '+project.Skin.Material.replace(' · edited','')+' skin';
  $('skinCreatorStatus').textContent='';$('skinCreatorStatus').classList.remove('error');openFeature('skinCreator');updateSkinStudioPreview();$('customSkinName').focus();$('customSkinName').select();
}
$('loadSkinBase').onclick=()=>{chooseSkin($('skinBase').value);updateSkinStudioPreview()};
$('cancelSkinCreate').onclick=()=>closeFeature('skinCreator');
document.querySelectorAll('[data-skin-customize]').forEach(button=>button.onclick=()=>{inspectorTab=button.dataset.skinCustomize;renderSettings();closeFeature('skinCreator');document.querySelector('#settings input,#settings select')?.focus()});
async function saveNamedSkin(name,overwrite=false){
  if(commandBusy||!project)return false;
  clearTimeout(workspaceSaveTimer);workspaceEpoch++;const epoch=workspaceEpoch,snapshot=clone(project),token=revision;
  try{
    const result=await call('saveMaterial',{name,overwrite},snapshot);if(result.cancelled)return false;
    if(epoch!==workspaceEpoch)return false;
    materials=result.materials;skinImages.delete(result.name);
    // A library save must not overwrite newer in-flight workspace edits.
    if(token===revision){remember();project=result.project;revision++;clearAnimation();renderControls();updateState();schedulePreview();if(effectsRunning)syncRunningEffects()}
    renderCatalog();queueWorkspaceSave();setStatus('Saved skin '+result.name+'. It is available in My skins and Cursor Lab.');return true;
  }catch(error){$('skinCreatorStatus').textContent=error.error||'The skin could not be saved.';$('skinCreatorStatus').classList.add('error');setStatus(error.error||'The skin could not be saved.',true);return false}
}
$('saveCustomSkin').onclick=async()=>{const name=$('customSkinName').value.trim();if(!name){$('skinCreatorStatus').textContent='Enter a skin name.';return}const button=$('saveCustomSkin');button.disabled=true;try{if(await saveNamedSkin(name)){closeFeature('skinCreator');filter='Custom';renderCatalog()}}finally{button.disabled=false}};
const skinBar=document.createElement('div');skinBar.className='skin-create-bar';skinBar.innerHTML='<button id="createSkin" class="primary">Create skin</button><button id="updateSkin">Update selected skin</button><span>Recipes work across themes and projects.</span>';
document.querySelector('.library-head').after(skinBar);$('createSkin').onclick=openSkinCreator;$('updateSkin').onclick=()=>saveNamedSkin(project.Skin.Material,true);if(window.isLabWindow)skinBar.hidden=true;

featureDialog('readinessOverlay','Cursor set checklist','<div class="cf-body"><p id="readinessSummary" class="cf-role-summary" role="status"></p><div id="readinessList" class="cf-checklist"></div></div>','<button id="readinessCheckAgain">Check again</button><button id="readinessHelp">Help</button>');
let readinessTicket=0,readinessRevision=-1,readinessBusy=false;
async function openReadiness(){openFeature('readinessOverlay');await inspectReadiness()}
async function inspectReadiness(){
  if(commandBusy||!project)return;
  const ticket=++readinessTicket,token=revision;readinessBusy=true;$('readinessCheckAgain').disabled=true;
  $('readinessSummary').textContent='Checking shapes, click points and custom animation for all 17 roles…';$('readinessList').innerHTML='';
  try{
    const result=await call('checkSet',{},clone(project));if(ticket!==readinessTicket||$('readinessOverlay').hidden)return;
    readinessRevision=token;const ready=result.roles.filter(row=>row.State==='Ready').length;
    $('readinessSummary').textContent=token!==revision?'Settings changed. Choose Check again.':ready+'/17 roles ready · '+result.size+' px'+(result.ready?' · Ready to try or apply.':' · Edit the roles listed below.');
    $('readinessList').innerHTML=result.roles.map(row=>'<div class="cf-role-row"><div><b>'+escapeHtml(row.Name)+'</b><span class="'+(row.State==='Ready'?'ready':'needs-work')+'">'+escapeHtml(row.State)+'</span></div><span>'+escapeHtml(row.Message)+'</span><button data-check-role="'+row.Role+'" data-check-edit="'+(row.State!=='Ready')+'">'+(row.State==='Ready'?'Preview role':'Edit role')+'</button></div>').join('');
    $('readinessList').querySelectorAll('[data-check-role]').forEach(button=>button.onclick=()=>{closeFeature('readinessOverlay');if(button.dataset.checkEdit==='true')openLab(button.dataset.checkRole);else{role=button.dataset.checkRole;revision++;clearAnimation();renderRoles();schedulePreview()}});
  }catch(error){if(ticket===readinessTicket)$('readinessSummary').textContent=error.error||'The set could not be checked. Try again.'}
  finally{if(ticket===readinessTicket){readinessBusy=false;$('readinessCheckAgain').disabled=false}}
}
$('readinessCheckAgain').onclick=inspectReadiness;$('readinessHelp').onclick=()=>{closeFeature('readinessOverlay');openHelp('check')};

featureDialog('testArea','Try your Windows cursor set','<div class="cf-body"><p>This area uses your actual Windows pointers. Apply your set first; opening this area changes no Windows settings.</p><div class="cf-test-grid"><div class="cf-test-card"><b>Normal and link</b><p>Move over this card, then <a class="cf-link-test" href="#" id="cursorTestLink">hover this sample link</a>.</p></div><div class="cf-test-card"><b>Text</b><p>Move inside or select the sample text.</p><textarea aria-label="Cursor test text" spellcheck="false">Try your text pointer here. This text is only a test.</textarea></div><div class="cf-test-card"><b>Resize</b><p>Drag the lower-right corner.</p><div class="cf-resize-test">Resizable sample</div></div><div class="cf-test-card"><b>Busy and other roles</b><p>Choose a role, then move inside the box.</p><select id="cursorTestRole" aria-label="Pointer role"><option value="wait">Busy</option><option value="progress">Working</option><option value="crosshair">Precision</option><option value="not-allowed">Unavailable</option><option value="move">Move</option><option value="ns-resize">Resize vertical</option><option value="ew-resize">Resize horizontal</option><option value="nwse-resize">Resize NW–SE</option><option value="nesw-resize">Resize NE–SW</option><option value="default">Normal</option></select><div class="cf-role-sample" id="cursorRoleSample" style="cursor:wait">Move the pointer here</div></div></div></div>','<button id="cursorTestHelp">Help</button>');
function openTestArea(){if(!commandBusy&&!window.isLabWindow)openFeature('testArea')}
$('cursorTestLink').onclick=e=>e.preventDefault();$('cursorTestRole').onchange=e=>$('cursorRoleSample').style.cursor=e.target.value;$('cursorTestHelp').onclick=()=>{closeFeature('testArea');openHelp('test')};
function restartPreview(){if(!project||commandBusy)return;revision++;clearAnimation();schedulePreview();setStatus('Refreshing the preview. Windows cursors are unchanged.')}
if(!window.isLabWindow){
  const actions=$('undo').parentElement;
  const redoButton=document.createElement('button');redoButton.id='redo';redoButton.textContent='Redo';redoButton.title='Redo the last workspace edit (Ctrl+Y)';redoButton.onclick=redo;$('undo').after(redoButton);
  const checkButton=document.createElement('button');checkButton.id='checkSet';checkButton.textContent='Check set';checkButton.title='Inspect all 17 roles without installing';checkButton.onclick=openReadiness;actions.appendChild(checkButton);
  const testButton=document.createElement('button');testButton.id='trySet';testButton.textContent='Try set';testButton.title='Test your current Windows pointers';testButton.onclick=openTestArea;actions.appendChild(testButton);
  const previous=document.createElement('button');previous.id='restorePrevious';previous.textContent='Restore previous';previous.title='Restore the set active before the last successful CursorFlux installation';previous.onclick=()=>command('restore');actions.appendChild(previous);
  const restore=$('restore');restore.textContent='Windows defaults';restore.title='Restore the standard Windows cursor scheme';actions.appendChild(restore);
  const retry=document.createElement('button');retry.id='restartPreview';retry.textContent='Restart preview';retry.title='Restart the app preview without changing Windows';retry.onclick=restartPreview;actions.appendChild(retry);
  const help=document.createElement('button');help.textContent='RGB help';help.title='Color and RGB preview help';help.onclick=()=>openHelp('rgb');actions.appendChild(help);
}
document.addEventListener('keydown',e=>{
  if(e.key==='F1'){e.preventDefault();openHelp(window.isLabWindow?'lab':'start');return}
  const overlays=[...document.querySelectorAll('.cf-overlay:not([hidden])')];if(!overlays.length)return;
  const overlay=overlays[overlays.length-1];
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeFeature(overlay.id)}
  if(e.key==='Tab'){
    const items=[...overlay.querySelectorAll('button,input,select,textarea,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);
    if(!items.length)return;const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){e.preventDefault();first.focus()}
  }
},true);
updateFeatureState();
