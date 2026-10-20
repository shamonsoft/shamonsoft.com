/* Cursor Lab: one control rail, one workspace, three clear sections. */
let labShapeMode='object',labSkinMore=false;
function organizeLabControls65(){
  if(!window.isLabWindow||!$('labControlRail'))return;
  const tips={labUndo:'Undo your last Shape, Skin or Animation edit.',labRedo:'Restore an edit you undid.',labSave:'Keep Lab changes in the current project and return. Save project keeps a named copy.',labClose:'Return to the project. Choose whether to keep or discard unfinished changes.',labTemplate:'Shape and Animation edit this pointer type. Skin applies to the whole set.',labThickness:'Width of an open stroke, in canvas units.',labX:'Horizontal position in canvas units.',labY:'Vertical position in canvas units.',labWidth:'Shape width in canvas units.',labHeight:'Shape height in canvas units.',labAngle:'Angle in degrees. Choose Rotate to turn the selected shape.',labHotX:'Enter an X coordinate near an actual point; both coordinates snap to that point.',labHotY:'Enter a Y coordinate near an actual point; both coordinates snap to that point.',labShowHotspotPoints:'Show visible anchor points without editing their shapes.',labHotspotPoint:'Attach the click point to a point on the selected shape.',labClosed:'Connect the ends to make a filled shape.',labAnimationTarget:'Animate the entire design, or only the shapes checked below.',labAnimationSpeed:'How quickly the movement repeats.',labAnimationIntensity:'How strong the movement is.',labAnimationDirection:'Choose the direction of the movement.',labSkin:'Start from a library skin. The appearance applies to all pointer types.',labSkinName:'Name this appearance so you can reuse it in other projects.',labSaveSkin:'Save this appearance in My skins.',labUpdateSkin:'Update the selected named custom skin. Built-in skins are protected.',drawingCorrection:'Smooth your next freehand stroke. Use Smooth path for an existing shape.',labSnap:'Keep positions aligned to the selected grid spacing. Turn off for free positioning.',labShowGrid:'Show or hide the canvas grid.',labGrid:'Grid spacing in canvas units. Snapping uses the same spacing.',labFit:'Fit the design into view and reset canvas panning.',labSnapHotspot:'Move the click point to the nearest eligible visible cursor point.',labSetHot:'Drag onto an actual visible cursor point. Red marks an invalid drop; release there to keep the previous position.',labPreview:'Live preview of this pointer with its skin and animation. Enlarging this image does not change Windows cursor size.'};
  for(const [id,tip] of Object.entries(tips)){const node=$(id);if(node&&!node.disabled)node.title=tip;}
  // Numeric fields get compact, labeled rows. Nodes and handlers are retained.
  for(const input of $('labControlRail').querySelectorAll('input[type=number]')){
    if(input.closest('.lab-number-row'))continue;
    const label=input.previousElementSibling;
    if(!label||label.tagName!=='LABEL')continue;
    if(input.id)label.htmlFor=input.id;
    const row=document.createElement('div');row.className='lab-number-row';input.before(row);row.append(label,input);
    if(input.id==='labAngle')row.append($('labRotate'));
  }
  for(const node of shell.querySelectorAll('button,input,select,summary')){
    if(!node.title){const label=node.closest('label')||node.previousElementSibling;node.title=node.getAttribute('aria-label')||((label?.tagName==='LABEL'?label.textContent:'')||node.textContent).trim().replace(/\s+/g,' ');}
  }
  for(const help of shell.querySelectorAll('.lab-small-help,.lab-help,.lab-tool-help,.lab-guidance,.ux-help,.hint')){
    if(help.closest('.lab-save')||help.getAttribute('role')==='status')continue;
    const target=help.closest('.lab-rail-card,.lab-group,.settings-card,.field,.ux-correction')?.querySelector('summary,input,select,button');
    if(target&&!target.dataset.helpTooltip){target.title=[target.title,help.textContent.trim()].filter(Boolean).join(' ');target.dataset.helpTooltip='true';}
    help.hidden=true;
  }
  $('labSelectionDetail').hidden=true;
  for(const note of $('labSkinActions').querySelectorAll('p')){
    if(note.textContent.trim())note.title=note.textContent.trim();
    note.hidden=true;
  }
  $('labTools').title=$('labToolInstruction').textContent;
  $('labPointControls').title=$('labPointHint').textContent;
  $('labSkinActions').title='Save this look to My skins for use in other projects.';
  const feedback=$('labSkinFeedback').textContent.trim();
  if(feedback)$('labSkinActions').title=feedback;
  $('labSizeNote').hidden=true;$('labPreview').title=tips.labPreview+' Windows size: '+(project?.ApplySize||32)+' px.';
  $('labAppearanceStage').querySelector('small').hidden=true;
  document.querySelector('.lab-bar-shape label').textContent='Choose shape';
}
const layoutHelp={
  shape:'Choose a shape or draw one, then select it to adjust its outline. The gold marker is the click point.',
  appearance:'Skin changes the colors and finish of all pointer types. Done keeps the look in your project.',
  animation:'Animate this pointer type. Use checked shapes to move decorations while keeping the clicking body steady.'
};
function labCard(id,title,open=false){
  const card=document.createElement('details');card.id=id;card.className='lab-rail-card';card.open=open;
  const heading=document.createElement('summary');heading.textContent=title;card.append(heading);
  const content=document.createElement('div');content.className='lab-card-content';card.append(content);return card;
}
function updateLabLayout(){
  if(!window.isLabWindow||!$('labControlRail'))return;
  const points=['points','pen'].includes(lab.tool);
  $('labObjectControls').hidden=points;
  $('labPointControls').hidden=!points;
  $('labDrawingControls').hidden=lab.tool!=='freehand';
  $('labPointHint').hidden=!points;
  const target=roleNames[roleIds.indexOf(lab.role)]||'Normal';
  $('labPreviewTarget').textContent=target+' pointer';
  $('labSizeNote').textContent='Enlarged preview · Windows size '+(project?.ApplySize||32)+' px';
  $('labScope').textContent=labSection==='appearance'?'Skin applies to all 17 pointer types':'Editing the '+target.toLowerCase()+' pointer';
  $('labGuide').textContent=layoutHelp[labSection];
  const helpers={select:'Drag a shape. Use its corner handles to resize and its round handle to rotate.',points:'Click a point or drag a box around points. Ctrl-click adds or removes points.',pen:'Click to place corners. Drag to create a curve. Press Enter to finish.',freehand:'Draw a stroke. Drawing correction below smooths it when you release.',hotspot:'Drop the click point on a visible cursor point. Red means the drop is not allowed.'};
  $('labToolInstruction').textContent=helpers[lab.tool]||helpers.select;
  $('labCanvas').parentElement.title=helpers[lab.tool]||helpers.select;
  $('labUpdateSkin').disabled=labSaving||!materials.some(m=>m.Group==='Custom'&&m.Id===project?.Skin.Material);
  organizeLabControls65();
}

