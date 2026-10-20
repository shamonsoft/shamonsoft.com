/* One project, one Lab and one shared appearance model. */
function formatSettingValue(key,value){
  const n=Number(value);
  if(key==='Ior')return (n/100).toFixed(2);
  if(/Angle$/.test(key))return Math.round(n)+'°';
  return Math.round(n)+'%';
}
let surfaceCardOpen=false;
let advancedAppearance=false,labSection='shape',labSaving=false,inspectLarge=false,appliedSnapshot=null;
function appearanceOf(p){return {Skin:clone(p.Skin),Color:clone(p.Color),Rendering:clone(p.Rendering)}}
function labHistorySnapshot(){return {...clone(lab.design),__appearance:appearanceOf(project)}}
function labRestoreSnapshot(snapshot){
  lastEditKey="";const appearance=snapshot.__appearance;delete snapshot.__appearance;lab.design=snapshot;
  if(appearance){Object.assign(project,clone(appearance));renderSettings();syncLabSkin()}
}
function syncLabSkin(){
  if(!$('labSkin')||!project)return;
  $('labSkin').innerHTML='<option value="">Current customized look</option>'+materials.map(m=>'<option value="'+escapeHtml(m.Id)+'">'+escapeHtml(m.Id)+'</option>').join('');
  $('labSkin').value=project.Skin.Material;
  if($('labAppearanceName'))$('labAppearanceName').textContent=project.Skin.Material;
}
const originalEdit=edit;
edit=function(mutator,key='',alphaOnly=false){
  if(!window.isLabWindow||!lab.design)return originalEdit(mutator,key,alphaOnly);
  // Shape and appearance edits share the Lab undo stack and commit together.
  if(!key||lastEditKey!==key)labRemember();lastEditKey=key;mutator();revision++;labChanged();updateState();syncLabSkin();
};
const originalRenderSettings=renderSettings;
renderSettings=function(){
  originalRenderSettings();
  const tabs=$('inspectorTabs');
  $('tab-color').textContent='Appearance';$('tab-material').textContent='Surface';
  $('tab-effects').textContent='Desktop effects';
  const extra=document.createElement('button');extra.id='advancedAppearance';extra.textContent=advancedAppearance?'Less detail':'Advanced';extra.setAttribute('aria-expanded',String(advancedAppearance));
  extra.onclick=()=>{advancedAppearance=!advancedAppearance;if(!advancedAppearance&&['material','lighting','texture'].includes(inspectorTab))inspectorTab='color';renderSettings()};tabs.append(extra);
  for(const id of ['material','lighting','texture'])$('tab-'+id).hidden=!advancedAppearance;
  if(window.isLabWindow)$('tab-effects').hidden=true;
  const quick=document.createElement('details');quick.className='effects-group';quick.open=surfaceCardOpen;quick.ontoggle=()=>surfaceCardOpen=quick.open;
  quick.innerHTML='<summary>Surface and finish</summary><div class="card-body"></div>';
  const body=quick.lastElementChild;
  for(const key of ['Depth','Roughness','Reflection','Finish','Outline']){
    const field=document.querySelector('#settings [data-key="'+key+'"]')?.closest('.field');if(field)body.append(field);
  }
  $('panel-color').append(quick);
  const note=document.createElement('p');note.className='ux-help';note.textContent='Appearance changes all pointer types. Shape and movement changes affect the selected pointer type.';$('panel-color').prepend(note);
  for(const input of document.querySelectorAll('#settings input[type=range]'))input.setAttribute('aria-valuetext',formatSettingValue(input.dataset.key,input.value));
  const effectsTitle=$('effectsToggle')?.closest('.inspector-title');
  if(effectsTitle){effectsTitle.firstChild.textContent='Show effects on desktop ';$('effectsToggle').setAttribute('aria-label','Show effects on desktop')}
  if(window.isLabWindow)document.querySelectorAll('#panel-effects button,#panel-effects input,#panel-effects select').forEach(n=>n.disabled=true);
};
function makeMenu(id,label,ids,parent){
  const menu=document.createElement('details');menu.id=id;menu.className='ux-menu';
  menu.innerHTML='<summary>'+label+'</summary><div class="ux-menu-items"></div>';parent.append(menu);
  for(const key of ids){const button=$(key);if(button)menu.lastElementChild.append(button)}
  menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false});return menu;
}
function setLabel(id,text){const n=$(id);if(n)n.textContent=text}
function updateUsabilityState(){
  if(!project)return;
  if($('windowsState')){
    const equal=appliedSnapshot===JSON.stringify(project);
    $('windowsState').textContent=equal?'Windows: this preview is applied':windowsState.Default?'Windows: default cursor set':windowsState.Applied?'Windows: a CursorFlux set is installed':'Windows: current system cursor set';
    $('previewState').textContent=equal?'Applied at '+project.ApplySize+' px':'Preview only · Use in Windows when ready';
  }
  if($('currentLook')){
    const saved=materials.find(m=>m.Id===project.Skin.Material);
    const modified=saved&&JSON.stringify(saved.Settings)!==JSON.stringify(project.Skin);
    $('currentLook').textContent=project.Skin.Material+(modified?' · Modified':'');
  }
  if($('labSave'))$('labSave').disabled=labSaving||!!lab.safety;
}
const originalFeatureState=updateFeatureState;
updateFeatureState=function(){originalFeatureState();updateUsabilityState()};
const originalCommand=command;
command=async function(action,extra={}){
  const snapshot=JSON.stringify(project),result=await originalCommand(action,extra);
  if(result&&action==='apply')appliedSnapshot=snapshot;
  else if(result&&['restore','defaults'].includes(action))appliedSnapshot=null;
  updateUsabilityState();return result;
};
if(!window.isLabWindow){
  setLabel('saveProject','Save project');setLabel('showProjects','Projects');setLabel('saveAsProject','Save a copy…');setLabel('newProject','New project');setLabel('exportProject','Export cursor set…');
  makeMenu('projectMenu','More project options',['newProject','saveAsProject','importProject','exportProject'],$('projectActions'));
  const actions=$('undo').parentElement;
  const helpButton=[...actions.children].find(n=>n.textContent==='RGB help');if(helpButton)helpButton.remove();
  setLabel('trySet','Test installed cursors');setLabel('restorePrevious','Restore previous cursor set');
  const menu=makeMenu('cursorTools','Cursor tools',['checkSet','trySet','restartPreview','restorePrevious','restore'],actions);
  const state=document.createElement('div');state.className='ux-apply-state';state.innerHTML='<strong id="previewState">Preview only</strong><span id="windowsState">Reading Windows cursor status…</span>';$('previewFrame').parentElement.after(state);
  const heading=document.createElement('div');heading.className='ux-pane-heading';heading.textContent='1 · Choose a cursor design';document.querySelector('.settings-pane').prepend(heading);
  const pointerTitle=document.createElement('div');pointerTitle.className='ux-help';pointerTitle.textContent='Pointer types · select to preview, pencil to edit';document.querySelector('.theme-picker').after(pointerTitle);
  const rightTitle=document.createElement('div');rightTitle.className='ux-pane-heading';rightTitle.textContent='2 · Adjust the appearance';document.querySelector('.roles-pane').prepend(rightTitle);
  $('applyWindows').title='3 · Apply this project to Windows. Save project keeps an editable copy.';
  const current=document.createElement('p');current.id='currentLook';current.className='ux-current-look';document.querySelector('.library-head').after(current);
  const zoom=document.createElement('button');zoom.id='inspectSize';zoom.className='small';zoom.textContent='Enlarge preview';zoom.setAttribute('aria-pressed','false');
  zoom.onclick=()=>{inspectLarge=!inspectLarge;zoom.textContent=inspectLarge?'Actual size':'Enlarge preview';zoom.setAttribute('aria-pressed',String(inspectLarge));updateInspectScale()};$('previewFrame').append(zoom);
  setLabel('createSkin','Customize in Cursor Lab');$('createSkin').onclick=()=>openLab(role,false);
  setLabel('updateSkin','Save changes to this skin');
  document.querySelector('.skin-create-bar span').textContent='A skin supplies the colors, finish and lighting.';
}
function updateInspectScale(){if(!$('sample')||!project)return;$('sample').style.transform=inspectLarge?'scale('+Math.max(1,Math.min(4,210/project.ApplySize))+')':'none'}
const originalDrawFrame=drawFrame;
drawFrame=function(image,size){originalDrawFrame(image,size);updateInspectScale()};
// All skin editing opens the same Lab. Saving a reusable recipe is optional.
openSkinCreator=function(){if(!commandBusy&&project&&!window.isLabWindow)openLab(role,false);else if(window.isLabWindow)showUnifiedSection('appearance')};
$('createSkin').onclick=openSkinCreator;
function showUnifiedSection(section){
  labSection=section;shell.dataset.section=section;
  const appearance=section==='appearance';
  $('labAppearancePanel').hidden=!appearance;
  document.querySelector('.lab-tabs').hidden=appearance||section==='animation';
  $('labGeometryPanel').hidden=appearance||section==='animation';$('labAnimationPanel').hidden=section!=='animation';
  if(section==='shape')showLabInspector('shape');
  for(const button of document.querySelectorAll('[data-lab-section]')){const selected=button.dataset.labSection===section;button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected))}
  const destination=appearance?$('labAppearanceStage'):document.querySelector('.lab-skin-preview');
  destination.append($('labPreview'));
  $('labAppearanceStage').hidden=!appearance;$('labCanvas').hidden=appearance;
  $('labGuide').textContent=appearance?'Changes here affect the appearance of all 17 pointer types. Done returns the whole look to your project.':section==='animation'?'Animate this pointer type. Keep its main clicking shape stable.':'Edit this pointer type. Use Points & curves for drawing correction and detailed adjustments.';
  if(appearance){inspectorTab='color';renderSettings();syncLabSkin()}
}
async function finishUnifiedLab(closeAfter){
  if(lab.drag?.kind==='hotspot'){labStatus('Finish placing the click point before saving.');return}
  if(labSaving||lab.safety){if(lab.safety)labStatus(lab.safety);return}
  labSaving=true;$('labSave').disabled=true;$('labExitSave').disabled=true;
  const next=pendingLabRole;
  try{
    clearTimeout(labPersistTimer);
    if(JSON.stringify(lab.design)===lab.geometryBaseline&&!lab.newSet){
      const result=await call('labCommitAppearance',{},clone(project));project=result.project;lab.dirty=false;lab.entryProject=clone(project);
    }else await saveRoleToProject(lab.role);
    clearTimeout(labPersistTimer);await call('labDiscardDraft',{},null);
    $('labExitDialog').hidden=true;pendingLabRole=null;
    if(next)await switchLabRole(next);else if(closeAfter)await closeLabNow();
  }catch(error){labStatus(error.error||error.message||'Changes could not be returned to the project. Your edits are still open.')}
  finally{labSaving=false;updateUsabilityState();$('labExitSave').disabled=!!lab.safety}
}
async function discardUnifiedLab(){
  if(labSaving)return;
  const next=pendingLabRole;clearTimeout(labPersistTimer);
  try{
    await call('labDiscardDraft',{},null);
    if(lab.entryProject)project=clone(lab.entryProject);
    lab.dirty=false;$('labExitDialog').hidden=true;pendingLabRole=null;
    if(next)await switchLabRole(next);else await closeLabNow();
  }catch(error){labStatus(error.error||'The draft could not be cleared. Your edits are still open.')}
}
if(window.isLabWindow){
  const workflow=document.createElement('nav');workflow.className='lab-workflow';workflow.setAttribute('aria-label','Cursor Lab sections');workflow.setAttribute('role','tablist');
  workflow.innerHTML=['shape','appearance','animation'].map(s=>'<button role="tab" data-lab-section="'+s+'">'+s[0].toUpperCase()+s.slice(1)+'</button>').join('')+'<span id="labGuide" class="ux-help"></span>';
  document.querySelector('.lab-top').after(workflow);
  workflow.querySelectorAll('button').forEach(button=>button.onclick=()=>showUnifiedSection(button.dataset.labSection));
  const panel=document.createElement('section');panel.id='labAppearancePanel';panel.hidden=true;
  panel.append($('inspectorTabs'),$('settings'));document.querySelector('.lab-settings').append(panel);
  const stage=document.createElement('div');stage.id='labAppearanceStage';stage.hidden=true;
  stage.innerHTML='<strong>Live appearance preview</strong><p id="labAppearanceName"></p><small>Enlarged for inspection · the Windows size stays unchanged.</small>';
  document.querySelector('.lab-canvas-wrap').append(stage);
  const skinActions=document.createElement('section');skinActions.id='labSkinActions';
  skinActions.innerHTML='<p class="ux-help">Choose a starting skin, then adjust it on the right. Done keeps this look in your current project. Saving a reusable skin is optional.</p><label for="labSkinName">Reusable skin name</label><input id="labSkinName" type="text" maxlength="80" placeholder="My new skin"><button id="labSaveSkin">Save appearance as a skin</button><button id="labUpdateSkin">Save changes to this skin</button><p id="labSkinFeedback" role="status" class="ux-help"></p>';
  document.querySelector('.lab-skin-preview').after(skinActions);
  $('labSkin').onchange=e=>{if(e.target.value)chooseSkin(e.target.value)};
  async function storeSkin(overwrite){
    if(labSaving)return;
    const name=overwrite?project.Skin.Material:$('labSkinName').value.trim();
    if(!name){$('labSkinFeedback').textContent='Enter a name for your reusable skin.';$('labSkinName').focus();return}
    $('labSaveSkin').disabled=$('labUpdateSkin').disabled=true;
    try{if(await saveNamedSkin(name,overwrite)){$('labSkinFeedback').textContent='Saved to My skins. Choose Done to keep the appearance in your project.';syncLabSkin()}}
    finally{$('labSaveSkin').disabled=false;$('labUpdateSkin').disabled=!materials.some(m=>m.Group==='Custom'&&m.Id===project.Skin.Material)}
  }
  $('labSaveSkin').onclick=()=>storeSkin(false);$('labUpdateSkin').onclick=()=>storeSkin(true);
  setLabel('labSave','Done');setLabel('labClose','Close');
  $('labSave').title='Keep shape and appearance changes in the project and return to the main window.';
  const correction=document.createElement('div');correction.className='ux-correction';correction.innerHTML='<label for="drawingCorrection">Drawing correction</label><select id="drawingCorrection"><option value="gentle">Gentle · keep more detail</option><option value="balanced" selected>Balanced · smooth freehand</option><option value="strong">Strong · simple curves</option></select><p class="ux-help">Applies to your next freehand stroke. Use Smooth path to round an existing selected shape.</p>';
  $('labCurveGroup').querySelector('summary').after(correction);
  $('drawingCorrection').onchange=e=>{const values={gentle:[85,25],balanced:[55,55],strong:[25,85]}[e.target.value];$('labPointDetail').value=values[0];$('labSmoothing').value=values[1];$('labDetailValue').textContent=values[0];$('labSmoothValue').textContent=values[1]};$('drawingCorrection').onchange({target:$('drawingCorrection')});
  $('labAnimationTab').hidden=true;
  showUnifiedSection('shape');
}
const originalLoadLabRole=loadLabRole;
loadLabRole=async function(selectedRole){await originalLoadLabRole(selectedRole);if(window.isLabWindow){syncLabSkin();showUnifiedSection(labSection)}};
const originalSaveNamedSkin=saveNamedSkin;
saveNamedSkin=async function(name,overwrite=false){
  if(!window.isLabWindow)return originalSaveNamedSkin(name,overwrite);
  const token=lab.rev,snapshot=clone(project);
  try{
    const result=await call('saveMaterial',{name,overwrite},snapshot);if(result.cancelled)return false;
    materials=result.materials;
    if(token===lab.rev){labRemember();project.Skin=clone(result.project.Skin);revision++;labChanged();renderSettings()}
    return true;
  }catch(error){$('labSkinFeedback').textContent=error.error||'The skin could not be saved.';return false}
};
document.addEventListener('click',e=>{document.querySelectorAll('.ux-menu[open]').forEach(menu=>{if(!menu.contains(e.target))menu.open=false})});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.ux-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus()})});
// Local help is the same source for main window and unified Lab.
const revisedHelp={
  start:'<p>Choose a <strong>Cursor design</strong>, pick a skin, then adjust Appearance. All pointer types share that appearance.</p><p>Open <strong>Cursor Lab</strong> to edit Shape, Appearance and Animation together. <strong>Done</strong> returns your edits to the current project. <strong>Save project</strong> keeps a named editable copy. <strong>Use in Windows</strong> installs the finished set.</p><p>Cursor tools contains Check set, Test installed cursors, Restart preview and the restore actions.</p>',
  themes:'<p>A cursor design supplies the shapes for 17 Windows pointer types. Select a row to preview it; use its pencil or Cursor Lab to edit it. Editing a built-in shape creates a custom design without changing the original.</p><p>Appearance applies to all pointer types; Shape and Animation edit the selected type. Check set lists missing or unsafe shapes before installation.</p>',
  skins:'<p>A skin supplies surface, colors, RGB, transparency, lighting and texture. Choose a library skin or edit its Appearance inside Cursor Lab. My skins contains recipes you explicitly save. Recovered skins preserves older automatically generated recipes; new edits stay in the project.</p><p>Advanced reveals detailed surface, lighting and texture controls. Slider values match their scales; directions use degrees and refraction uses a physical index.</p>',
  custom:'<p>Open Cursor Lab → Appearance. Choose a starting skin on the left and adjust the shared live preview with controls on the right. You can switch to Shape or Animation without leaving your work.</p><p>Choose Done to keep the appearance in the project. To reuse it in another project, enter a name and choose Save appearance as a skin. Save changes to this skin updates a named custom recipe after confirmation; built-in skins are protected.</p><p>A saved library skin remains saved even if you later discard unsaved Lab edits. Projects and exported sets contain their own settings and textures.</p>',
  lab:'<p>Cursor Lab combines Shape, Appearance and Animation. Shape has a canvas, shape list and Points &amp; curves controls. Appearance edits the whole set’s colors and finish. Animation edits movement for the selected pointer type.</p><p>Undo and Redo work across shape and appearance edits. Drawing correction controls smoothing for new freehand strokes; Smooth path rounds an existing selected shape. Flip horizontally/vertically mirrors a shape.</p><p>Done returns the edits to your project. Close offers to keep or discard unfinished work. Save project in the main window keeps the complete named setup.</p>',
  projects:'<p>Save project stores the complete setup in Projects. More project options includes New project, Save a copy, Import and Export cursor set. The last workspace reopens automatically, including unsaved edits; it does not apply anything to Windows at startup.</p><p>The Saved/Unsaved label refers to your named project snapshot. Lab Done returns changes to the current project; save the project afterwards. Undo/Redo affect edits, not already installed Windows cursors.</p>',
  click:'<p>The click point (hotspot) is the coordinate Windows treats as a click. Use Show click point in the main preview or Move click point in Lab. Keep it on visible geometry. Set click point overrides it for the selected type; Reset restores the designed position.</p><p>Done and Windows installation retain cursor safety checks. Transparency at 100% makes a cursor invisible.</p>',
  test:'<p>Cursor tools → Test installed cursors exercises the current Windows pointer set. Apply your project with Use in Windows first if you want to test those edits. The test area never installs anything itself.</p><p>The preview status is separate from Windows status. Enlarge preview magnifies the app image only; the Size control determines the installed cursor size.</p>'
};
for(const topic of HELP_TOPICS){if(revisedHelp[topic.id])topic.body=revisedHelp[topic.id];topic.body=topic.body.replaceAll('Restore previous</strong>','Restore previous cursor set</strong>').replaceAll('Effects switch','Show effects on desktop switch').replaceAll('Open Color and enable RGB','Open Appearance and enable Animated colors (RGB)');}
HELP_TOPICS.find(t=>t.id==='custom').title='Create a skin in Cursor Lab';HELP_TOPICS.find(t=>t.id==='themes').title='Cursor designs and pointer types';