if(window.isLabWindow){
  for(const id of ['labSaveSkin','labUpdateSkin']){
    const saveSkin=$(id).onclick;
    $(id).onclick=async()=>{await saveSkin();const feedback=$('labSkinFeedback').textContent.trim();if(feedback){$('labSkinActions').title=feedback;labStatus(feedback)}};
  }
}
const layoutRenderSettings=renderSettings;
renderSettings=function(){
  inspectorTab=window.isLabWindow?'color':'effects';
  layoutRenderSettings();
  if(!window.isLabWindow){
    $('inspectorTabs').hidden=true;
    for(const name of ['color','material','lighting','texture'])$('panel-'+name).hidden=true;
    $('panel-effects').hidden=false;
    const help=$('settings').querySelector('.ux-help');if(help)help.hidden=true;
    return;
  }
  if(!$('labControlRail'))return;
  $('inspectorTabs').hidden=true;
  const root=$('settings');
  const color=$('panel-color');color.hidden=false;
  // Use one optional group rather than secondary tab rows or stacked menus.
  const more=labCard('labMoreSkin','More skin controls',labSkinMore);
  for(const name of ['material','lighting','texture']){
    const panel=$('panel-'+name);panel.hidden=false;more.lastElementChild.append(panel);
  }
  more.ontoggle=()=>labSkinMore=more.open;root.append(more);
  $('panel-effects').hidden=true;
  const explanation=color.querySelector('.ux-help');if(explanation)explanation.remove();
  for(const group of color.querySelectorAll('details')){
    // Color and common surface settings remain immediately available.
    if(group.id!=='rgbCard'){group.querySelector('summary')?.setAttribute('aria-label',group.querySelector('summary').textContent)}
  }
  for(const node of root.querySelectorAll('.range-ruler-labels'))node.classList.add('lab-ruler-labels');
  organizeLabControls65();
};
function showLabSection64(section){
  if(!window.isLabWindow)return;
  labSection=section;shell.dataset.section=section;shell.classList.toggle('lab-show-animation',section==='animation');
  for(const name of ['shape','appearance','animation'])$('labSection-'+name).hidden=name!==section;
  for(const button of shell.querySelectorAll('[data-lab-section]')){
    const selected=button.dataset.labSection===section;button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));
  }
  const skin=section==='appearance';
  $('labAppearanceStage').hidden=!skin;$('labCanvas').hidden=skin;$('labPreviewDock').hidden=skin;
  $('labVisuals').classList.toggle('lab-skin-view',skin);
  (skin?$('labAppearanceStage'):$('labPreviewDockImage')).append($('labPreview'));
  const shapes=document.querySelector('.lab-shapes');
  shapes.querySelector('summary').firstChild.textContent=section==='animation'?'Animation shapes':'Shapes';
  if(section==='animation')$('labAnimationShapes').append(shapes);
  else $('labShapeListHost').append(shapes);
  $('labAppearancePanel').hidden=!skin;$('labAnimationPanel').hidden=section!=='animation';
  $('labGeometryPanel').hidden=section!=='shape';
  $('labPointPanel').hidden=false;$('labShapePanel').hidden=false;
  if(skin&&project){renderSettings();syncLabSkin()}
  updateLabLayout();$('labControlScroll').scrollTop=0;
}
if(window.isLabWindow){
  const oldTop=document.querySelector('.lab-top'),oldWorkflow=document.querySelector('.lab-workflow');
  const brand=$('labWindowBrand');
  brand.innerHTML='<span>ShamonSoft</span><strong>CURSOR LAB</strong>';brand.title='Cursor Lab stays docked inside the app.';
  const nav=document.createElement('nav');nav.className='lab-section-nav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Cursor Lab sections');
  for(const button of oldWorkflow.querySelectorAll('[data-lab-section]')){
    button.textContent={shape:'Shape',appearance:'Skin',animation:'Animation'}[button.dataset.labSection];
    button.setAttribute('aria-controls','labSection-'+button.dataset.labSection);
    button.onclick=()=>showLabSection64(button.dataset.labSection);nav.append(button);
  }
  const actions=document.querySelector('.lab-actions');
  const context=document.querySelector('.lab-bar-role'),addShape=document.querySelector('.lab-bar-shape'),view=document.querySelector('.lab-bar-canvas'),selection=document.querySelector('.lab-bar-part');
  const footer=document.createElement('footer');footer.className='lab-bottom';
  const footerText=document.createElement('div');footerText.className='lab-bottom-text';footerText.innerHTML='<strong id="labScope"></strong><span>Done returns your changes to the project.</span>';
  footerText.hidden=true;footer.append(footerText);footer.hidden=true;shell.append(footer);
  oldTop.replaceChildren(brand,context,actions);
  const guide=$('labGuide');guide.className='lab-guide';oldWorkflow.remove();
  const body=document.querySelector('.lab-body'),tools=document.querySelector('.lab-tools'),inspector=document.querySelector('.lab-inspector');
  const rail=document.createElement('aside');rail.id='labControlRail';rail.className='lab-control-rail';
  body.prepend(rail);
  const contextBox=document.createElement('div');contextBox.className='lab-context';contextBox.hidden=true;
  const contextHelp=document.createElement('p');contextHelp.textContent='Shape and Animation edit this pointer. Skin applies to the whole set.';contextHelp.className='lab-small-help';contextBox.append(contextHelp);
  const scroll=document.createElement('div');scroll.id='labControlScroll';scroll.className='lab-control-scroll';rail.append(nav,contextBox,scroll);
  const sections={};
  for(const name of ['shape','appearance','animation']){const section=document.createElement('section');section.id='labSection-'+name;section.className='lab-rail-section';sections[name]=section;scroll.append(section)}
  const draw=labCard('labDrawCard','Add or draw a shape');draw.lastElementChild.append($('labTools'),addShape);
  const instructions=document.createElement('p');instructions.id='labToolInstruction';instructions.className='lab-small-help';draw.lastElementChild.append(instructions);
  const drawing=document.createElement('div');drawing.id='labDrawingControls';drawing.append(document.querySelector('.ux-correction'));draw.lastElementChild.append(drawing);
  sections.shape.append(draw);
  const listHost=document.createElement('div');listHost.id='labShapeListHost';listHost.append(document.querySelector('.lab-shapes'));sections.shape.prepend(listHost);
  const geometry=$('labGeometryPanel'),shapePanel=$('labShapePanel'),pointPanel=$('labPointPanel');
  const groups=[...shapePanel.children];const clickPoint=groups.find(n=>n.querySelector('#labHotX')),properties=groups.find(n=>n.querySelector('#labOperation'));
  properties.open=false;properties.querySelector('summary').textContent='Selected shape';
  selection.className='lab-selection-card';properties.querySelector('summary').after(selection);
  // Contextual shape/point editors share one location; selecting Edit points swaps them.
  const object=document.createElement('div');object.id='labObjectControls';object.append(properties);
  const points=labCard('labPointControls','Points & curves');points.lastElementChild.append(pointPanel);pointPanel.querySelector('#labCurveGroup').open=true;
  const pointHint=document.createElement('p');pointHint.id='labPointHint';pointHint.className='lab-small-help';pointHint.textContent='Choose Edit points above, then select a point on the canvas to edit its position or curve.';points.prepend(pointHint);
  shapePanel.replaceChildren(object,points);geometry.append(shapePanel);sections.shape.append(geometry);
  clickPoint.open=false;clickPoint.querySelector('summary').textContent='Click point (hotspot)';sections.shape.append(clickPoint);
  const pointHelp=document.createElement('p');pointHelp.className='lab-small-help';pointHelp.textContent='The gold marker is where Windows clicks. Keep it on the visible cursor.';clickPoint.querySelector('summary').after(pointHelp);
  const viewCard=labCard('labCanvasSettings','Canvas and snapping');
  sections.shape.append(viewCard);
  const showGrid=document.createElement('label');showGrid.className='check';showGrid.innerHTML='<input id="labShowGrid" type="checkbox" checked> Show grid';viewCard.lastElementChild.append(showGrid,view);
  $('labSnap').parentElement.lastChild.textContent=' Snap to grid';
  $('labGrid').innerHTML='<option value="1">Fine · 1 unit</option><option value="2" selected>Medium · 2 units</option><option value="5">Coarse · 5 units</option>';
  $('labGrid').setAttribute('aria-label','Grid spacing');$('labGrid').onchange=labDraw;$('labShowGrid').onchange=labDraw;$('labSnap').onchange=()=>{labDraw();labStatus($('labSnap').checked?'Snap is on. Positions follow the selected grid spacing.':'Snap is off. Shapes and points move freely.')};
  setLabel('labZoomOut','-');setLabel('labFit','Fit canvas');
  const panHelp=document.createElement('p');panHelp.className='lab-small-help';panHelp.textContent='To pan a zoomed canvas, hold Alt and drag or use the middle mouse button.';viewCard.lastElementChild.append(panHelp);sections.shape.append(viewCard);
  const extra=labCard('labDesignTools','Other design options');
  const copy=document.createElement('button');copy.textContent='Copy to another pointer type…';copy.onclick=()=>showRoleSaveDialog(false);
  const fresh=document.createElement('button');fresh.textContent='Start another design…';fresh.onclick=()=>{if(lab.dirty&&!confirm('Start another design? Choose Done first to keep your current Lab edits.'))return;showLabStartPicker(lab.role)};
  extra.lastElementChild.append(copy,fresh);sections.shape.append(extra);
  const skinStart=labCard('labSkinStart','Starting skin');const skinPreview=document.querySelector('.lab-skin-preview');
  skinPreview.querySelector('label').textContent='Choose a starting skin';skinStart.lastElementChild.append($('labSkin'));sections.appearance.append(skinStart);
  sections.appearance.append($('labAppearancePanel'));
  const reuse=labCard('labReuseSkin','Save a reusable skin');reuse.lastElementChild.append($('labSkinActions'));sections.appearance.append(reuse);
  $('labSkinActions').querySelector('p').textContent='Optional: keep this look in My skins so you can reuse it in other projects.';
  const motion=labCard('labMotionCard','Movement');motion.lastElementChild.append($('labAnimationPanel'));sections.animation.append(motion);
  const animationShapes=document.createElement('div');animationShapes.id='labAnimationShapes';sections.animation.append(animationShapes);
  const animatedHelp=document.createElement('p');animatedHelp.className='lab-small-help';animatedHelp.textContent='Use the checkbox beside each shape when Apply to is set to Checked shapes.';sections.animation.append(animatedHelp);
  const visuals=document.createElement('section');visuals.id='labVisuals';visuals.className='lab-visuals';
  body.append(visuals);
  const canvas=$('labCanvas').parentElement;const oldCanvasFooter=document.querySelector('.lab-canvas-footer');
  const dock=document.createElement('aside');dock.id='labPreviewDock';dock.className='lab-preview-dock';dock.innerHTML='<h2>Live preview</h2><strong id="labPreviewTarget">Normal pointer</strong><div id="labPreviewDockImage"></div><p id="labSizeNote"></p><p class="lab-small-help">This is how your skin and animation look together.</p>';
  dock.querySelector('#labPreviewDockImage').append($('labPreview'));
  visuals.append(canvas,dock);
  const canvasBar=document.createElement('div');canvasBar.className='lab-canvas-header';canvasBar.innerHTML='<strong>Shape canvas</strong>';canvasBar.append($('labReadout'));canvas.prepend(canvasBar);
  const status=$('labStatus');status.classList.add('lab-inline-status');oldCanvasFooter.remove();
  // The canvas becomes the full-sized look preview on Skin; controls stay in the rail.
  $('labAppearanceStage').querySelector('strong').textContent='Live skin preview';
  guide.hidden=true;footer.append(guide);shell.append(status);
  body.replaceChildren(rail,visuals);tools.remove();inspector.remove();
  const originalSelection64=updateLabSelection;
  updateLabSelection=function(){originalSelection64();updateLabLayout()};
  const oldTool64=labTool;
  labTool=function(tool){oldTool64(tool);updateLabLayout()};
  showLabInspector=function(tab){
    if(tab==='animation'){showLabSection64('animation');return}
    if(tab==='points'&&!['points','pen','freehand'].includes(lab.tool))labTool('points');
    else if(tab==='shape'&&lab.tool==='points')labTool('select');
    updateLabLayout();
  };
  showUnifiedSection=showLabSection64;
  showLabSection64(window.initialLabSection==='appearance'?'appearance':'shape');
  if(project)renderSettings();
  organizeLabControls65();
}

if(!window.isLabWindow){
  const menu=$('projectMenu')?.querySelector('.ux-menu-items');
  setLabel('resumeSession','Continue last workspace');if(menu)menu.append($('resumeSession'));
}
// Routine feedback is available on hover; actionable problems still appear as a top notification.
if(window.isLabWindow){
  const previousLabStatus65=labStatus;
  labStatus=function(text){
    previousLabStatus65(text);
    const important=/drop the click point|choose an actual|no cursor point|finish placing|could not|cannot|unavailable|failed|unsafe|no visible|lose.*click point|keep part|need to|unlock|enter a name|choose another|add a separate|turn off|only move|at least|checking.*safety|click point (?:aligned|is already)/i.test(text||'');
    $('labStatus').hidden=!important;
    $('labWindowBrand').title=text||'Cursor Lab stays docked inside the app.';
  };
}
openSkinCreator=function(){
  if(window.isLabWindow)showLabSection64('appearance');
  else if(!commandBusy&&project)openLab(role,false,'appearance');
};
$('createSkin').onclick=openSkinCreator;
for(const topic of HELP_TOPICS){
  topic.body=topic.body.replaceAll('Shape, Appearance and Animation','Shape, Skin and Animation').replaceAll('Cursor Lab → Appearance','Cursor Lab → Skin').replaceAll('Cursor Lab → Appearance','Cursor Lab → Skin').replaceAll('Open Appearance and enable','Open Skin and enable').replaceAll('The last workspace reopens automatically, including unsaved edits; it does not apply anything to Windows at startup.','Startup opens Classic. Continue last workspace in More project options restores your last setup, including unsaved edits. Saved projects keep their original designs.');
  topic.body=topic.body.replaceAll('edit its Appearance inside Cursor Lab','edit Skin inside Cursor Lab').replaceAll('adjust the shared live preview with controls on the right','adjust the shared live preview with controls in the sidebar');
  if(topic.id==='lab')topic.body='<p>Cursor Lab has three sections: Shape, Skin and Animation. All controls are in the left sidebar. The canvas and live preview are on the right. Pointer type is centered in the header. Undo, Redo, Done and Close stay at the top right. Lab fills the app workspace and cannot be dragged separately. Hover a control for guidance.</p><p>In Shape, add a ready-made shape or use Select &amp; move, Edit points, Curve pen or Freehand. The Shapes card comes first. Cards start collapsed; expand a heading to reveal its controls. The shape list keeps visibility, names, locking and order in one place. Edit points reveals the point and curve controls in the same sidebar. Freehand reveals Drawing correction.</p><p>Click point (hotspot) holds the gold marker controls. Show points reveals the visible anchors. Move click point accepts only actual anchor points. A red candidate cannot be dropped; it turns gold when it snaps within 12 screen pixels of an eligible point. Align to cursor selects the nearest eligible point, including when the marker is inside a filled shape. Escape cancels a drag; Undo and Redo restore completed moves. Hidden shapes, cutouts and moving decorative targets are excluded from snapping. Canvas and snapping changes both the visible grid spacing and how positions snap. Turn Snap off to move freely. Alt-drag or middle-drag pans a zoomed view; Fit canvas resets it.</p><p>Skin changes the whole set’s appearance. More skin controls contains detailed lighting and texture. Animation changes movement for the selected pointer. Done returns all edits to the project; Save project keeps a named copy.</p>';
}


// Main chooses and applies a set; Lab owns every detailed design edit.
if(!window.isLabWindow){
  document.querySelector('.roles-pane .ux-pane-heading').textContent='Desktop effects';
  $('createSkin').textContent='Edit skin';$('createSkin').title='Customize this look and save reusable skins in Cursor Lab → Skin.';
  $('updateSkin').hidden=true;
  document.querySelector('.skin-create-bar span').hidden=true;
  $('resetHotspot').hidden=true;
  $('setHotspot').textContent='Edit click point';$('setHotspot').title='Open Cursor Lab at Click point (hotspot) to drag, snap or reset it.';
  $('setHotspot').onclick=()=>{if(!commandBusy&&project)openLab(role,false,'hotspot')};
  const cancelBefore69=cancelHotspot;cancelHotspot=function(){cancelBefore69();$('setHotspot').textContent='Edit click point'};
  // Preview stays read-only. Legacy override data is shown in Lab by the host.
  $('preview').onclick=null;
  const stateBefore69=updateFeatureState;
  updateFeatureState=function(){stateBefore69();for(const id of ['setHotspot'])$(id).disabled=commandBusy||!project;};
  if(project){renderSettings();updateFeatureState()}
}else{
  let initialFocus69=true;
  const loadBefore69=loadLabRole;
  loadLabRole=async function(selectedRole){
    await loadBefore69(selectedRole);
    if(!lab.design||!initialFocus69)return;
    initialFocus69=false;
    if(window.initialLabSection==='animation')showLabSection64('animation');
    if(window.initialLabSection==='hotspot'){
      showLabSection64('shape');
      const card=$('labHotX').closest('details');card.open=true;
      $('labShowHotspotPoints').checked=true;lab.showHotspotPoints=true;labTool('hotspot');labDraw();
      requestAnimationFrame(()=>card.scrollIntoView({block:'nearest'}));
    }
  };
}
for(const topic of HELP_TOPICS){
  if(topic.id==='start')topic.body='<p>Choose a cursor design on the left and a skin from the middle library. Select a pointer to preview it; choose its pencil to edit the shape.</p><p>Cursor Lab contains Shape, Skin and Animation. Skin changes the whole set; Shape, Animation and Click point (hotspot) edit the selected pointer. Use Edit skin or the Lab shortcuts to open the right section directly. Done returns edits to your project; Save project keeps a named copy.</p><p>The main workspace controls preview size, background, Desktop effects, projects, checking, export and Windows installation. Use in Windows applies the cursor set.</p>';
  if(topic.id==='skins')topic.body='<p>Choose a skin from the main Skin Library, then choose Edit skin to customize it in Cursor Lab → Skin. Starting skin inside Lab selects from the same library.</p><p>Skin contains colors, transparency, animated colors (RGB), surface, lighting and texture. These settings apply to the whole set. Save a new skin and Update selected skin are here too; built-in skins remain protected.</p><p>Done keeps edits in the current project. Saving a named skin makes the look reusable; Save project stores the complete cursor set.</p>';
  if(topic.id==='rgb')topic.body=topic.body.replaceAll('Open Color','Open Cursor Lab → Skin').replaceAll('Open Appearance','Open Cursor Lab → Skin').replaceAll('Open Skin','Open Cursor Lab → Skin');
  if(topic.id==='hotspot'||topic.id==='click')topic.body='<p>The click point (hotspot) is where Windows registers a click. Show click point in the main workspace displays it; Edit click point opens its controls in Cursor Lab → Shape.</p><p>Expand Click point (hotspot) to use Show points, coordinates, Move click point, Align to cursor and Reset click point. Move click point supports dragging and snapping to nearby eligible points. Reset chooses the current eligible point nearest the original designed click point. Older projects with a separate click-point override show the actual saved position. Undo and Redo include these edits; Done keeps them.</p>';
  if(topic.id==='lab')topic.body+='<p>Main workspace shortcuts open Shape, Skin, Animation or Click point directly. Reset click point is in the hotspot card. Detailed skin edits and reusable skin saving live only in Lab. Desktop effects remain in the main workspace and differ from pointer design animation.</p>';
  if(topic.id==='projects')topic.body=topic.body.replaceAll('Save role to project','Done').replaceAll('commits the edited geometry to the custom theme','returns Shape, Skin and Animation edits to the current project');
}

const customHelp69=HELP_TOPICS.find(t=>t.id==='custom');if(customHelp69){customHelp69.body='<p>Choose a starting skin in the main library, then choose Edit skin. Customize colors, RGB, surface, lighting and texture in Cursor Lab → Skin.</p><p>Expand Save skin, enter a unique reusable skin name and choose Save appearance as a skin. To replace a selected custom skin, choose Save changes to this skin. Built-in skins are protected. Done keeps edits in the project; Save project stores the complete cursor set.</p><p>Previously saved projects and exported cursor sets keep their own settings.</p>';customHelp69.label='Open Skin in Cursor Lab'}

for(const topic of HELP_TOPICS){
  if(topic.id==='start')topic.body=topic.body.replace('or the Lab shortcuts','or the pointer pencil').replace(' to open the right section directly',' to open Lab');
  if(topic.id==='lab')topic.body=topic.body.replace('Main workspace shortcuts open Shape, Skin, Animation or Click point directly.','The pointer pencil opens Shape; Edit skin opens Skin; Edit click point opens the hotspot card. Select Animation inside Lab.');
  if(['click','lab','shortcuts'].includes(topic.id))topic.body+='<p>New click-point placements must land on an eligible anchor point, never an arbitrary spot on a line or fill. During a drag the marker is red until it snaps to a point, then gold. An invalid drop keeps the previous position without adding an Undo step. Snapping uses 12 screen pixels regardless of the grid or zoom. Arrow keys move between points; coordinates snap to a nearby point or keep the previous value. Align and Reset choose an eligible point. Hidden shapes, cutouts and moving animation targets cannot supply click points.</p>';
}

const shortcuts610=HELP_TOPICS.find(t=>t.id==='shortcuts');if(shortcuts610)shortcuts610.body=shortcuts610.body.replace('Arrow keys: nudge selected Lab points/shapes or the click point; Shift multiplies the step by five.','Arrow keys: nudge selected Lab points/shapes (Shift multiplies the step by five), or choose another eligible click point.');

// Save acknowledgments must never replace edits made after their snapshot.
let projectSaving=false,projectSavePromise=null,workspaceSavePromise=null,workspaceClosing=false,projectCommandPromise=null;
const healthProjectChrome=updateProjectChrome;
const healthDisabledControls=new Map();
function healthProjectLocks(){
  for(const id of ['saveProject','saveAsProject','newProject','importProject','exportProject','showProjects','labButton','applyWindows']){
    const button=$(id);if(!button)continue;
    if(projectSaving||workspaceClosing){if(!healthDisabledControls.has(button))healthDisabledControls.set(button,button.disabled);button.disabled=true}
    else if(healthDisabledControls.has(button)){button.disabled=healthDisabledControls.get(button);healthDisabledControls.delete(button)}
  }
}
updateProjectChrome=function(){healthProjectChrome();healthProjectLocks()};
function healthOperationBlocked(){if(!projectSaving&&!workspaceClosing)return false;setStatus(workspaceClosing?'Saving the workspace before closing…':'Please wait for the project save to finish.');return true}
saveCurrent=async function(asCopy=false){
  if(commandBusy||!project||healthOperationBlocked())return;
  projectSaving=true;healthProjectLocks();
  let finish;projectSavePromise=new Promise(resolve=>finish=resolve);
  try{
    const existing=activeProject(),name=asCopy||!existing?await askProjectName(asCopy?'Save Project As':'Save Project',asCopy&&existing?existing.Name+' copy':project.Name):existing.Name;
    if(!name)return;
    clearTimeout(workspaceSaveTimer);
    if(workspaceSavePromise)await workspaceSavePromise;
    const epoch=workspaceEpoch,token=revision,snapshot=clone(project);
    const result=await call(asCopy?'saveProjectAs':'saveProject',{name},snapshot);
    if(epoch!==workspaceEpoch){queueWorkspaceSave();return}
    projects=result.projects||projects;currentProjectId=result.currentProjectId;
    savedProjectSnapshot=clone(result.project);
    if(token===revision){project=clone(result.project);committed=clone(project)}
    else project.Name=result.project.Name;
    renderProjectLibrary();updateState();
    queueWorkspaceSave();
    setStatus(token===revision?'Project saved.':'Project snapshot saved. Your newer edits are still unsaved.');
  }catch(error){setStatus(error.error||error.message||'Project could not be saved.',true)}
  finally{projectSaving=false;finish();projectSavePromise=null;renderControls();updateState()}
};
const healthOpenLab=openLab;openLab=async function(...args){if(!window.isLabWindow&&healthOperationBlocked())return;return healthOpenLab(...args)};
const healthCommand=command;command=async function(...args){if(healthOperationBlocked())return null;const pending=healthCommand(...args);projectCommandPromise=pending;try{return await pending}finally{if(projectCommandPromise===pending)projectCommandPromise=null}};
const healthQueueWorkspace=queueWorkspaceSave;
queueWorkspaceSave=function(){if(workspaceClosing)return;return healthQueueWorkspace()};
async function flushWorkspaceForClose(){
  if(window.isLabWindow||workspaceClosing)return;
  workspaceClosing=true;clearTimeout(workspaceSaveTimer);
  document.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=true);
  setStatus('Saving the workspace before closing…');
  try{
    // Cancel an unanswered naming prompt so exit cannot wait forever for it.
    if(projectSaving&&!$('nameOverlay').hidden)$('cancelName').onclick?.();
    if(projectSavePromise)await projectSavePromise;
    if(projectCommandPromise)await projectCommandPromise;
    if(workspaceSavePromise)await workspaceSavePromise;
    await call('saveWorkspace',{},clone(project));
    window.chrome.webview.postMessage({id:0,action:'workspaceCloseReady'});
  }catch(error){
    workspaceClosing=false;document.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=false);
    renderControls();updateState();
    setStatus(error.error||error.message||'The workspace could not be saved. The app will stay open.',true);
    window.chrome.webview.postMessage({id:0,action:'workspaceCloseFailed'});
  }
}
for(const type of ['click','input','change','keydown','pointerdown'])document.addEventListener(type,event=>{if(workspaceClosing){event.preventDefault();event.stopImmediatePropagation()}},true);
// Project dialogs follow the same keyboard rules as the Help dialogs.
const healthDialogFocus=new Map();
for(const overlay of document.querySelectorAll('.project-overlay')){
  new MutationObserver(()=>{
    if(!overlay.hidden){healthDialogFocus.set(overlay,document.activeElement);overlay.querySelector('input:not([readonly]),button,textarea')?.focus()}
    else{const before=healthDialogFocus.get(overlay);if(before?.isConnected&&!before.closest('[hidden]'))before.focus();healthDialogFocus.delete(overlay)}
  }).observe(overlay,{attributes:true,attributeFilter:['hidden']});
}
document.addEventListener('keydown',event=>{
  const overlay=[...document.querySelectorAll('.project-overlay:not([hidden])')].at(-1);if(!overlay)return;
  if(event.key==='Escape'){
    event.preventDefault();event.stopImmediatePropagation();
    if(overlay.id==='nameOverlay')$('cancelName').click();
    else if(overlay.id==='projectsOverlay'){$('projectsOverlay').hidden=true;$('showProjects').focus()}
    else if(overlay.id==='licensesOverlay')closeLicenses();
    return;
  }
  if(event.key==='Tab'){
    const items=[...overlay.querySelectorAll('button,input,select,textarea,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length);
    if(!items.length)return;
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){event.preventDefault();first.focus()}
  }
},true);
if(!window.isLabWindow){
  for(const topic of HELP_TOPICS)if(topic.id==='projects')topic.body+='<p>Saving keeps its captured snapshot; edits made while saving remain unsaved and retain Undo. Closing the app saves the latest recovery workspace before exiting. This does not replace Save project.</p><p>Unavailable project entries keep their original files. Use the displayed file location to restore a backup or request help. The app does not delete or overwrite the damaged file.</p>';
}

// Canvas tools are explicit modes; preferences retain their own state.
if(window.isLabWindow){
  const modeTool=labTool;
  function syncModeButtons(){
    document.querySelectorAll('[data-lab-tool]').forEach(button=>{
      const active=button.dataset.labTool===lab.tool;
      button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));
    });
    const active=lab.tool==='hotspot';$('labSetHot').classList.toggle('selected',active);$('labSetHot').setAttribute('aria-pressed',String(active));
  }
  labTool=function(tool){modeTool(tool);syncModeButtons();if(tool==='none'){labStatus('Choose a tool to edit the canvas.');$('labToolInstruction').textContent='Choose a tool to edit. Click its button again or press Escape to turn it off.'}};
  function releaseCanvasMode(){
    if(lab.drag){$('labCanvas').onpointercancel?.();lab.drag=null}
    labTool('none');
  }
  document.querySelectorAll('[data-lab-tool]').forEach(button=>button.onclick=()=>{
    const tool=button.dataset.labTool; if(lab.tool===tool){releaseCanvasMode();return}
    releaseCanvasMode();labTool(tool);$('labDrawCard').open=true;
  });
  $('labSetHot').onclick=()=>{
    if(lab.tool==='hotspot'){releaseCanvasMode();return}
    releaseCanvasMode();lab.showHotspotPoints=true;$('labShowHotspotPoints').checked=true;labTool('hotspot');
  };
  const sectionMode=showLabSection64;showLabSection64=function(section){releaseCanvasMode();return sectionMode(section)};
  function modeCard(){return lab.tool==='hotspot'?$('labSetHot').closest('details'):['points'].includes(lab.tool)?$('labPointControls'):['select','pen','freehand','pan'].includes(lab.tool)?$('labDrawCard'):null}
  // The point editor is a continuation of the Edit points tool's drawing card.
  function inModeCard(target){const card=target.closest?.('details');if(!card)return true;const owner=modeCard();return !owner||owner.contains(card)||card.contains(owner)||(lab.tool==='points'&&$('labDrawCard').contains(card))}
  for(const event of ['pointerdown','focusin'])$('labControlRail').addEventListener(event,e=>{if(!inModeCard(e.target))releaseCanvasMode()},true);
  $('labControlRail').addEventListener('toggle',e=>{const owner=modeCard();if(owner&&!e.target.open&&(e.target===owner||e.target.contains(owner)))releaseCanvasMode()},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lab.tool!=='none'&&($('labContextMenu')?.hidden!==false)&&!document.querySelector('.project-overlay:not([hidden])')){releaseCanvasMode();e.preventDefault();e.stopImmediatePropagation()}},true);
  syncModeButtons();
}

// One combined selector keeps the family and pointer context together.
if(window.isLabWindow){
  const field=$('labTemplate').parentElement;field.querySelector('label').hidden=true;$('labTemplate').hidden=true;
  const choose=document.createElement('button');choose.id='labChooseContext';choose.type='button';choose.setAttribute('aria-haspopup','dialog');choose.setAttribute('aria-expanded','false');field.append(choose);
  const menu=document.createElement('section');menu.id='labContextMenu';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Choose family and pointer type');
  menu.innerHTML='<div class="context-menu-title">Choose what to edit<button type="button" id="labContextClose" aria-label="Close choice menu">Close</button></div><div class="context-menu-columns"><div><strong>Family</strong><div id="labContextFamilies"></div></div><div><strong>Pointer type</strong><div id="labContextRoles"></div></div></div>';
  shell.append(menu);let candidate=null,pendingFamily=null,contextBusy=false;
  const currentFamily=()=>project.CustomFamilyId?'custom:'+project.CustomFamilyId:project.FamilyId;
  const familyChoices=()=>[...families.map(f=>({id:f.Id,name:f.Name})),...customFamilies.map(f=>({id:'custom:'+f.Id,name:f.Name}))];
  function syncContext(){if(!project){choose.textContent='Choose family and pointer';choose.disabled=true;return}choose.textContent='Editing: '+(familyChoices().find(f=>f.id===currentFamily())?.name||project.FamilyId)+' › '+roleNames[roleIds.indexOf(lab.role)];choose.disabled=contextBusy||labSaving}
  function closeContext(){thumbnailEpoch++;menu.hidden=true;choose.setAttribute('aria-expanded','false');choose.focus()}
  let thumbnailEpoch=0;
  function choiceThumbnail(button,family,pointer,queue){
    const image=document.createElement('img');image.alt='';image.width=40;image.height=40;image.className='context-thumbnail';button.prepend(image);button.setAttribute('aria-label',button.textContent);queue.push({image,family,pointer});
  }
  async function loadChoiceThumbnails(queue,epoch){
    // Bound native rendering work; stale menu responses cannot replace a newer selection.
    let cursor=0;
    async function worker(){while(epoch===thumbnailEpoch&&!menu.hidden&&cursor<queue.length){const item=queue[cursor++];try{
      const result=await call('previewLabChoice',{family:item.family,role:item.pointer,draftRole:lab.role,design:item.family===currentFamily()&&item.pointer===lab.role?clone(lab.design):null},clone(project));
      if(epoch===thumbnailEpoch&&item.image.isConnected){item.image.src=result.image;item.image.classList.add('ready')}
    }catch(error){if(epoch===thumbnailEpoch){item.image.classList.add('failed');item.image.title='Preview unavailable';item.image.alt='Preview unavailable'}}}}
    await Promise.all([worker(),worker()]);
  }
  function renderContext(){
    const queue=[],epoch=++thumbnailEpoch;
    $('labContextFamilies').replaceChildren();$('labContextRoles').replaceChildren();
    for(const family of familyChoices()){
      const button=document.createElement('button');button.type='button';button.textContent=family.name;button.dataset.contextFamily=family.id;button.setAttribute('aria-pressed',String(family.id===candidate));button.classList.toggle('selected',family.id===candidate);
      choiceThumbnail(button,family.id,'Arrow',queue);button.onclick=()=>{candidate=family.id;renderContext();$('labContextFamilies').querySelector('[data-context-family="'+CSS.escape(candidate)+'"]').focus()};$('labContextFamilies').append(button);
    }
    roleIds.forEach((id,i)=>{const button=document.createElement('button');button.type='button';button.textContent=roleNames[i];button.dataset.contextRole=id;button.setAttribute('aria-pressed',String(candidate===currentFamily()&&id===lab.role));button.classList.toggle('selected',candidate===currentFamily()&&id===lab.role);choiceThumbnail(button,candidate,id,queue);button.onclick=()=>requestContext(candidate,id);$('labContextRoles').append(button)});
    // Run after the opener has made the menu visible.
    queueMicrotask(()=>loadChoiceThumbnails(queue,epoch));
  }
  choose.onclick=()=>{if(!menu.hidden){closeContext();return}candidate=currentFamily();renderContext();menu.hidden=false;choose.setAttribute('aria-expanded','true');menu.querySelector('[data-context-family][aria-pressed="true"]')?.focus()};
  $('labContextClose').onclick=closeContext;
  document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target!==choose)closeContext()},true);
  document.addEventListener('keydown',e=>{
    if(menu.hidden)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeContext()}
    if(e.key==='Tab'){const buttons=[...menu.querySelectorAll('button')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  },true);
  async function requestContext(family,next){
    if(contextBusy||labSaving)return;closeContext();if(family===currentFamily()&&next===lab.role)return;
    pendingFamily=family===currentFamily()?null:family;
    if(lab.dirty){pendingLabRole=next;$('labExitTitle').textContent='KEEP YOUR LAB CHANGES?';$('labExitMessage').textContent='Keep your current edits before switching to '+familyChoices().find(f=>f.id===family)?.name+' › '+roleNames[roleIds.indexOf(next)]+'?';$('labExitSave').textContent='Keep changes and switch';$('labExitDiscard').textContent='Discard changes and switch';$('labExitSave').disabled=!!lab.safety;$('labExitDialog').hidden=false;return}
    await switchLabRole(next);
  }
  const switchBeforeContext=switchLabRole;
  switchLabRole=async function(next){
    contextBusy=true;syncContext();const previous=clone(project),family=pendingFamily;pendingFamily=null;
    try{
      if(family){
        clearTimeout(labPersistTimer);clearTimeout(lab.timer);labTool('none');
        if(family.startsWith('custom:')){const result=await call('selectCustom',{familyId:family.slice(7)},clone(project));project=result.project}
        else{project.CustomFamilyId=null;project.FamilyId=family;project.ThemeId=family;for(const id of roleIds){project.Roles[id].Design=null;project.Roles[id].UseCustomBase=false}}
        lab.newSet=false;lab.blankSet=false;project.Validate?.();const result=await call('labCommitAppearance',{},clone(project));project=result.project;customFamilies=result.customFamilies||customFamilies;committed=clone(project);
      }
      await switchBeforeContext(next);
    }catch(error){project=previous;labStatus(error.error||error.message||'The selected family could not load.');}
    finally{contextBusy=false;syncContext()}
  };
  const finishBeforeContext=finishUnifiedLab;finishUnifiedLab=async function(...args){try{return await finishBeforeContext(...args)}finally{syncContext()}};
  const loadBeforeContext=loadLabRole;loadLabRole=async function(...args){await loadBeforeContext(...args);syncContext()};
  const cancelBeforeContext=$('labExitCancel').onclick;$('labExitCancel').onclick=()=>{pendingFamily=null;cancelBeforeContext();syncContext()};
  const closeBeforeContext=flushLabAndClose;flushLabAndClose=async function(){pendingFamily=null;$('labExitDiscard').textContent="Don't save";return closeBeforeContext()};$('labClose').onclick=flushLabAndClose;
  syncContext();
}
