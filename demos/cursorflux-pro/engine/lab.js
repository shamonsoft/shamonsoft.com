/* Cursor Lab: vector document editor. All geometry is persisted by the host library. */
let workspaceSaveTimer;
let skinQueueBusy=false;
const skinThumbnailFallbacks=new Set();
function fallbackSkinThumbnail(material){
  const settings=material.Settings||{},canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  canvas.width=canvas.height=64;
  const primary=settings.Primary||'#B8C8D5',secondary=settings.Secondary||'#415566';
  const fill=context.createLinearGradient(8,7,55,58);fill.addColorStop(0,'#FFFFFF');fill.addColorStop(.18,primary);fill.addColorStop(1,secondary);
  context.shadowColor=secondary;context.shadowBlur=5;context.shadowOffsetY=2;
  context.beginPath();context.moveTo(11,7);context.lineTo(54,38);context.lineTo(35,40);context.lineTo(47,55);context.lineTo(36,60);context.lineTo(24,44);context.lineTo(13,55);context.closePath();context.fillStyle=fill;context.fill();
  context.shadowColor='transparent';context.lineWidth=1.4;context.strokeStyle='#FFFFFF99';context.stroke();
  return canvas.toDataURL('image/png');
}
async function previewSkinThumbnail(material){
  let timeout;
  try{
    const response=await Promise.race([
      call('previewSkin',{material:material.Id}),
      new Promise((_,reject)=>{timeout=setTimeout(()=>reject({error:'The preview took too long to render.'}),12000)})
    ]);
    return response.image;
  }finally{clearTimeout(timeout)}
}
async function ensureSkinThumbnails(){
  if(window.isLabWindow||!uiReady||skinQueueBusy||!project)return;
  skinQueueBusy=true;
  try{
    while(true){
      const visible=new Set([...document.querySelectorAll('[data-skin]')].filter(el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}).map(el=>el.dataset.skin));
      const material=materials.find(item=>visible.has(item.Id)&&!skinImages.has(item.Id));
      if(!material)break;
      while(commandBusy)await new Promise(resolve=>setTimeout(resolve,100));
      let image;
      try{image=await previewSkinThumbnail(material)}
      catch(error){
        image=fallbackSkinThumbnail(material);skinThumbnailFallbacks.add(material.Id);
        setStatus('A skin preview needed a simple backup image. You can still select and use that skin.',true);
      }
      skinImages.set(material.Id,image);
      const tile=[...document.querySelectorAll('[data-skin]')].find(el=>el.dataset.skin===material.Id);
      if(tile){tile.querySelector('img').src=image;tile.classList.toggle('skin-preview-fallback',skinThumbnailFallbacks.has(material.Id));if(skinThumbnailFallbacks.has(material.Id))tile.title='Preview backup image. Select this skin to use its full render.'}
    }
  }catch(e){setStatus(e.error||'A material thumbnail could not load.',true)}
  finally{skinQueueBusy=false}
}
document.querySelector('.skin-scroll')?.addEventListener('scroll',()=>ensureSkinThumbnails(),{passive:true});
function queueWorkspaceSave(){
  if(window.isLabWindow)return;
  clearTimeout(workspaceSaveTimer);const epoch=workspaceEpoch;
  workspaceSaveTimer=setTimeout(async()=>{
    if(!project||commandBusy||epoch!==workspaceEpoch)return;
    try{
      if(workspaceSavePromise)await workspaceSavePromise;
      if(epoch!==workspaceEpoch||workspaceClosing)return;
      workspaceSavePromise=call('saveWorkspace',{},clone(project));
      const r=await workspaceSavePromise;
      if(epoch!==workspaceEpoch)return;
      if(r.materials){materials=r.materials;renderCatalog()}
    }catch(e){if(epoch===workspaceEpoch)setStatus(e.error||'Settings could not be saved.',true)}finally{workspaceSavePromise=null}
  },700);
}
const lab={design:null,role:'Arrow',familyId:null,newSet:false,blankSet:false,selected:-1,node:-1,tool:'select',history:[],future:[],zoom:1,panX:0,panY:0,drag:null,dirty:false,rev:0,timer:null,previewBusy:false,pendingPreview:false,snapshot:null,penPath:-1,previewFrames:[],previewDuration:1200,previewStart:0,previewIndex:-1,previewRaf:0,safety:'Checking cursor safety…'};
lab.pointSelection=[];lab.hotspotSelected=false;lab.showHotspotPoints=false;
const node=(x,y)=>({X:x,Y:y,In:null,Out:null,Smooth:false});
const pathId=()=>crypto.randomUUID().replaceAll('-','');
function ensureDesignAnimation(){
  if(!lab.design.Animation)lab.design.Animation={Preset:'None',Speed:50,Intensity:50,Direction:'Forward',Loop:true,Target:'All',TargetPathIds:[],AxisAngle:0};
  if(lab.design.Animation.Preset==='Color Cycle')lab.design.Animation.Preset='None';
  if(!Number.isFinite(Number(lab.design.Animation.AxisAngle)))lab.design.Animation.AxisAngle=0;
  const a=lab.design.Animation;
  if(!a.AxisStart||!a.AxisEnd){
    const angle=Number(a.AxisAngle)*Math.PI/180,dx=Math.cos(angle)*40,dy=Math.sin(angle)*40;
    a.AxisStart={X:50-dx,Y:50-dy};a.AxisEnd={X:50+dx,Y:50+dy};
  }
  for(const path of lab.design.Paths)if(!path.Id)path.Id=pathId();
  const valid=new Set(lab.design.Paths.map(path=>path.Id));
  lab.design.Animation.TargetPathIds=(lab.design.Animation.TargetPathIds||[]).filter(id=>valid.has(id));
  return lab.design.Animation;
}
const labButton=document.createElement('button');labButton.textContent='Cursor Lab';labButton.title='Create a cursor set from an existing theme';labButton.onclick=()=>openLab(role,false);document.querySelector('.mast-right').prepend(labButton);
const shell=document.createElement('section');shell.id='cursorLab';shell.className='lab-shell';shell.hidden=true;
shell.innerHTML=`
<div class="lab-top lab-workspace-bar" aria-label="Cursor Lab workspace controls">
<div class="lab-window-brand" id="labWindowBrand">CURSOR LAB</div>
<div class="lab-bar-field lab-bar-role"><label for="labTemplate">Pointer type</label><select id="labTemplate"></select></div>
<div class="lab-bar-field lab-bar-shape"><label for="labPart">Add shape</label><select id="labPart"></select></div>
<div class="lab-bar-canvas"><label class="check"><input id="labSnap" type="checkbox" checked> Snap</label><select id="labGrid" aria-label="Canvas grid size"><option value="1">1 unit grid</option><option value="2" selected>2 unit grid</option><option value="5">5 unit grid</option></select><div class="lab-canvas-actions"><button id="labZoomOut" title="Zoom out">−</button><button id="labZoomIn" title="Zoom in">+</button><button id="labFit" title="Fit cursor canvas">Fit</button></div></div>
<div class="lab-bar-part"><div class="lab-bar-part-name"><strong id="labSelectionName" aria-describedby="labSelectionDetail">No shape selected</strong><button id="labLockSelected" title="Protect the selected shape from accidental edits">Lock</button></div><small class="lab-sr-only" id="labSelectionDetail">Choose a shape on the canvas or in the list.</small></div>
<div class="lab-actions"><button id="labUndo">Undo</button><button id="labRedo">Redo</button><button id="labSave" class="primary">Save role to project</button><button id="labClose">Close lab</button></div>
</div>
<div class="lab-body">
<aside class="lab-tools">
<div class="lab-tool-scroll">
<section class="lab-skin-preview"><label for="labSkin">Skin for the whole set</label><select id="labSkin"></select><img class="lab-preview" id="labPreview" alt="Rendered cursor design"></section>
<div class="lab-tool-grid" id="labTools"></div>
</div><details class="lab-shapes"><summary title="Each row is a cursor part. Use the padlock to protect its points while editing other parts.">Shapes</summary><span id="labShapeCount" hidden></span><div id="labLayers"></div><div class="lab-tool-grid"><button id="labDuplicate">Duplicate</button><button id="labDelete">Delete</button><button id="labUp">Move up</button><button id="labDown">Move down</button></div></details>
</aside>
<div class="lab-canvas-wrap"><svg id="labCanvas" viewBox="-10 -10 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="Editable cursor vector canvas" tabindex="0"></svg><div class="lab-canvas-footer"><span class="lab-readout" id="labReadout">100 × 100</span><div class="lab-status" id="labStatus" role="status" aria-live="polite" hidden><span id="labStatusText"></span><button type="button" id="labDismissStatus" class="lab-dismiss" title="Close this message" aria-label="Close this message">×</button></div></div></div>
<aside class="lab-inspector"><div class="lab-tabs" role="tablist" aria-label="Lab settings"><button id="labShapeTab" class="selected" role="tab" aria-selected="true" aria-controls="labShapePanel">Shape</button><button id="labPointsTab" role="tab" aria-selected="false" aria-controls="labPointPanel">Points &amp; curves</button><button id="labAnimationTab" role="tab" aria-selected="false" aria-controls="labAnimationPanel">Animation</button></div><div class="lab-settings">
<section id="labAnimationPanel" class="lab-animation" hidden>
<strong>ANIMATION PRESET</strong>
<label>Animation</label><select id="labAnimationPreset"><option>None</option><option>Rotate</option><option>Pulse</option><option>Orbit</option><option>Float</option><option>Shimmer</option><option>Spin Axis</option><option>Blink</option></select>
<div id="labAxisControls" hidden><strong>SPIN AXIS</strong>
<label>Tip endpoint</label><div class="pair"><div><label>X</label><input id="labAxisStartX" type="number" min="0" max="99.99" step=".1"></div><div><label>Y</label><input id="labAxisStartY" type="number" min="0" max="99.99" step=".1"></div></div>
<label>Tail endpoint</label><div class="pair"><div><label>X</label><input id="labAxisEndX" type="number" min="0" max="99.99" step=".1"></div><div><label>Y</label><input id="labAxisEndY" type="number" min="0" max="99.99" step=".1"></div></div></div>
<label>Apply to</label><select id="labAnimationTarget"><option value="All">Entire design</option><option value="Selected">Checked shapes</option></select>
<label>Speed <output id="labAnimationSpeedValue">50</output></label><input id="labAnimationSpeed" type="range" min="0" max="100" value="50">
<label>Intensity <output id="labAnimationIntensityValue">50</output></label><input id="labAnimationIntensity" type="range" min="0" max="100" value="50">
<label>Direction</label><select id="labAnimationDirection"></select>
<label class="check" title="Windows animated cursors repeat continuously"><input id="labAnimationLoop" type="checkbox" checked disabled> Loop in Windows</label>
</section>
<h3>CLICK POINT (HOTSPOT)</h3><label class="check" title="Show visible cursor points without changing their shapes"><input id="labShowHotspotPoints" type="checkbox"> Show points</label><label>Attach to point</label><select id="labHotspotPoint"><option value="">Select a shape first</option></select><div class="pair"><div><label>X</label><input id="labHotX" type="number" min="0" max="99.99" step=".1"></div><div><label>Y</label><input id="labHotY" type="number" min="0" max="99.99" step=".1"></div></div><button id="labSetHot" title="Drop on an actual point. Red means an invalid drop. Arrow keys choose another point.">Move click point</button><button id="labSnapHotspot" title="Move the click point to the nearest visible shape">Align to cursor</button><button id="labResetHotspot" title="Choose the eligible point nearest the original designed click point">Reset click point</button>
<h3>SELECTED SHAPE</h3><label>How this shape combines</label><select id="labOperation"><option value="Union">Add to design</option><option value="Subtract">Cut a hole</option><option value="Intersect">Keep overlap</option><option value="Xor">Remove overlap</option></select>
<label>Part of cursor</label><select id="labChannel"><option value="Body">Body</option><option value="Detail">Detail</option><option value="Motion">Motion</option></select>
<label class="check" title="Mark a separate ornament as eligible for Float, Orbit, or Blink; never mark the clickable pointer body"><input id="labDecoration" type="checkbox"> Decorative shape</label>
<label class="check"><input id="labClosed" type="checkbox"> Closed shape (connect ends)</label>
<label>Line width</label><input id="labThickness" type="number" min=".1" max="100" step=".1" value="4">
<div class="pair"><div><label>X</label><input id="labX" type="number" step=".1"></div><div><label>Y</label><input id="labY" type="number" step=".1"></div></div>
<div class="pair"><div><label>Width</label><input id="labWidth" type="number" min=".1" max="200" step=".1"></div><div><label>Height</label><input id="labHeight" type="number" min=".1" max="200" step=".1"></div></div>
<label>Rotate (degrees)</label><input id="labAngle" type="number" min="-360" max="360" value="15"><button id="labRotate">Rotate</button>
<div class="lab-tool-grid"><button id="labMirrorX">Flip horizontally</button><button id="labMirrorY">Flip vertically</button><button id="labSymmetry">Symmetric copy</button><button id="labCenter">Center</button></div>
<h3>EDIT POINTS &amp; CURVES</h3><div class="pair"><div><label>Point X</label><input id="labNodeX" type="number" step=".1"></div><div><label>Point Y</label><input id="labNodeY" type="number" step=".1"></div></div>
<div class="lab-tool-grid"><button id="labSmooth">Smooth point</button><button id="labCorner">Corner point</button><button id="labInsert">Split segment</button><button id="labDeleteNode">Delete point</button></div>
<label>Keep drawing detail <output id="labDetailValue">75</output></label><input id="labPointDetail" type="range" min="0" max="100" value="75">
<label>Curve smoothing <output id="labSmoothValue">50</output></label><input id="labSmoothing" type="range" min="0" max="100" value="50"><button id="labSmoothPath">Smooth path</button>
<label>Taper <output id="labTaperValue">50</output></label><input id="labTaper" type="range" min="0" max="100" value="50"><button id="labOutline">Outline tapered stroke</button>
</div></aside></div>
<div class="lab-save lab-start" id="labStartDialog" hidden><section><strong>START A CURSOR SET</strong><p id="labStartGuidance">Choose a theme for roles you do not edit, or begin with an empty design.</p><div class="lab-family-grid" id="labStartFamilies"></div><label>First role to edit</label><select id="labStartRole"></select><div class="actions"><button type="button" id="labStartCancel">Cancel</button><button type="button" class="primary" id="labStartContinue">Start editing</button></div></section></div>
<div class="lab-save" id="labSaveDialog" hidden><form id="labSaveForm"><strong id="labSaveTitle">Save role to theme</strong><div id="labThemeNameRow" hidden><label>New theme name</label><input id="labThemeName" maxlength="80" placeholder="My custom theme"></div><label>Windows role</label><select id="labSaveRole"></select><p class="lab-guidance" id="labSaveGuidance">Only this role will change. Every other role continues using the selected theme.</p><p id="labSaveNote" class="lab-status"></p><div class="actions"><button type="button" id="labSaveCancel">Cancel</button><button type="submit" class="primary">Save role</button></div></form></div>
<div class="lab-save" id="labExitDialog" hidden><section><strong id="labExitTitle">KEEP YOUR LAB CHANGES?</strong><p id="labExitMessage">Your Lab edits have not been returned to the project yet.</p><div class="actions"><button type="button" id="labExitCancel">Cancel</button><button type="button" id="labExitDiscard">Don't save</button><button type="button" class="primary" id="labExitSave">Keep changes and close</button></div></section></div>
`;
document.body.appendChild(shell);
$('labTemplate').innerHTML=roleIds.map((id,i)=>`<option value="${id}">${roleNames[i]}</option>`).join('');
const labShapeGroups={
  'Basic shapes':['Rectangle','Square','Rounded rectangle','Circle','Ellipse','Triangle','Right triangle','Diamond','Line','Curve'],
  'Polygons':['Pentagon','Hexagon','Heptagon','Octagon','Trapezoid','Parallelogram','Kite'],
  'Stars and mechanical':['4-point star','5-point star','6-point star','8-point star','12-point burst','Gear','Ring'],
  'Arrows and symbols':['Arrow','Double arrow','Chevron','Cross','X cross','Lightning bolt','Speech bubble'],
  'Curved shapes':['Semicircle','Quarter circle','Arc','Crescent','Heart','Teardrop','Leaf','Shield']
};
$('labPart').innerHTML='<option value="">Choose shape…</option>'+Object.entries(labShapeGroups).map(([group,shapes])=>'<optgroup label="'+group+'">'+shapes.map(name=>'<option>'+name+'</option>').join('')+'</optgroup>').join('');
if(window.isLabWindow){document.body.classList.add('lab-window');labButton.hidden=true}
function groupLabControls(title,start,end,open=false){
  const first=$(start),last=$(end),parent=first.parentElement;
  const details=document.createElement('details');details.className='lab-group';details.open=open;
  const summary=document.createElement('summary');summary.textContent=title;details.appendChild(summary);
  parent.insertBefore(details,first);let item=first;
  while(item){const next=item.nextSibling;details.appendChild(item);if(item===last)break;item=next}
  return details;
}
// Keep technical controls, but move less-frequent settings into compact groups.
const inspector=document.querySelector('.lab-inspector');
const settings=inspector.querySelector('.lab-settings');
const groupSections=[...inspector.querySelectorAll('h3')];
for(let i=groupSections.length-1;i>=0;i--){
  const heading=groupSections[i],title=heading.textContent,details=document.createElement('details');
  details.className='lab-group';details.open=false;
  const summary=document.createElement('summary');summary.textContent=title==='SELECTED SHAPE'?'Shape properties':title==='EDIT POINTS & CURVES'?'Edit points & curves':'Click point (hotspot)';
  heading.parentElement.insertBefore(details,heading);details.appendChild(summary);
  let next=heading.nextSibling;heading.remove();
  while(next&&next.tagName!=='DETAILS'){const after=next.nextSibling;details.appendChild(next);next=after}
  if(title==='EDIT POINTS & CURVES')details.id='labCurveGroup';
}
const geometryPanel=document.createElement('section');geometryPanel.id='labGeometryPanel';
settings.insertBefore(geometryPanel,$('labAnimationPanel'));
const shapePanel=document.createElement('div');shapePanel.id='labShapePanel';shapePanel.className='lab-geometry-section';
const pointPanel=document.createElement('div');pointPanel.id='labPointPanel';pointPanel.className='lab-geometry-section';pointPanel.hidden=true;
geometryPanel.append(shapePanel,pointPanel);
for(const group of [...settings.querySelectorAll(':scope > .lab-group')]){
  (group.id==='labCurveGroup'?pointPanel:shapePanel).appendChild(group);
}
// Hotspot is the first shape control: users set the click point before refining the outline.
$('labShapeTab').onclick=()=>showLabInspector('shape');
$('labPointsTab').onclick=()=>showLabInspector('points');
$('labAnimationTab').onclick=()=>showLabInspector('animation');
function showLabInspector(tab){
  const animation=tab==='animation';$('labGeometryPanel').hidden=animation;$('labAnimationPanel').hidden=!animation;
  $('labShapePanel').hidden=tab!=='shape';$('labPointPanel').hidden=tab!=='points';
  shell.classList.toggle('lab-show-animation',animation);
  for(const [name,id] of [['shape','labShapeTab'],['points','labPointsTab'],['animation','labAnimationTab']]){
    const selected=tab===name;$(id).classList.toggle('selected',selected);$(id).setAttribute('aria-selected',String(selected));
  }
  settings.scrollTop=0;
}
$('labOperation').title='Choose whether this shape adds material, cuts a hole, or changes an overlap.';
$('labChannel').title='Choose whether this shape belongs to the body, surface detail, or moving detail.';
$('labTemplate').title='Choose which Windows cursor role to edit in this theme. Unsaved changes can be saved before switching.';
$('labPart').title='Add an editable shape to this design. Resize, rotate or edit its points after adding it.';
$('labSave').title='Save this design as the selected Windows role in the current project.';
$('labClose').title='Keep the draft and close this window. Project changes require Save role to project.';

function labStatus(text){
  const notice=$('labStatus'),message=$('labStatusText');
  message.textContent=text||'';notice.hidden=!text;notice.title=text||'';
}
$('labDismissStatus').onclick=()=>labStatus('');
function labSafety(message){
  lab.safety=message||'';
  const alignable=!!message&&!message.startsWith('Checking')&&/hotspot|click point/i.test(message)&&lab.design&&(!lab.design.HotspotSet||!clickAreaHasGeometry());
  $('labSnapHotspot').classList.toggle('recommended',!!alignable);$('labSave').disabled=!!message;$('labSave').title=message||'Done returns these changes to your project.';
}
function selectedPath(){return lab.design?.Paths[lab.selected]}
function labPointKey(ref){return ref.pathId+':'+ref.node}
function labSelectedPoints(){
  if(lab.tool!=='points'||!lab.design)return [];
  const primary=selectedPath(),valid=ref=>{const p=lab.design.Paths.find(p=>p.Id===ref.pathId);return p?.Visible&&!p.Locked&&!!p.Nodes[ref.node]};
  let refs=(lab.pointSelection||[]).filter(valid);
  if(!refs.length&&primary?.Nodes[lab.node]&&primary.Visible&&!primary.Locked)refs=[{pathId:primary.Id,node:lab.node}];
  return refs;
}
function labSelectPoints(refs){
  lab.pointSelection=[...new Map(refs.map(ref=>[labPointKey(ref),ref])).values()];
  const current=selectedPath(),primary=lab.pointSelection.find(ref=>ref.pathId===current?.Id&&ref.node===lab.node)||lab.pointSelection[0];
  lab.node=primary?.node??-1;
  if(primary)lab.selected=lab.design.Paths.findIndex(p=>p.Id===primary.pathId);
  lab.hotspotSelected=false;
}
function labPointMoveState(){
  const refs=labSelectedPoints(),ids=new Set(refs.map(ref=>ref.pathId));
  return {kind:'nodes',refs,before:clone(lab.design),originals:lab.design.Paths.filter(p=>ids.has(p.Id)).map(clone),
    hotspot:refs.some(ref=>hotspotOnNode(lab.design.Paths.find(p=>p.Id===ref.pathId),ref.node))?clone(lab.design.Hotspot):null,
    wasSafe:!lab.safety||clickAreaHasGeometry()};
}
function labMovePoints(d,dx,dy){
  // Translate each selected anchor and its handles by the SAME delta. Never
  // snap individual points separately: their relative spacing must survive.
  let minX=-Infinity,maxX=Infinity,minY=-Infinity,maxY=Infinity;
  for(const original of d.originals)for(const ref of d.refs.filter(ref=>ref.pathId===original.Id)){
    const n=original.Nodes[ref.node];if(!n)continue;
    for(const point of [n,n.In,n.Out].filter(Boolean)){
      minX=Math.max(minX,-1000-point.X);maxX=Math.min(maxX,1000-point.X);
      minY=Math.max(minY,-1000-point.Y);maxY=Math.min(maxY,1000-point.Y);
    }
  }
  dx=Math.max(minX,Math.min(maxX,dx));dy=Math.max(minY,Math.min(maxY,dy));
  if(d.hotspot){dx=Math.max(-d.hotspot.X,Math.min(99.99-d.hotspot.X,dx));dy=Math.max(-d.hotspot.Y,Math.min(99.99-d.hotspot.Y,dy))}
  for(const original of d.originals){
    const p=lab.design.Paths.find(p=>p.Id===original.Id);if(!p||p.Locked)continue;
    for(const ref of d.refs.filter(ref=>ref.pathId===p.Id)){
      const o=original.Nodes[ref.node],n=p.Nodes[ref.node];if(!o||!n)continue;
      n.X=o.X+dx;n.Y=o.Y+dy;
      for(const key of ['In','Out'])n[key]=o[key]?{X:o[key].X+dx,Y:o[key].Y+dy}:null;
    }
  }
  moveAttachedHotspot(d.hotspot,dx,dy);
}
function labCommitPointMove(d,future){
  const invalid=d.wasSafe&&(!clickAreaHasGeometry()||d.originals.some(original=>animatedDecorationOverlapsClick(lab.design.Paths.find(p=>p.Id===original.Id))));
  if(invalid||JSON.stringify(d.before)===JSON.stringify(lab.design)){
    if(invalid)lab.design=d.before;
    lab.history.pop();lab.future=future;labDraw();labInspector();
    if(invalid)labStatus('That move would leave an unsafe click point. Your previous point positions were kept.');
    return false;
  }
  labChanged();return true;
}
function labNudgeSelection(dx,dy){
  if(lab.drag)return;
  if(lab.hotspotSelected||lab.tool==='hotspot'){
    const h=lab.design.Hotspot,candidates=[];
    for(const path of hotspotPaths())for(const point of path.Nodes){
      const x=point.X-h.X,y=point.Y-h.Y;
      if(!eligibleHotspotPoint(point)||(dx&&x*dx<=.00001)||(dy&&y*dy<=.00001))continue;
      candidates.push({point,score:Math.hypot(x,y)+(dx?Math.abs(y):Math.abs(x))*2});
    }
    candidates.sort((a,b)=>a.score-b.score);
    if(candidates.length)setHotspotOnPoint(candidates[0].point);
    else labStatus('No cursor point in that direction. Choose a point or use Align to cursor.');
    return;
  }
  if(lab.tool==='points'){
    if(!labSelectedPoints().length){labStatus('Select one or more points first. Drag a box or Ctrl-click points.');return}
    const d=labPointMoveState(),future=lab.future.slice();labRemember();labMovePoints(d,dx,dy);labCommitPointMove(d,future);return;
  }
  mutatePath(p=>{const h=hotspotOnPath(p)?clone(lab.design.Hotspot):null;transformPath(p,(x,y)=>({x:x+dx,y:y+dy}));moveAttachedHotspot(h,dx,dy)});
}
function editablePath(path=selectedPath(),announce=true){
  if(!path)return false;
  if(path.Locked){if(announce)labStatus(path.Name+' is locked. Use Unlock in the selection panel or its lock button.');return false}
  return true;
}
function togglePathLock(index){
  const path=lab.design?.Paths[index];if(!path||lab.drag)return;
  labRemember();path.Locked=!path.Locked;lab.selected=index;lab.node=-1;lab.penPath=-1;
  labChanged();labStatus(path.Name+(path.Locked?' locked · protected from edits':' unlocked · ready to edit'));
}
$('labLockSelected').onclick=()=>togglePathLock(lab.selected);
const operationLabels={Union:'Add to design',Subtract:'Cut a hole',Intersect:'Keep overlap',Xor:'Remove overlap'};
function updateLabSelection(){
  const p=selectedPath(),selectedNode=p?.Nodes[lab.node],pointCount=labSelectedPoints().length;
  $('labSelectionName').textContent=pointCount>1?pointCount+' points selected':p?.Name||'No shape selected';
  $('labSelectionName').title=p?.Name||'';
  $('labSelectionDetail').textContent=p?[
    p.Locked?'Locked':p.Visible?'Editable':'Hidden',operationLabels[p.Operation]||'Add to design',
    pointCount>1?pointCount+' points selected':selectedNode?'Point '+(lab.node+1)+' of '+p.Nodes.length:p.Nodes.length+' points'
  ].join(' · '):'Choose a shape on the canvas or in the list.';
  $('labSelectionDetail').title=$('labSelectionDetail').textContent;
  $('labSelectionName').title=p?p.Name+' · '+$('labSelectionDetail').textContent:'';
  $('labLockSelected').disabled=!p;$('labLockSelected').textContent=p?.Locked?'Unlock':'Lock';
  $('labLockSelected').setAttribute('aria-pressed',String(!!p?.Locked));
  $('labLockSelected').title=p?.Locked?'Unlock this shape to edit it':'Protect this shape from movement, reshaping and deletion. Animation is unchanged.';
  $('labShapeCount').textContent=lab.design?String(lab.design.Paths.length):'';
  const help={select:'Drag to move. Corners resize; the top circle rotates. Shift constrains.',points:'Drag a box to select points. Ctrl-click adds or removes points. Drag selected points together; arrows nudge by the Snap grid, or 1 unit when Snap is off.',pen:'Click for corners; drag for curves. Enter finishes. Click the first point to close.',freehand:'Draw a stroke, then release. Its points and curves stay editable.',hotspot:'Drop on an actual point. Red means an invalid drop. Arrow keys choose another point..',pan:'Drag to move your view. The design stays in place.'};
  $('labCanvas').parentElement.title=p?.Locked&&['select','points'].includes(lab.tool)?'This shape is locked. Select another shape or use Unlock to edit it.':help[lab.tool]||'Drag to draw a '+(toolLabels[lab.tool]||'shape').toLowerCase()+'. Switch to Edit points to reshape it.';
}
function labRemember(){lastEditKey="";lab.history.push(labHistorySnapshot());if(lab.history.length>100)lab.history.shift();lab.future=[]}
function labChanged(){
  if(lab.editingSmoke){lab.dirty=true;labDraw();labInspector();return}
  lab.snapshot=clone(project);lab.dirty=true;labStatus('Your changes are being saved as a draft. Choose Done to keep these changes in your project.');labSafety('Checking cursor safety…');lab.rev++;labDraw();labInspector();labSchedulePreview();labPersist();
}
let labPersistTimer;
function labPersist(){
  clearTimeout(labPersistTimer);labPersistTimer=setTimeout(()=>saveLabDraft().catch(()=>{}),500);
}
function saveLabDraft(){
  if(!lab.design)return Promise.resolve();
  labDraft={design:clone(lab.design),role:lab.role,familyId:lab.familyId,project:clone(project)};
  const revision=lab.rev;
  return call('labDraft',{draft:labDraft},null).then(()=>{if(revision===lab.rev)labStatus(lab.dirty?'Your draft is saved. Choose Done to keep these changes in your project.':'This role is saved to your project.')}).catch(e=>{labStatus(e.error||'The draft could not be saved. Try again.');throw e});
}
async function loadLabRole(selectedRole){
  try{
    const result=await call('labOpen',{role:selectedRole,blank:lab.blankSet},clone(project));
    lab.design=result.design;lab.defaultHotspot=clone(result.defaultHotspot||result.design.Hotspot);lab.defaultHotspotSet=result.defaultHotspotSet??result.design.HotspotSet;lab.role=selectedRole;lab.familyId=project.CustomFamilyId||null;lab.snapshot=clone(project);ensureDesignAnimation();lab.entryProject=clone(project);lab.geometryBaseline=JSON.stringify(lab.design);
    lab.selected=lab.design.Paths.length?0:-1;lab.node=-1;lab.history=[];lab.future=[];lab.dirty=false;lab.penPath=-1;lab.rev++;lab.zoom=1;lab.panX=lab.panY=0;
    shell.hidden=false;labButton.disabled=true;clearAnimation();$('labTemplate').value=lab.role;
    $('labSave').textContent='Done';
    $('labSkin').innerHTML=materials.map(m=>'<option '+(m.Id===project.Skin.Material?'selected':'')+'>'+escapeHtml(m.Id)+'</option>').join('');
    labSafety('Checking cursor safety…');labTool('select');labDraw();labInspector();syncAnimationControls();guideLoadedAnimation();labSchedulePreview();
  }catch(e){setStatus(e.error||e.message||'Cursor Lab could not open.',true)}
}
let labStartFamilyId='',labStartPreviewToken=0;
async function refreshLabStartPreviews(){
  const token=++labStartPreviewToken,previewRole=$('labStartRole').value;
  document.querySelectorAll('[data-start-family] img').forEach(image=>image.removeAttribute('src'));
  for(const family of families){
    try{
      const image=await call('previewFamily',{family:family.Id,role:previewRole},clone(project));
      if(token!==labStartPreviewToken)return;
      const card=[...document.querySelectorAll('[data-start-family]')].find(item=>item.dataset.startFamily===family.Id);
      if(card)card.querySelector('img').src=image.image;
    }catch{}
  }
}
async function showLabStartPicker(selectedRole){
  labStartFamilyId=project.FamilyId||families[0]?.Id||'';
  $('labStartRole').innerHTML=roleIds.map((id,i)=>'<option value="'+id+'" '+(id===selectedRole?'selected':'')+'>'+roleNames[i]+'</option>').join('');
  const blank='<button type="button" class="lab-family-card lab-blank-card" data-start-family="__blank__" title="Start the selected role with an empty canvas"><span class="lab-blank-mark">+</span><span>Blank canvas</span></button>';
  $('labStartFamilies').innerHTML=blank+families.map(f=>'<button type="button" class="lab-family-card '+(f.Id===labStartFamilyId?'selected':'')+'" data-start-family="'+escapeHtml(f.Id)+'"><img alt=""><span>'+escapeHtml(f.Name)+'</span></button>').join('');
  const selectFamily=id=>{labStartFamilyId=id;document.querySelectorAll('[data-start-family]').forEach(card=>card.classList.toggle('selected',card.dataset.startFamily===id));$('labStartGuidance').textContent=id==='__blank__'?'Start with an empty canvas. Each Windows role must be designed before this set can be used in Windows.':'Choose a theme for roles you do not edit, or begin with an empty design.'};
  document.querySelectorAll('[data-start-family]').forEach(card=>card.onclick=()=>selectFamily(card.dataset.startFamily));
  $('labStartRole').onchange=refreshLabStartPreviews;$('labStartDialog').hidden=false;
  await refreshLabStartPreviews();
}
async function openLab(selectedRole=role,showStartPicker=false,initialSection='shape'){
  if(!window.isLabWindow){clearTimeout(workspaceSaveTimer);await call('openLabWindow',{role:selectedRole,showStartPicker,initialSection},clone(project));return}
  await loadLabRole(selectedRole);
  if(showStartPicker)await showLabStartPicker(selectedRole);
}
$('labStartCancel').onclick=async()=>{try{await call('closeLabWindow',{},null)}catch(e){labStatus(e.error||'Cursor Lab could not close')}};
$('labStartContinue').onclick=async()=>{
  const selectedRole=$('labStartRole').value;
  lab.blankSet=labStartFamilyId==='__blank__';
  const baseFamily=lab.blankSet?(families[0]?.Id||'Precision'):labStartFamilyId;
  project.CustomFamilyId=null;project.FamilyId=baseFamily;project.ThemeId=baseFamily;project.Name='My cursor set';
  for(const id of roleIds){project.Roles[id].Design=null;project.Roles[id].UseCustomBase=false}
  committed=clone(project);lab.newSet=true;$('labStartDialog').hidden=true;
  await loadLabRole(selectedRole);labStatus(lab.blankSet?'Your blank set is ready. Add your first shape when you are ready.':'Your new set is ready. '+familyName(labStartFamilyId)+' fills in roles you have not edited yet.');
};
function pathData(path){
  if(!path.Nodes.length)return '';
  let out='M '+path.Nodes[0].X+' '+path.Nodes[0].Y,n=path.Nodes.length;
  for(let i=0;i<(path.Closed?n:n-1);i++){
    const a=path.Nodes[i],b=path.Nodes[(i+1)%n],h=a.Out||a,k=b.In||b;
    out+=' C '+h.X+' '+h.Y+' '+k.X+' '+k.Y+' '+b.X+' '+b.Y;
  }
  return out+(path.Closed?' Z':'');
}
function distanceToPath(path,point){
  if(!path.Visible||path.Nodes.length<2||path.Operation==='Subtract')return {distance:Infinity,x:point.X,y:point.Y};
  const index=lab.design.Paths.indexOf(path),element=$('labCanvas').querySelector('[data-layer="'+index+'"]');
  if(!element)return {distance:Infinity,x:point.X,y:point.Y};
  const location=$('labCanvas').createSVGPoint();location.x=point.X;location.y=point.Y;
  if((path.Closed&&element.isPointInFill(location))||(!path.Closed&&element.isPointInStroke(location)))
    return {distance:0,x:point.X,y:point.Y};
  const length=element.getTotalLength(),steps=Math.max(32,Math.min(100,Math.ceil(length/2)));
  let nearest={distance:Infinity,x:point.X,y:point.Y};
  for(let i=0;i<=steps;i++){
    const candidate=element.getPointAtLength(length*i/steps),distance=Math.hypot(candidate.x-point.X,candidate.y-point.Y);
    if(distance<nearest.distance)nearest={distance,x:candidate.x,y:candidate.y};
  }
  return nearest;
}
function decorativePaths(){
  const hotspot=lab.design.Hotspot;
  return lab.design.Paths.filter(p=>p.Decoration&&p.Visible&&p.Nodes.length>=2&&distanceToPath(p,hotspot).distance>8);
}
function guidedPreset(preset){return ['Float','Orbit'].includes(preset)||(preset==='Blink'&&!['Wait','No'].includes(lab.role))}
function guideLoadedAnimation(){
  const a=ensureDesignAnimation();if(!guidedPreset(a.Preset))return;
  const before=clone(lab.design),preset=a.Preset;
  if(a.Target==='Selected')for(const p of lab.design.Paths)
    if(a.TargetPathIds.includes(p.Id)&&distanceToPath(p,lab.design.Hotspot).distance>8)p.Decoration=true;
  const selected=lab.design.Paths.filter(p=>a.TargetPathIds.includes(p.Id)&&decorativePaths().includes(p));
  if(a.Target==='All'||!selected.length){
    const candidate=decorativePaths()[0];
    if(candidate){a.Target='Selected';a.TargetPathIds=[candidate.Id]}
    else{a.Preset='None';a.Target='All';a.TargetPathIds=[];labStatus('This older animation was turned off because it needs a separate decorative shape. Add a shape, select it, then check Decorative shape to use it again.')}
  }
  if(JSON.stringify(before)!==JSON.stringify(lab.design)){
    lab.history.push(before);lab.dirty=true;labChanged();
    if(a.Preset!=="None")labStatus('This older animation now moves only a decorative shape, so the cursor click point stays safe.');
  }
}
function clickAreaHasGeometry(){
  if(!lab.design.HotspotSet)return true;
  return lab.design.Paths.some(p=>distanceToPath(p,lab.design.Hotspot).distance<=13);
}
function animatedDecorationOverlapsClick(path){
  const a=ensureDesignAnimation();
  return guidedPreset(a.Preset)&&a.Target==='Selected'&&a.TargetPathIds.includes(path.Id)&&distanceToPath(path,lab.design.Hotspot).distance<=8;
}
function hotspotPaths(){
  const animation=ensureDesignAnimation(),excluded=animation.Target==='Selected'&&guidedPreset(animation.Preset)?new Set(animation.TargetPathIds):new Set();
  return lab.design.Paths.filter(p=>p.Visible&&p.Nodes.length>=2&&p.Operation!=='Subtract'&&!excluded.has(p.Id));
}
function hotspotSnapOptions(point){return hotspotPaths().map(p=>distanceToPath(p,point)).sort((a,b)=>a.distance-b.distance)}
function nearestHotspotPoint(point,force=false){
  const matrix=$('labCanvas').getScreenCTM();let nearest=null;
  for(const path of hotspotPaths())path.Nodes.forEach((n,index)=>{
    if(!eligibleHotspotPoint(n))return;
    const dx=n.X-point.X,dy=n.Y-point.Y;
    const distance=matrix?Math.hypot(matrix.a*dx+matrix.c*dy,matrix.b*dx+matrix.d*dy):Math.hypot(dx,dy);
    if((force||distance<=12)&&(!nearest||distance<nearest.distance))nearest={x:n.X,y:n.Y,distance,path,index};
  });
  return nearest;
}
function eligibleHotspotPoint(p){return Number.isFinite(p.X)&&Number.isFinite(p.Y)&&p.X>=0&&p.Y>=0&&p.X<=99.99&&p.Y<=99.99}
function hotspotAnchorAt(point){
  return hotspotPaths().flatMap(p=>p.Nodes).find(n=>eligibleHotspotPoint(n)&&Math.hypot(n.X-point.X,n.Y-point.Y)<.00001)||null;
}
function setHotspotOnPoint(point,force=false){
  if(lab.drag)return false;
  const anchor=nearestHotspotPoint(point,force);
  if(!anchor){labInspector();labStatus('Choose an actual cursor point. The previous click point was kept.');return false}
  if(lab.design.HotspotSet&&lab.design.Hotspot.X===anchor.x&&lab.design.Hotspot.Y===anchor.y)return false;
  labRemember();lab.design.Hotspot={X:anchor.x,Y:anchor.y};lab.design.HotspotSet=true;labChanged();return true;
}
function placeHotspot(point){
  const anchor=nearestHotspotPoint({X:point.x,Y:point.y});
  // This is only a drag candidate. Drafts and previews retain the committed point.
  lab.drag.candidate=anchor?{X:anchor.x,Y:anchor.y}:{X:point.x,Y:point.y};
}
function snapHotspot(force=false){
  const anchor=nearestHotspotPoint(lab.design.Hotspot,force);if(!anchor)return false;
  if(lab.design.HotspotSet&&lab.design.Hotspot.X===anchor.x&&lab.design.Hotspot.Y===anchor.y)return false;
  lab.design.Hotspot={X:anchor.x,Y:anchor.y};lab.design.HotspotSet=true;return true;
}
function hotspotOnPath(path,tolerance=3){
  return !!(lab.design.HotspotSet&&path&&distanceToPath(path,lab.design.Hotspot).distance<=tolerance);
}
function hotspotOnNode(path,index,tolerance=3){
  const point=path?.Nodes[index],hotspot=lab.design.Hotspot;
  return !!(lab.design.HotspotSet&&point&&Math.hypot(point.X-hotspot.X,point.Y-hotspot.Y)<=tolerance);
}
function moveAttachedHotspot(original,dx,dy){
  if(!original)return;
  lab.design.Hotspot={X:Math.max(0,Math.min(99.99,original.X+dx)),Y:Math.max(0,Math.min(99.99,original.Y+dy))};
}
function bounds(p){
  if(!p?.Nodes.length)return {x:0,y:0,w:1,h:1};
  const coords=p.Nodes.flatMap(n=>[n,n.In,n.Out].filter(Boolean));
  const xs=coords.map(n=>n.X),ys=coords.map(n=>n.Y),x=Math.min(...xs),y=Math.min(...ys);
  return {x,y,w:Math.max(.1,Math.max(...xs)-x),h:Math.max(.1,Math.max(...ys)-y)};
}
function transformPath(p,fn){
  for(const n of p.Nodes){for(const pt of [n,n.In,n.Out].filter(Boolean)){const q=fn(pt.X,pt.Y);pt.X=q.x;pt.Y=q.y}}
}
function labIcon(type){
  const art=type==='eye'?'<path d="M 1 8 Q 8 -1 15 8 Q 8 17 1 8 Z"/><circle cx="8" cy="8" r="2"/>':type==='hidden'?'<path d="M 1 8 Q 8 -1 15 8 Q 8 17 1 8 Z M 2 2 L 14 14"/>':type==='locked'?'<rect x="3" y="7" width="10" height="8" rx="1"/><path d="M 5 7 V 4 A 3 3 0 0 1 11 4 V 7 M 8 10 V 12"/>':'<rect x="3" y="7" width="10" height="8" rx="1"/><path d="M 5 7 V 4 A 3 3 0 0 1 11 4 M 8 10 V 12"/>';
  return '<svg viewBox="0 0 16 16" aria-hidden="true">'+art+'</svg>';
}
function labDraw(){
  if(!lab.design)return;
  if(lab.node<0)lab.pointSelection=[];
  const selectedPoints=new Set(labSelectedPoints().map(labPointKey));
  const animation=ensureDesignAnimation();
  const span=120/lab.zoom,x=50-span/2+lab.panX,y=50-span/2+lab.panY;
  $('labCanvas').setAttribute('viewBox',x+' '+y+' '+span+' '+span);
  $('labCanvas').dataset.tool=lab.tool;
  let markup='<rect class="lab-boundary" x="0" y="0" width="100" height="100"/>';
  const gridStep=Number($('labGrid').value)||2;
  if(!$('labShowGrid')||$('labShowGrid').checked)for(let i=0;i<=100;i+=gridStep)markup+='<path data-grid-line="'+i+'" class="lab-grid '+(i%10===0?'major':'')+'" d="M '+i+' 0 V 100 M 0 '+i+' H 100"/>';
  markup+='<path class="lab-guides" d="M 50 0 V 100 M 0 50 H 100"/>';
  lab.design.Paths.forEach((p,i)=>{
    if(!p.Visible)return;
    markup+='<path data-layer="'+i+'" class="lab-layer '+(i===lab.selected?'active ':'')+(p.Locked?'locked ':'')+(p.Operation==='Subtract'?'cut':'')+'" d="'+pathData(p)+'" '+(!p.Closed?'style="fill:none;stroke-width:'+p.Thickness+'"':'')+'><title>'+escapeHtml(p.Name)+(p.Locked?' · Locked':' · '+operationLabels[p.Operation])+'</title></path>';
  });
  const drawnHotspot=lab.drag?.kind==='hotspot'?lab.drag.candidate:lab.design.Hotspot;
  if(lab.design.HotspotSet){const h=drawnHotspot;markup+='<circle class="lab-click-zone" cx="'+h.X+'" cy="'+h.Y+'" r="16"><title>Visible cursor art must stay within this click area throughout the animation.</title></circle>'}
  const h=drawnHotspot;
  if(lab.showHotspotPoints)for(const path of hotspotPaths())path.Nodes.forEach((n,index)=>{
    if(!eligibleHotspotPoint(n))return;
    markup+='<circle class="lab-hotspot-anchor" data-hotspot-anchor="'+path.Id+'-'+index+'" cx="'+n.X+'" cy="'+n.Y+'" r="'+(1.25/lab.zoom)+'"><title>'+escapeHtml(path.Name)+' · Point '+(index+1)+'</title></circle>';
  });
  const hotspotMarkup='<g class="lab-hotspot '+(lab.hotspotSelected?'selected ':'')+(lab.drag?.kind==='hotspot'&&!hotspotAnchorAt(h)?'invalid':'')+'" data-hotspot="true" transform="translate('+h.X+' '+h.Y+')"><title>Click point: drop on an actual point. Red means the drop is not allowed. Arrow keys move between points.</title><circle class="hit" r="4"/><circle r="2"/><path d="M -3 0 H 3 M 0 -3 V 3"/></g>';
  if(lab.tool!=='hotspot')markup+=hotspotMarkup;
  const p=selectedPath();
  if(lab.tool==='points'||lab.tool==='pen'){
    lab.design.Paths.forEach((shape,layer)=>{
      if(!shape.Visible||shape.Locked||(lab.tool==='pen'&&layer!==lab.selected))return;
      shape.Nodes.forEach((n,i)=>{
      if(layer===lab.selected&&i===lab.node&&selectedPoints.size<=1){
        for(const type of ['In','Out'])if(n[type]){
          const h=n[type];markup+='<path class="lab-handle" d="M '+n.X+' '+n.Y+' L '+h.X+' '+h.Y+'"/><circle class="lab-handle-point" data-handle="'+type+'" data-node="'+i+'" cx="'+h.X+'" cy="'+h.Y+'" r="'+(1.05/lab.zoom)+'"><title>Drag to bend the curve · Shift moves this handle independently</title></circle>';
        }
      }
      const selected=selectedPoints.has(labPointKey({pathId:shape.Id,node:i}))||(lab.tool==='pen'&&layer===lab.selected&&i===lab.node);
      markup+='<circle class="lab-node '+(layer===lab.selected?'selected-shape ':'')+(selected?'active selected-point':'')+'" data-point-layer="'+layer+'" data-node="'+i+'" cx="'+n.X+'" cy="'+n.Y+'" r="'+(1.25/lab.zoom)+'"><title>'+escapeHtml(shape.Name)+' · Point '+(i+1)+' · Ctrl-click to select; drag selected points together</title></circle>';
      });
    });
  }
  if(p&&p.Visible&&(lab.tool==='select'||p.Locked)){
    const b=bounds(p),r=1.1/lab.zoom,cx=b.x+b.w/2,ry=b.y-5/lab.zoom;
    markup+='<rect class="lab-selection '+(p.Locked?'locked':'')+'" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'"/>';
    if(!p.Locked){
      for(const [key,x,y] of [['nw',b.x,b.y],['ne',b.x+b.w,b.y],['sw',b.x,b.y+b.h],['se',b.x+b.w,b.y+b.h]])
        markup+='<rect class="lab-resize" data-resize="'+key+'" x="'+(x-r)+'" y="'+(y-r)+'" width="'+2*r+'" height="'+2*r+'"><title>Drag to resize · Shift keeps proportions</title></rect>';
      markup+='<path class="lab-selection" d="M '+cx+' '+b.y+' V '+ry+'"/><circle class="lab-rotate" data-rotate="true" cx="'+cx+'" cy="'+ry+'" r="'+(r*1.2)+'"><title>Drag to rotate · Shift snaps to 15 degrees</title></circle>';
    }
  }
  if(animation.Preset==='Spin Axis'){
    const a=animation.AxisStart,b=animation.AxisEnd,r=1.5/lab.zoom;
    markup+='<path class="lab-axis" d="M '+a.X+' '+a.Y+' L '+b.X+' '+b.Y+'"/>';
    markup+='<path class="lab-axis-hit" data-axis-line="true" d="M '+a.X+' '+a.Y+' L '+b.X+' '+b.Y+'"/>';
    markup+='<circle class="lab-axis-point" data-axis-point="start" cx="'+a.X+'" cy="'+a.Y+'" r="'+r+'"/>';
    markup+='<circle class="lab-axis-point" data-axis-point="end" cx="'+b.X+'" cy="'+b.Y+'" r="'+r+'"/>';
  }
  if(lab.drag?.kind==='marquee'){
    const a=lab.drag.start,b=lab.drag.end;
    markup+='<rect class="lab-marquee" x="'+Math.min(a.x,b.x)+'" y="'+Math.min(a.y,b.y)+'" width="'+Math.abs(a.x-b.x)+'" height="'+Math.abs(a.y-b.y)+'"/>';
  }
  if(lab.tool==='hotspot')markup+=hotspotMarkup;
  $('labCanvas').innerHTML=markup;
  $('labLayers').innerHTML=lab.design.Paths.map((p,i)=>'<div class="lab-layer-row '+(i===lab.selected?'active ':'')+(p.Locked?'locked ':'')+(!p.Visible?'hidden-shape':'')+'"><input type="checkbox" data-animation-target="'+i+'" '+(animation.TargetPathIds.includes(p.Id)?'checked':'')+' aria-label="Animate '+escapeHtml(p.Name)+'" title="Include this shape when animation targets checked shapes"><button class="lab-icon-button" data-vis="'+i+'" '+(p.Locked?'disabled':'')+' title="'+(p.Locked?'Unlock this shape to change its visibility':p.Visible?'Hide shape':'Show shape')+'" aria-label="'+(p.Visible?'Hide ':'Show ')+escapeHtml(p.Name)+'">'+labIcon(p.Visible?'eye':'hidden')+'</button><button class="lab-layer-name" data-layer-select="'+i+'" aria-pressed="'+(i===lab.selected)+'" title="'+escapeHtml(p.Name)+' · '+(p.Locked?'Locked':p.Visible?'Double-click to rename':'Hidden')+'"><span>'+escapeHtml(p.Name)+'</span><small>'+(p.Locked?'Locked · ':!p.Visible?'Hidden · ':'')+(operationLabels[p.Operation]||'Add to design')+'</small></button><button class="lab-icon-button" data-lock="'+i+'" aria-pressed="'+!!p.Locked+'" title="'+(p.Locked?'Unlock':'Lock')+' shape" aria-label="'+(p.Locked?'Unlock ':'Lock ')+escapeHtml(p.Name)+'">'+labIcon(p.Locked?'locked':'unlocked')+'</button></div>').join('');
  document.querySelectorAll('[data-layer-select]').forEach(el=>el.onclick=()=>{lab.selected=Number(el.dataset.layerSelect);lab.node=-1;labTool('select');labDraw();labInspector()});
  document.querySelectorAll('[data-lock]').forEach(el=>el.onclick=()=>togglePathLock(Number(el.dataset.lock)));
  document.querySelectorAll('[data-vis]').forEach(el=>el.onclick=()=>{
    const p=lab.design.Paths[Number(el.dataset.vis)],a=ensureDesignAnimation();
    if(!editablePath(p))return;
    if(p.Visible&&guidedPreset(a.Preset)&&a.TargetPathIds.includes(p.Id)){labStatus('This shape is used by the animation. Choose another decorative shape or turn off the animation before hiding it.');return}
    const wasSafe=!lab.safety,before=clone(lab.design);labRemember();p.Visible=!p.Visible;labDraw();
    if(wasSafe&&!clickAreaHasGeometry()){lab.design=before;lab.history.pop();labDraw();labStatus('Keep part of the cursor inside the dashed circle so Windows always has a safe click point.');return}
    labChanged();
  });
  document.querySelectorAll('[data-animation-target]').forEach(el=>el.onclick=e=>{
    e.stopPropagation();const p=lab.design.Paths[Number(el.dataset.animationTarget)],a=ensureDesignAnimation();
    if(guidedPreset(a.Preset)&&el.checked&&!decorativePaths().includes(p)){
      el.checked=false;labStatus(p.Decoration?'Move this decorative shape away from the gold click point before animating it.':'Select a separate detail shape and check Decorative shape before animating it.');return;
    }
    if(guidedPreset(a.Preset)&&!el.checked&&a.TargetPathIds.length===1&&a.TargetPathIds[0]===p.Id){
      el.checked=true;labStatus('This animation needs at least one decorative shape selected. Choose another shape first, or turn off the animation.');return;
    }
    labRemember();
    a.Target='Selected';if(el.checked){if(!a.TargetPathIds.includes(p.Id))a.TargetPathIds.push(p.Id)}else a.TargetPathIds=a.TargetPathIds.filter(id=>id!==p.Id);
    syncAnimationControls();labChanged();
  });
  $('labUndo').disabled=!lab.history.length;$('labRedo').disabled=!lab.future.length;
  updateLabSelection();
}
function labInspector(){
  const p=selectedPath(),b=bounds(p),n=p?.Nodes[lab.node];
  const canEdit=!!p&&!p.Locked,multiplePoints=labSelectedPoints().length>1;
  for(const id of ['labOperation','labChannel','labDecoration','labClosed','labThickness','labX','labY','labWidth','labHeight','labAngle','labRotate','labMirrorX','labMirrorY','labCenter','labSmoothPath','labOutline','labDelete'])$(id).disabled=!canEdit;
  for(const id of ['labNodeX','labNodeY','labSmooth','labCorner','labInsert','labDeleteNode'])$(id).disabled=!canEdit||!n||multiplePoints;
  $('labInsert').disabled=!canEdit||!n||multiplePoints||(!p.Closed&&lab.node===p.Nodes.length-1);
  $('labDuplicate').disabled=!p;$('labSymmetry').disabled=!p;
  $('labDuplicate').title=p?.Locked?'Make an unlocked copy; the original stays protected':'Make a separate editable copy';
  $('labUp').disabled=!canEdit||lab.selected===0||!!lab.design.Paths[lab.selected-1]?.Locked;
  $('labDown').disabled=!canEdit||lab.selected===lab.design.Paths.length-1||!!lab.design.Paths[lab.selected+1]?.Locked;
  for(const id of ['labUp','labDown'])$(id).title='Change shape order. Locked shapes stay in their current position.';
  for(const [id,value] of Object.entries({labHotX:lab.design.Hotspot.X,labHotY:lab.design.Hotspot.Y,labX:b.x,labY:b.y,labWidth:b.w,labHeight:b.h,labNodeX:n?.X??0,labNodeY:n?.Y??0}))$(id).value=Math.round(value*100)/100;
  const hotspotPoint=$('labHotspotPoint');
  const canAttach=p&&hotspotPaths().includes(p)&&p.Nodes.some(eligibleHotspotPoint);hotspotPoint.disabled=!canAttach;
  hotspotPoint.innerHTML=canAttach?'<option value="">Choose a point</option>'+p.Nodes.map((point,i)=>eligibleHotspotPoint(point)?'<option value="'+i+'">Point '+(i+1)+'</option>':'').join(''):'<option value="">No eligible points on this shape</option>';
  if(canAttach){const index=p.Nodes.findIndex(point=>Math.hypot(point.X-lab.design.Hotspot.X,point.Y-lab.design.Hotspot.Y)<.00001);hotspotPoint.value=index>=0?String(index):''}
  $('labClosed').checked=p?.Closed??true;$('labDecoration').checked=!!p?.Decoration;$('labThickness').value=p?.Thickness??4;$('labOperation').value=p?.Operation||'Union';$('labChannel').value=p?.Channel||'Body';
  updateLabSelection();
  syncAnimationControls();
}
function labTool(tool){lab.tool=tool;lab.node=-1;lab.pointSelection=[];lab.hotspotSelected=tool==='hotspot';lab.penPath=-1;document.querySelectorAll('[data-lab-tool]').forEach(b=>b.classList.toggle('selected',b.dataset.labTool===tool));labStatus(tool==='pen'?'Click for corners · drag gently for curves · Enter finishes':tool==='freehand'?'Draw naturally · release to fit editable points':tool==='hotspot'?'Drop on a cursor point. Red means no point. Arrow keys move between points.':tool==='select'?'Drag shape · corners resize · top handle rotates':tool==='points'?'Drag a box or Ctrl-click points · drag selected points together · arrows use Snap grid, or 1 unit with Snap off':'Drag to draw');
  const curveGroup=$('labCurveGroup');
  if(curveGroup)curveGroup.open=true;
  labDraw();labInspector();
}
const toolLabels={select:'Move shape',points:'Edit points',pen:'Curve pen',freehand:'Freehand'};
$('labTools').innerHTML=Object.entries(toolLabels).map(([key,label])=>'<button data-lab-tool="'+key+'">'+label+'</button>').join('');
document.querySelectorAll('[data-lab-tool]').forEach(b=>b.onclick=()=>{
  const tool=b.dataset.labTool;labTool(tool);
  if(tool==='points'||tool==='pen'||tool==='freehand')showLabInspector('points');
  else if(tool==='select')showLabInspector('shape');
});
function cursorPoint(e,doSnap=true){
  const matrix=$('labCanvas').getScreenCTM().inverse();let p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix);
  if(doSnap&&$('labSnap').checked){
    const grid=Number($('labGrid').value)||1;p.x=Math.round(p.x/grid)*grid;p.y=Math.round(p.y/grid)*grid;
  }
  return {x:Math.max(-100,Math.min(200,p.x)),y:Math.max(-100,Math.min(200,p.y))};
}
function addPath(nodes,closed=true,name='Path'){
  const p={Id:pathId(),Name:name,Nodes:nodes,Closed:closed,Visible:true,Locked:false,Decoration:false,Thickness:1.25,Operation:'Union',Channel:'Body'};
  lab.design.Paths.push(p);lab.selected=lab.design.Paths.length-1;lab.node=-1;return p;
}
function primitive(type,a,b){
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.max(.1,Math.abs(a.x-b.x)),h=Math.max(.1,Math.abs(a.y-b.y));
  if(type==='rectangle')return [node(x,y),node(x+w,y),node(x+w,y+h),node(x,y+h)];
  if(type==='triangle')return [node(x+w/2,y),node(x+w,y+h),node(x,y+h)];
  if(type==='star')return Array.from({length:10},(_,i)=>{const t=i*Math.PI/5-Math.PI/2,r=i%2?.42:1;return node(x+w/2+Math.cos(t)*w/2*r,y+h/2+Math.sin(t)*h/2*r)});
  const k=.55228475,rx=w/2,ry=h/2,cx=x+rx,cy=y+ry;
  return [{...node(cx,cy-ry),In:{X:cx-rx*k,Y:cy-ry},Out:{X:cx+rx*k,Y:cy-ry}},
    {...node(cx+rx,cy),In:{X:cx+rx,Y:cy-ry*k},Out:{X:cx+rx,Y:cy+ry*k}},
    {...node(cx,cy+ry),In:{X:cx+rx*k,Y:cy+ry},Out:{X:cx-rx*k,Y:cy+ry}},
    {...node(cx-rx,cy),In:{X:cx-rx,Y:cy+ry*k},Out:{X:cx-rx,Y:cy-ry*k}}];
}
$('labCanvas').onpointerdown=e=>{
  if(e.button!==0&&e.button!==1)return;e.preventDefault();$('labCanvas').focus();
  lab.selectionFuture=lab.future.slice();
  const pt=cursorPoint(e),target=e.target;
  if(lab.tool==='pan'||e.button===1||e.altKey){lab.drag={kind:'pan',screenX:e.clientX,screenY:e.clientY,matrix:$('labCanvas').getScreenCTM().inverse(),x:lab.panX,y:lab.panY};$('labCanvas').setPointerCapture(e.pointerId);return}
  if(lab.tool==='hotspot'||target.closest?.('[data-hotspot]')){
    const raw=cursorPoint(e,false),before={Hotspot:clone(lab.design.Hotspot),HotspotSet:lab.design.HotspotSet};
    const marker=!!target.closest?.('[data-hotspot]');
    lab.hotspotSelected=true;lab.pointSelection=[];lab.node=-1;
    lab.drag={kind:'hotspot',before,candidate:clone(before.Hotspot),offset:marker?{x:before.Hotspot.X-raw.x,y:before.Hotspot.Y-raw.y}:{x:0,y:0}};
    if(!marker)placeHotspot(raw);
    $('labCanvas').setPointerCapture(e.pointerId);labDraw();labInspector();return;
  }
  lab.hotspotSelected=false;
  const axisPoint=target.closest?.('[data-axis-point]'),axisLine=target.closest?.('[data-axis-line]');
  if((axisPoint||axisLine)&&ensureDesignAnimation().Preset==='Spin Axis'){
    labRemember();lab.drag={kind:axisPoint?'axisPoint':'axisLine',endpoint:axisPoint?.dataset.axisPoint,start:pt,
      original:clone(ensureDesignAnimation())};$('labCanvas').setPointerCapture(e.pointerId);return;
  }
  const hitIndex=target.dataset.pointLayer??target.dataset.layer??((target.dataset.resize!==undefined||target.dataset.rotate!==undefined||target.dataset.handle!==undefined)?lab.selected:null);
  if(['select','points'].includes(lab.tool)&&hitIndex!==null&&lab.design.Paths[Number(hitIndex)]?.Locked&&(lab.tool==='select'||target.dataset.node!==undefined)){
    lab.selected=Number(hitIndex);lab.node=-1;labDraw();labInspector();editablePath();return;
  }
  if(lab.tool==='points'&&target.dataset.node!==undefined&&!target.dataset.handle){
    const path=lab.design.Paths[Number(target.dataset.pointLayer??lab.selected)];if(!editablePath(path))return;
    const ref={pathId:path.Id,node:Number(target.dataset.node)},refs=labSelectedPoints();
    const selected=refs.some(item=>labPointKey(item)===labPointKey(ref));
    if(e.ctrlKey||e.metaKey){
      labSelectPoints(selected?refs.filter(item=>labPointKey(item)!==labPointKey(ref)):[...refs,ref]);
      labDraw();labInspector();return;
    }
    labSelectPoints(selected?refs:[ref]);
    const d=labPointMoveState();d.start=cursorPoint(e,false);labRemember();lab.drag=d;
    $('labCanvas').setPointerCapture(e.pointerId);labDraw();labInspector();return;
  }
  if(lab.tool==='points'&&target.dataset.handle===undefined){
    const start=cursorPoint(e,false);
    lab.drag={kind:'marquee',start,end:start,base:(e.ctrlKey||e.metaKey)?labSelectedPoints():[],hitLayer:target.dataset.layer};
    $('labCanvas').setPointerCapture(e.pointerId);labDraw();return;
  }
  if(lab.tool==='none'){lab.selected=target.dataset.layer!==undefined?Number(target.dataset.layer):lab.selected;labDraw();labInspector();return}
  labRemember();
  if(lab.tool==='pen'){
    if(lab.penPath<0){addPath([],false,'Bézier path');lab.penPath=lab.selected}
    lab.selected=lab.penPath;const p=selectedPath();
    if(p.Nodes.length>2&&Math.hypot(pt.x-p.Nodes[0].X,pt.y-p.Nodes[0].Y)<2){p.Closed=true;lab.penPath=-1;labChanged();return}
    p.Nodes.push(node(pt.x,pt.y));lab.node=p.Nodes.length-1;lab.drag={kind:'pen',start:pt,moved:false};
  }else if(lab.tool==='freehand'){addPath([node(pt.x,pt.y)],false,'Freehand');lab.drag={kind:'freehand',start:pt}}
  else if(['rectangle','ellipse','triangle','star'].includes(lab.tool)){addPath(primitive(lab.tool,pt,pt),true,toolLabels[lab.tool]);lab.drag={kind:'shape',start:pt,type:lab.tool}}
  else if(lab.tool==='select'&&target.dataset.resize!==undefined&&selectedPath()){
    lab.drag={kind:'resize',key:target.dataset.resize,box:bounds(selectedPath()),original:clone(selectedPath()),hotspot:hotspotOnPath(selectedPath())?clone(lab.design.Hotspot):null};
  }else if(lab.tool==='select'&&target.dataset.rotate!==undefined&&selectedPath()){
    const b=bounds(selectedPath()),cx=b.x+b.w/2,cy=b.y+b.h/2;
    lab.drag={kind:'rotate',cx,cy,angle:Math.atan2(pt.y-cy,pt.x-cx),original:clone(selectedPath()),hotspot:hotspotOnPath(selectedPath())?clone(lab.design.Hotspot):null};
  }else if(target.dataset.node!==undefined){
    if(target.dataset.pointLayer!==undefined){lab.selected=Number(target.dataset.pointLayer);lab.node=-1}
    lab.node=Number(target.dataset.node);lab.drag={kind:target.dataset.handle?'handle':'node',handle:target.dataset.handle,start:pt,original:clone(selectedPath()),hotspot:!target.dataset.handle&&hotspotOnNode(selectedPath(),lab.node)?clone(lab.design.Hotspot):null};
  }else if(target.dataset.layer!==undefined){
    lab.selected=Number(target.dataset.layer);lab.node=-1;if(lab.tool==='select')lab.drag={kind:'move',start:pt,original:clone(selectedPath()),hotspot:hotspotOnPath(selectedPath())?clone(lab.design.Hotspot):null};else{lab.history.pop();lab.future=lab.selectionFuture}
  }else{lab.history.pop();lab.future=lab.selectionFuture;lab.selected=-1;lab.node=-1}
  $('labCanvas').setPointerCapture(e.pointerId);labDraw();labInspector();
};
$('labCanvas').onpointermove=e=>{
  const pt=cursorPoint(e);$('labReadout').textContent='X '+pt.x.toFixed(1)+'  Y '+pt.y.toFixed(1)+' · '+Math.round(lab.zoom*100)+'%';
  const d=lab.drag;if(!d)return;
  if(d.kind==='marquee'){
    d.end=cursorPoint(e,false);const a=d.start,b=d.end,refs=[];
    for(const path of lab.design.Paths){
      if(!path.Visible||path.Locked)continue;
      path.Nodes.forEach((n,index)=>{if(n.X>=Math.min(a.x,b.x)&&n.X<=Math.max(a.x,b.x)&&n.Y>=Math.min(a.y,b.y)&&n.Y<=Math.max(a.y,b.y))refs.push({pathId:path.Id,node:index})});
    }
    labSelectPoints([...d.base,...refs]);labDraw();labInspector();return;
  }
  if(d.kind==='nodes'){
    const q=cursorPoint(e,false);let dx=q.x-d.start.x,dy=q.y-d.start.y;
    if($('labSnap').checked){const grid=Number($('labGrid').value)||1;dx=Math.round(dx/grid)*grid;dy=Math.round(dy/grid)*grid}
    if(e.shiftKey){if(Math.abs(dx)>=Math.abs(dy))dy=0;else dx=0}
    labMovePoints(d,dx,dy);labDraw();labInspector();return;
  }
  if(d.kind==='pan'){const dx=e.clientX-d.screenX,dy=e.clientY-d.screenY;lab.panX=d.x-dx*d.matrix.a-dy*d.matrix.c;lab.panY=d.y-dx*d.matrix.b-dy*d.matrix.d;labDraw();return}
  if(d.kind==='hotspot'){
    const raw=cursorPoint(e,false);placeHotspot({x:raw.x+d.offset.x,y:raw.y+d.offset.y});labDraw();labInspector();return;
  }
  if(d.kind==='axisPoint'){
    const a=ensureDesignAnimation(),other=d.endpoint==='start'?a.AxisEnd:a.AxisStart;
    const next={X:Math.max(0,Math.min(99.99,pt.x)),Y:Math.max(0,Math.min(99.99,pt.y))};
    if(Math.hypot(next.X-other.X,next.Y-other.Y)>=1){a[d.endpoint==='start'?'AxisStart':'AxisEnd']=next;a.AxisConfigured=true}
    syncAnimationControls();labDraw();return;
  }
  if(d.kind==='axisLine'){
    const a=ensureDesignAnimation(),start=d.original.AxisStart,end=d.original.AxisEnd;
    const dx=Math.max(-Math.min(start.X,end.X),Math.min(99.99-Math.max(start.X,end.X),pt.x-d.start.x));
    const dy=Math.max(-Math.min(start.Y,end.Y),Math.min(99.99-Math.max(start.Y,end.Y),pt.y-d.start.y));
    a.AxisStart={X:start.X+dx,Y:start.Y+dy};a.AxisEnd={X:end.X+dx,Y:end.Y+dy};a.AxisConfigured=true;
    syncAnimationControls();labDraw();return;
  }
  const p=selectedPath();
  if(!editablePath(p,false)){lab.drag=null;return}
  if(d.kind==='resize'){
    const b=d.box,ax=d.key.includes('w')?b.x+b.w:b.x,ay=d.key.includes('n')?b.y+b.h:b.y;
    let sx=(pt.x-ax)/((d.key.includes('w')?b.x:b.x+b.w)-ax),sy=(pt.y-ay)/((d.key.includes('n')?b.y:b.y+b.h)-ay);
    sx=Math.max(.01,sx);sy=Math.max(.01,sy);if(e.shiftKey)sx=sy=Math.max(sx,sy);
    lab.design.Paths[lab.selected]=clone(d.original);transformPath(selectedPath(),(x,y)=>({x:ax+(x-ax)*sx,y:ay+(y-ay)*sy}));
    if(d.hotspot)lab.design.Hotspot={X:ax+(d.hotspot.X-ax)*sx,Y:ay+(d.hotspot.Y-ay)*sy};
  }
  if(d.kind==='rotate'){
    let a=Math.atan2(pt.y-d.cy,pt.x-d.cx)-d.angle;if(e.shiftKey)a=Math.round(a/(Math.PI/12))*Math.PI/12;
    lab.design.Paths[lab.selected]=clone(d.original);transformPath(selectedPath(),(x,y)=>({x:d.cx+(x-d.cx)*Math.cos(a)-(y-d.cy)*Math.sin(a),y:d.cy+(x-d.cx)*Math.sin(a)+(y-d.cy)*Math.cos(a)}));
    if(d.hotspot)lab.design.Hotspot={X:d.cx+(d.hotspot.X-d.cx)*Math.cos(a)-(d.hotspot.Y-d.cy)*Math.sin(a),Y:d.cy+(d.hotspot.X-d.cx)*Math.sin(a)+(d.hotspot.Y-d.cy)*Math.cos(a)};
  }
  if(d.kind==='shape')p.Nodes=primitive(d.type,d.start,pt);
  if(d.kind==='move'){
    const dx=pt.x-d.start.x,dy=pt.y-d.start.y;lab.design.Paths[lab.selected]=clone(d.original);
    transformPath(selectedPath(),(x,y)=>({x:x+dx,y:y+dy}));moveAttachedHotspot(d.hotspot,dx,dy);
  }
  if(d.kind==='node'){
    const o=d.original.Nodes[lab.node],n=p.Nodes[lab.node],dx=pt.x-o.X,dy=pt.y-o.Y;
    n.X=pt.x;n.Y=pt.y;for(const key of ['In','Out'])n[key]=o[key]?{X:o[key].X+dx,Y:o[key].Y+dy}:null;
    moveAttachedHotspot(d.hotspot,dx,dy);
  }
  if(d.kind==='handle'){
    const n=p.Nodes[lab.node];n[d.handle]={X:pt.x,Y:pt.y};
    if(n.Smooth&&!e.shiftKey)n[d.handle==='In'?'Out':'In']={X:2*n.X-pt.x,Y:2*n.Y-pt.y};
  }
  if(d.kind==='pen'){
    const n=p.Nodes[lab.node],dx=pt.x-n.X,dy=pt.y-n.Y,length=Math.hypot(dx,dy);
    if(length>.6){const scale=Math.min(20,length)/length,hx=dx*scale,hy=dy*scale;n.Out={X:n.X+hx,Y:n.Y+hy};n.In={X:n.X-hx,Y:n.Y-hy};n.Smooth=true;d.moved=true}
    else{n.In=n.Out=null;n.Smooth=false;d.moved=false}
  }
  if(d.kind==='freehand'){
    const last=p.Nodes[p.Nodes.length-1];if(p.Nodes.length<1500&&Math.hypot(pt.x-last.X,pt.y-last.Y)>.4)p.Nodes.push(node(pt.x,pt.y));
  }
  labDraw();labInspector();
};
function smoothNodes(p,amount){
  const n=p.Nodes.length;if(n<2)return;
  p.Nodes.forEach((v,i)=>{
    const a=p.Nodes[(i-1+n)%n],b=p.Nodes[(i+1)%n];
    const dx=(b.X-a.X)*amount/6,dy=(b.Y-a.Y)*amount/6;
    v.In=!p.Closed&&i===0?null:{X:v.X-dx,Y:v.Y-dy};
    v.Out=!p.Closed&&i===n-1?null:{X:v.X+dx,Y:v.Y+dy};v.Smooth=true;
  });
}
function simplify(points,epsilon){
  if(points.length<3)return points;
  const a=points[0],b=points[points.length-1],dx=b.X-a.X,dy=b.Y-a.Y,len=dx*dx+dy*dy;let best=0,index=0;
  for(let i=1;i<points.length-1;i++){const p=points[i],t=len?Math.max(0,Math.min(1,((p.X-a.X)*dx+(p.Y-a.Y)*dy)/len)):0,d=Math.hypot(p.X-a.X-t*dx,p.Y-a.Y-t*dy);if(d>best){best=d;index=i}}
  return best>epsilon?[...simplify(points.slice(0,index+1),epsilon).slice(0,-1),...simplify(points.slice(index),epsilon)]:[a,b];
}
$('labCanvas').onpointerup=e=>{
  if(!lab.drag)return;
  if(lab.drag.kind==='marquee'){
    const d=lab.drag;lab.drag=null;
    if(!labSelectedPoints().length&&d.hitLayer!==undefined)lab.selected=Number(d.hitLayer);
    if($('labCanvas').hasPointerCapture(e.pointerId))$('labCanvas').releasePointerCapture(e.pointerId);
    labDraw();labInspector();labStatus(labSelectedPoints().length+' points selected · drag together or use arrow keys');return;
  }
  if(lab.drag.kind==='nodes'){
    const d=lab.drag;lab.drag=null;
    if($('labCanvas').hasPointerCapture(e.pointerId))$('labCanvas').releasePointerCapture(e.pointerId);
    labCommitPointMove(d,lab.selectionFuture||[]);return;
  }
  if(lab.drag.original&&['move','resize','rotate','node','handle'].includes(lab.drag.kind)&&JSON.stringify(lab.drag.original)===JSON.stringify(selectedPath())){
    lab.history.pop();lab.future=lab.selectionFuture||[];lab.drag=null;
    if($('labCanvas').hasPointerCapture(e.pointerId))$('labCanvas').releasePointerCapture(e.pointerId);
    labDraw();labInspector();return;
  }
  if(lab.drag.kind==='freehand'){
    const p=selectedPath(),amount=Number($('labSmoothing').value)/100,detail=Number($('labPointDetail').value)/100;
    p.Nodes=simplify(p.Nodes,.08+(1-detail)*1.25);
    if(p.Nodes.length>2&&Math.hypot(p.Nodes[0].X-p.Nodes[p.Nodes.length-1].X,p.Nodes[0].Y-p.Nodes[p.Nodes.length-1].Y)<3){p.Nodes.pop();p.Closed=true}
    smoothNodes(p,amount);
  }
  const finishedKind=lab.drag.kind,created=['shape','freehand'].includes(finishedKind);
  if(!lab.safety&&lab.drag.original&&['move','resize','rotate','node','handle'].includes(finishedKind)&&
      (!clickAreaHasGeometry()||animatedDecorationOverlapsClick(selectedPath()))){
    lab.design.Paths[lab.selected]=clone(lab.drag.original);if(lab.drag.hotspot)lab.design.Hotspot=clone(lab.drag.hotspot);lab.history.pop();lab.future=lab.selectionFuture||[];lab.drag=null;
    if($('labCanvas').hasPointerCapture(e.pointerId))$('labCanvas').releasePointerCapture(e.pointerId);
    labDraw();labInspector();labStatus('That change would move the cursor away from its click point or put moving artwork on it. Your last safe shape position was kept.');return;
  }
  if(finishedKind==='hotspot'){
    const candidate=lab.drag.candidate,anchor=hotspotAnchorAt(candidate);lab.drag=null;
    if($('labCanvas').hasPointerCapture(e.pointerId))$('labCanvas').releasePointerCapture(e.pointerId);
    if(anchor)setHotspotOnPoint(anchor);
    else labStatus('Drop the click point on an actual cursor point. The previous click point was kept.');
    labDraw();labInspector();return;
  }
  const changed=lab.drag.kind!=='pan';lab.drag=null;
  if(created)labTool(finishedKind==='freehand'?'points':'select');
  if($('labCanvas').hasPointerCapture(e.pointerId))$('labCanvas').releasePointerCapture(e.pointerId);
  if(changed){labChanged();if(created&&selectedPath())labStatus((selectedPath().Closed?'Closed shape':'Freehand stroke')+' fitted to '+selectedPath().Nodes.length+' editable points')}
};
$('labCanvas').onpointercancel=e=>{
  const d=lab.drag;lab.drag=null;
  if(d?.kind==='hotspot'){if(e&&$('labCanvas').hasPointerCapture(e.pointerId))$('labCanvas').releasePointerCapture(e.pointerId);labDraw();labInspector();return}
  if(d?.kind==='nodes'){lab.design=d.before;lab.history.pop();lab.future=lab.selectionFuture||[];labDraw();labInspector();return}
  if(d?.kind==='marquee'){labSelectPoints(d.base);labDraw();labInspector();return}
  labChanged();
};
$('labCanvas').onwheel=e=>{e.preventDefault();lab.zoom=Math.max(.5,Math.min(8,lab.zoom*(e.deltaY<0?1.12:1/1.12)));labDraw()};
function mutatePath(fn){
  if(!editablePath()){labInspector();return}lab.pointSelection=[];const wasSafe=!lab.safety;labRemember();const original=clone(selectedPath()),hotspot=clone(lab.design.Hotspot);fn(selectedPath());labDraw();
  if(wasSafe&&(!clickAreaHasGeometry()||animatedDecorationOverlapsClick(selectedPath()))){
    lab.design.Paths[lab.selected]=original;lab.design.Hotspot=hotspot;lab.history.pop();labDraw();labInspector();labStatus('That change would leave the cursor without a safe click point, so your last safe shape was kept.');return;
  }
  labChanged();
}
$('labOperation').onchange=e=>mutatePath(p=>p.Operation=e.target.value);
$('labChannel').onchange=e=>mutatePath(p=>p.Channel=e.target.value);
$('labDecoration').onchange=e=>{
  const p=selectedPath();if(!p)return;const a=ensureDesignAnimation();
  if(!e.target.checked&&guidedPreset(a.Preset)&&a.TargetPathIds.includes(p.Id)){e.target.checked=true;labStatus('This shape is used by the animation. Choose another decorative shape or turn off the animation before unmarking it.');return}
  mutatePath(path=>path.Decoration=e.target.checked);
};
$('labClosed').onchange=e=>mutatePath(p=>p.Closed=e.target.checked);
$('labThickness').onchange=e=>mutatePath(p=>p.Thickness=Math.max(.1,Math.min(100,Number(e.target.value)||4)));
for(const axis of ['X','Y'])$('labHot'+axis).onchange=e=>{
  const value=Number(e.target.value);if(!Number.isFinite(value)){labInspector();return}
  setHotspotOnPoint({...lab.design.Hotspot,[axis]:value});
};
$('labHotspotPoint').onchange=e=>{
  const p=selectedPath(),index=Number(e.target.value);if(!p||e.target.value===''||!p.Nodes[index])return;
  const point=p.Nodes[index];
  if(!hotspotPaths().includes(p)||!eligibleHotspotPoint(point)){labInspector();labStatus('Choose a visible, stationary cursor point.');return}
  setHotspotOnPoint(point);lab.node=index;
};
$('labShowHotspotPoints').onchange=e=>{lab.showHotspotPoints=e.target.checked;labDraw()};
$('labSetHot').onclick=()=>{lab.showHotspotPoints=true;$('labShowHotspotPoints').checked=true;labTool('hotspot')};
$('labSnapHotspot').onclick=()=>{
  const nearest=nearestHotspotPoint(lab.design.Hotspot,true);
  if(!nearest){labStatus('No visible cursor points available. Show or add a cursor shape first.');return;}
  const before=labHistorySnapshot(),aligned=snapHotspot(true);
  if(aligned){lab.history.push(before);if(lab.history.length>100)lab.history.shift();lab.future=[];labChanged()}
  labStatus('Click point '+(aligned?'aligned to':'is already aligned to')+' Point '+(nearest.index+1)+' on '+nearest.path.Name+'.');
};
for(const key of ['X','Y','Width','Height'])$('lab'+key).onchange=e=>mutatePath(p=>{
  const b=bounds(p),value=Number(e.target.value);if(!Number.isFinite(value))return;
  if(key==='X'||key==='Y')transformPath(p,(x,y)=>({x:x+(key==='X'?value-b.x:0),y:y+(key==='Y'?value-b.y:0)}));
  else{const scale=Math.max(.1,Math.min(200,value))/(key==='Width'?b.w:b.h);transformPath(p,(x,y)=>({x:b.x+(x-b.x)*(key==='Width'?scale:1),y:b.y+(y-b.y)*(key==='Height'?scale:1)}))}
});
function aboutCenter(p,fn){const b=bounds(p),cx=b.x+b.w/2,cy=b.y+b.h/2;transformPath(p,(x,y)=>{const q=fn(x-cx,y-cy);return {x:q.x+cx,y:q.y+cy}})}
$('labRotate').onclick=()=>mutatePath(p=>{const a=(Number($('labAngle').value)||0)*Math.PI/180;aboutCenter(p,(x,y)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)}))});
$('labMirrorX').onclick=()=>mutatePath(p=>aboutCenter(p,(x,y)=>({x:-x,y})));
$('labMirrorY').onclick=()=>mutatePath(p=>aboutCenter(p,(x,y)=>({x,y:-y})));
$('labSymmetry').onclick=()=>{if(!selectedPath())return;labRemember();const p=clone(selectedPath());p.Id=pathId();p.Locked=false;p.Name+=' mirrored';transformPath(p,(x,y)=>({x:100-x,y}));lab.design.Paths.push(p);lab.selected=lab.design.Paths.length-1;lab.node=-1;labChanged()};
$('labCenter').onclick=()=>mutatePath(p=>{const b=bounds(p);transformPath(p,(x,y)=>({x:x+50-b.x-b.w/2,y:y+50-b.y-b.h/2}))});
$('labDuplicate').onclick=()=>{if(!selectedPath())return;labRemember();const p=clone(selectedPath());p.Id=pathId();p.Locked=false;p.Name+=' copy';lab.design.Paths.push(p);lab.selected=lab.design.Paths.length-1;lab.node=-1;labChanged()};
$('labDelete').onclick=()=>{
  if(!editablePath())return;
  const chosen=selectedPath(),animation=ensureDesignAnimation();
  if(guidedPreset(animation.Preset)&&animation.TargetPathIds.includes(chosen.Id)){labStatus('This shape is used by the animation. Choose another decorative shape or turn off the animation before deleting it.');return}
  const wasSafe=!lab.safety,before=clone(lab.design);labRemember();lab.design.Paths.splice(lab.selected,1);lab.selected=Math.min(lab.selected,lab.design.Paths.length-1);lab.node=-1;labDraw();
  if(wasSafe&&!clickAreaHasGeometry()){lab.design=before;lab.history.pop();labDraw();labInspector();labStatus('Keep part of the cursor inside the dashed circle so Windows always has a safe click point.');return}
  labChanged();
};
for(const [id,delta] of [['labUp',-1],['labDown',1]])$(id).onclick=()=>{const next=lab.selected+delta;if(next<0||next>=lab.design.Paths.length||lab.selected<0||!editablePath())return;if(lab.design.Paths[next].Locked){labStatus('Unlock the neighboring shape before changing its position in the list.');return}labRemember();[lab.design.Paths[next],lab.design.Paths[lab.selected]]=[lab.design.Paths[lab.selected],lab.design.Paths[next]];lab.selected=next;labChanged()};
for(const axis of ['X','Y'])$('labNode'+axis).onchange=e=>mutatePath(p=>{const n=p.Nodes[lab.node];if(!n)return;const attached=hotspotOnNode(p,lab.node),v=Number(e.target.value)||0,d=v-n[axis];n[axis]=v;for(const h of [n.In,n.Out].filter(Boolean))h[axis]+=d;if(attached)lab.design.Hotspot[axis]=Math.max(0,Math.min(99.99,lab.design.Hotspot[axis]+d))});
$('labCorner').onclick=()=>mutatePath(p=>{const n=p.Nodes[lab.node];if(n){n.In=n.Out=null;n.Smooth=false}});
$('labSmooth').onclick=()=>mutatePath(p=>{const i=lab.node,n=p.Nodes[i];if(!n)return;const a=p.Nodes[(i-1+p.Nodes.length)%p.Nodes.length],b=p.Nodes[(i+1)%p.Nodes.length],amount=Number($('labSmoothing').value)/100;n.In={X:n.X-(b.X-a.X)*amount/6,Y:n.Y-(b.Y-a.Y)*amount/6};n.Out={X:n.X+(b.X-a.X)*amount/6,Y:n.Y+(b.Y-a.Y)*amount/6};n.Smooth=true});
$('labSmoothPath').onclick=()=>mutatePath(p=>smoothNodes(p,Number($('labSmoothing').value)/100));
$('labDeleteNode').onclick=()=>mutatePath(p=>{if(lab.node>=0){p.Nodes.splice(lab.node,1);lab.node=-1}});
const midpoint=(a,b)=>({X:(a.X+b.X)/2,Y:(a.Y+b.Y)/2});
$('labInsert').onclick=()=>mutatePath(p=>{
  const i=lab.node;if(i<0||(!p.Closed&&i===p.Nodes.length-1))return;
  const a=p.Nodes[i],b=p.Nodes[(i+1)%p.Nodes.length],c=a.Out||a,d=b.In||b;
  const e=midpoint(a,c),f=midpoint(c,d),g=midpoint(d,b),h=midpoint(e,f),j=midpoint(f,g),k=midpoint(h,j);
  a.Out=e;b.In=g;p.Nodes.splice(i+1,0,{X:k.X,Y:k.Y,In:h,Out:j,Smooth:true});lab.node=i+1;
});
$('labOutline').onclick=()=>mutatePath(p=>{
  if(p.Closed||p.Nodes.length<2){labStatus('Taper applies to an open stroke');return}
  const sample=[],n=p.Nodes.length;
  for(let i=0;i<n-1;i++){const a=p.Nodes[i],b=p.Nodes[i+1],c=a.Out||a,d=b.In||b;for(let j=0;j<12;j++){const t=j/12,u=1-t;sample.push({X:u*u*u*a.X+3*u*u*t*c.X+3*u*t*t*d.X+t*t*t*b.X,Y:u*u*u*a.Y+3*u*u*t*c.Y+3*u*t*t*d.Y+t*t*t*b.Y})}}
  sample.push(p.Nodes[n-1]);const left=[],right=[],taper=Number($('labTaper').value)/100;
  sample.forEach((v,i)=>{const a=sample[Math.max(0,i-1)],b=sample[Math.min(sample.length-1,i+1)],dx=b.X-a.X,dy=b.Y-a.Y,len=Math.hypot(dx,dy)||1,w=p.Thickness/2*(1-taper*i/(sample.length-1));left.push(node(v.X-dy/len*w,v.Y+dx/len*w));right.push(node(v.X+dy/len*w,v.Y-dx/len*w))});
  p.Nodes=left.concat(right.reverse());p.Closed=true;p.Name+=' outline';lab.node=-1;
});
$('labSmoothing').oninput=e=>$('labSmoothValue').textContent=e.target.value;
$('labPointDetail').oninput=e=>$('labDetailValue').textContent=e.target.value;
$('labTaper').oninput=e=>$('labTaperValue').textContent=e.target.value;
$('labUndo').onclick=()=>{if(!lab.history.length)return;lab.future.push(labHistorySnapshot());labRestoreSnapshot(lab.history.pop());lab.selected=Math.min(lab.selected,lab.design.Paths.length-1);lab.node=-1;labChanged()};
$('labRedo').onclick=()=>{if(!lab.future.length)return;lab.history.push(labHistorySnapshot());labRestoreSnapshot(lab.future.pop());lab.selected=Math.min(lab.selected,lab.design.Paths.length-1);lab.node=-1;labChanged()};
$('labZoomIn').onclick=()=>{lab.zoom=Math.min(8,lab.zoom*1.25);labDraw()};
$('labZoomOut').onclick=()=>{lab.zoom=Math.max(.5,lab.zoom/1.25);labDraw()};
$('labFit').onclick=()=>{lab.zoom=1;lab.panX=lab.panY=0;labDraw()};
$('labCanvas').addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(['nodes','marquee','hotspot'].includes(lab.drag?.kind))$('labCanvas').onpointercancel();else lab.drag=null;labTool('none');labDraw();e.preventDefault()}
  if(e.key==='Enter'){if(lab.penPath>=0){lab.penPath=-1;labTool('select');labChanged()}e.preventDefault()}
  if(e.key==='Delete'){$(lab.tool==='points'?'labDeleteNode':'labDelete').click();e.preventDefault()}
  if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.stopImmediatePropagation();e.preventDefault();$(e.shiftKey?'labRedo':'labUndo').click()}
  if(e.ctrlKey&&e.key.toLowerCase()==='y'){e.preventDefault();$('labRedo').click()}
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    e.preventDefault();const step=($('labSnap').checked?(Number($('labGrid').value)||1):1)*(e.shiftKey?5:1);
    const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
    labNudgeSelection(dx,dy);
  }
});
$('labTemplate').onchange=async e=>{
  const next=e.target.value;e.target.value=lab.role;
  if(!roleIds.includes(next)||next===lab.role)return;
  if(lab.dirty){
    pendingLabRole=next;$('labExitTitle').textContent='KEEP YOUR LAB CHANGES?';
    $('labExitMessage').textContent='Keep your current Lab changes before switching from '+roleNames[roleIds.indexOf(lab.role)]+' to '+roleNames[roleIds.indexOf(next)]+'?';
    $('labExitSave').textContent='Keep changes and switch';$('labExitSave').disabled=!!lab.safety;$('labExitDialog').hidden=false;return;
  }
  await switchLabRole(next);
};
let pendingLabRole=null;
async function switchLabRole(next){
  pendingLabRole=null;clearTimeout(labPersistTimer);clearTimeout(lab.timer);stopLabPreviewAnimation();
  $('labTemplate').disabled=true;
  try{await loadLabRole(next)}finally{$('labTemplate').disabled=false;$('labTemplate').value=lab.role}
}
// Every preset is ordinary editable nodes and Bezier handles, with no special renderer.
function addLabShape(type){
  if(!Object.values(labShapeGroups).flat().includes(type))return;
  const start=lab.design.Paths.length;
  const poly=points=>addPath(points.map(p=>node(...p)),true,type);
  const ellipse=(x,y,w,h)=>primitive('ellipse',{x,y},{x:x+w,y:y+h});
  const radial=(count,inner=1)=>Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count-Math.PI/2,r=i%2?inner:1;return [50+Math.cos(a)*24*r,50+Math.sin(a)*24*r]});
  const bezier=(points,closed=true)=>addPath(points.map(([x,y,ix,iy,ox,oy])=>({...node(x,y),In:ix==null?null:{X:ix,Y:iy},Out:ox==null?null:{X:ox,Y:oy}})),closed,type);
  const polygons={
    Triangle:[[50,26],[74,74],[26,74]],'Right triangle':[[26,26],[74,74],[26,74]],
    Diamond:[[50,24],[76,50],[50,76],[24,50]],Trapezoid:[[36,28],[64,28],[78,72],[22,72]],
    Parallelogram:[[38,28],[78,28],[62,72],[22,72]],Kite:[[50,24],[72,44],[50,78],[28,44]],
    Arrow:[[26,38],[54,38],[54,26],[78,50],[54,74],[54,62],[26,62]],
    'Double arrow':[[22,50],[40,30],[40,42],[60,42],[60,30],[78,50],[60,70],[60,58],[40,58],[40,70]],
    Chevron:[[26,28],[44,28],[74,50],[44,72],[26,72],[56,50]],
    Cross:[[42,26],[58,26],[58,42],[74,42],[74,58],[58,58],[58,74],[42,74],[42,58],[26,58],[26,42],[42,42]],
    'Lightning bolt':[[48,24],[70,24],[56,44],[73,44],[33,80],[44,56],[28,56]],
    'Speech bubble':[[26,28],[74,28],[74,64],[47,64],[32,77],[32,64],[26,64]]
  };
  if(polygons[type])poly(polygons[type]);
  else if(type==='Rectangle'||type==='Square')addPath(primitive('rectangle',{x:26,y:type==='Square'?26:34},{x:74,y:type==='Square'?74:66}),true,type);
  else if(type==='Circle'||type==='Ellipse')addPath(ellipse(26,type==='Circle'?26:34,48,type==='Circle'?48:32),true,type);
  else if(type==='Rounded rectangle')bezier([[34,30,null,null],[66,30,null,null,70.42,30],[74,38,74,33.58],[74,62,null,null,74,66.42],[66,70,70.42,70],[34,70,null,null,29.58,70],[26,62,26,66.42],[26,38,null,null,26,33.58]].map((p,i)=>i===0?[34,30,29.58,30]:p));
  else if(['Pentagon','Hexagon','Heptagon','Octagon'].includes(type))poly(radial({Pentagon:5,Hexagon:6,Heptagon:7,Octagon:8}[type]));
  else if(type.includes('-point'))poly(radial(parseInt(type)*2,type.includes('burst')?.72:.43));
  else if(type==='X cross'){
    const p=poly(polygons.Cross);transformPath(p,(x,y)=>({x:50+((x-50)-(y-50))*Math.SQRT1_2,y:50+((x-50)+(y-50))*Math.SQRT1_2}));
  }
  else if(type==='Gear'||type==='Ring'){
    if(type==='Gear')poly(Array.from({length:48},(_,i)=>{const a=i*Math.PI/24,r=i%4===1||i%4===2?24:19;return [50+Math.cos(a)*r,50+Math.sin(a)*r]}));
    else addPath(ellipse(26,26,48,48),true,type);
    // Return around the inner contour in reverse, joined by a retraced seam.
    // This makes a single even-odd path, so the hole travels with the shape.
    const p=selectedPath(),outerFirst=clone(p.Nodes[0]),inner=ellipse(type==='Gear'?42:34,type==='Gear'?42:34,type==='Gear'?16:32,type==='Gear'?16:32);
    p.Nodes.push(outerFirst);outerFirst.Out=null;p.Nodes[0].In=null;
    const reversed=inner.reverse().map(n=>({...n,In:n.Out,Out:n.In}));
    p.Nodes.push(...reversed,{...clone(reversed[0]),Out:null});
    reversed[0].In=null;
  }
  else if(type==='Line')addPath([node(26,50),node(74,50)],false,type).Thickness=4;
  else if(type==='Curve')bezier([[26,65,null,null,26,15],[74,35,74,85]],false).Thickness=4;
  else if(type==='Arc')bezier([[26,62,null,null,26,24],[74,62,74,24]],false).Thickness=4;
  else if(type==='Semicircle')bezier([[26,62,null,null,26,48.75],[50,38,36.75,38,63.25,38],[74,62,74,48.75]]);
  else if(type==='Quarter circle')bezier([[26,26,null,null,52.51,26],[74,74,74,47.49],[26,74]]);
  else if(type==='Crescent')bezier([[65,26,25,26,40,33],[65,74,40,67,25,74],[26,50,26,65,26,35]]);
  else if(type==='Heart')bezier([[50,37,null,null,63,15],[50,77,98,35,2,35],[50,37,37,15]]);
  else if(type==='Teardrop')bezier([[50,24,null,null,58,39],[74,59,74,47,74,84],[26,59,26,84,26,47],[50,24,42,39]]);
  else if(type==='Leaf')bezier([[30,25,25,60,68,25],[70,75,75,40,32,75]]);
  else if(type==='Shield')bezier([[28,28],[72,28],[70,56,null,null,68,69],[50,78,57,74,43,74],[30,56,32,69]]);
  const dx=Math.max(25,Math.min(75,50+lab.panX))-50,dy=Math.max(25,Math.min(75,50+lab.panY))-50;
  for(const path of lab.design.Paths.slice(start))transformPath(path,(x,y)=>({x:x+dx,y:y+dy}));
  lab.selected=start;lab.node=-1;lab.penPath=-1;
}
$('labPart').onchange=e=>{
  const type=e.target.value;if(!type)return;labRemember();addLabShape(type);labTool('select');labChanged();labStatus(type+' added · drag corners to resize, or use Edit points');e.target.value='';
};
function suggestSpinAxis(animation){
  const points=lab.design.Paths.filter(path=>path.Visible).flatMap(path=>path.Nodes.map(n=>({X:n.X,Y:n.Y})));
  if(points.length<2)return;
  const cx=points.reduce((s,p)=>s+p.X,0)/points.length,cy=points.reduce((s,p)=>s+p.Y,0)/points.length;
  const xx=points.reduce((s,p)=>s+(p.X-cx)**2,0),yy=points.reduce((s,p)=>s+(p.Y-cy)**2,0);
  const xy=points.reduce((s,p)=>s+(p.X-cx)*(p.Y-cy),0),angle=.5*Math.atan2(2*xy,xx-yy);
  const dx=Math.cos(angle),dy=Math.sin(angle),sorted=[...points].sort((a,b)=>((a.X-cx)*dx+(a.Y-cy)*dy)-((b.X-cx)*dx+(b.Y-cy)*dy));
  let start=sorted[0],end=sorted[sorted.length-1];
  if(Math.hypot(start.X-end.X,start.Y-end.Y)<2)return;
  const hotspot=lab.design.Hotspot;
  if(Math.hypot(start.X-hotspot.X,start.Y-hotspot.Y)>Math.hypot(end.X-hotspot.X,end.Y-hotspot.Y))[start,end]=[end,start];
  animation.AxisStart={X:Math.max(0,Math.min(99.99,start.X)),Y:Math.max(0,Math.min(99.99,start.Y))};
  animation.AxisEnd={X:Math.max(0,Math.min(99.99,end.X)),Y:Math.max(0,Math.min(99.99,end.Y))};
  animation.AxisConfigured=true;
}
function animationDirections(preset){
  if(['Rotate','Orbit','Shimmer','Spin Axis'].includes(preset))return [['Forward','Clockwise'],['Reverse','Counterclockwise']];
  if(preset==='Float')return [['Forward','Vertical'],['Horizontal','Horizontal']];
  return [['Forward','Automatic']];
}
const animationPresets=['None','Rotate','Pulse','Orbit','Float','Shimmer','Spin Axis','Blink'];
function availableAnimationPresets(){
  const hasDecorations=!!lab.design&&decorativePaths().length>0;
  const nonClickRole=['Wait','No'].includes(lab.role);
  return animationPresets.filter(preset=>
    !['Orbit','Float'].includes(preset)&&preset!=='Blink' || hasDecorations || (preset==='Blink'&&nonClickRole));
}
function syncAnimationControls(){
  if(!lab.design)return;const a=ensureDesignAnimation();
  const available=availableAnimationPresets();
  if(!available.includes(a.Preset)){a.Preset='None';a.Target='All';a.TargetPathIds=[]}
  const preset=a.Preset||'None',wholeOnly=['Shimmer'].includes(preset);
  $('labAnimationPreset').innerHTML=available.map(value=>'<option>'+value+'</option>').join('');
  const guided=guidedPreset(preset);
  $('labAnimationPreset').value=preset;$('labAnimationSpeed').value=a.Speed;$('labAnimationSpeedValue').textContent=a.Speed;
  $('labAnimationIntensity').value=a.Intensity;$('labAnimationIntensityValue').textContent=a.Intensity;
  $('labAnimationTarget').value=wholeOnly?'All':a.Target;$('labAnimationTarget').disabled=preset==='None'||wholeOnly;
  $('labAnimationTarget').querySelector('[value="All"]').disabled=guided;
  $('labAnimationSpeed').disabled=preset==='None';$('labAnimationIntensity').disabled=preset==='None';
  const options=animationDirections(preset);$('labAnimationDirection').innerHTML=options.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');
  if(!options.some(([value])=>value===a.Direction))a.Direction=options[0][0];$('labAnimationDirection').value=a.Direction;$('labAnimationDirection').disabled=options.length===1||preset==='None';
  $('labAxisControls').hidden=preset!=='Spin Axis';
  for(const [id,value] of Object.entries({labAxisStartX:a.AxisStart.X,labAxisStartY:a.AxisStart.Y,labAxisEndX:a.AxisEnd.X,labAxisEndY:a.AxisEnd.Y}))$(id).value=Math.round(value*100)/100;
}
function mutateAnimation(fn){labRemember();const a=ensureDesignAnimation();fn(a);a.Loop=true;syncAnimationControls();labChanged()}
$('labAnimationPreset').onchange=e=>{
  const preset=e.target.value;
  if(guidedPreset(preset)){
    const choices=decorativePaths();
    if(!choices.length){e.target.value=ensureDesignAnimation().Preset;labStatus('To use '+preset+', add a separate shape, select it, and check Decorative shape. Keep it away from the gold click point.');return}
    const preferred=choices.includes(selectedPath())?selectedPath():choices.find(p=>ensureDesignAnimation().TargetPathIds.includes(p.Id))||choices.at(-1);
    mutateAnimation(a=>{a.Preset=preset;a.Direction='Forward';a.Target='Selected';a.TargetPathIds=[preferred.Id]});
    labStatus(preset+' now moves '+preferred.Name+'. The cursor and its click point stay in place.');return;
  }
  mutateAnimation(a=>{a.Preset=preset;a.Direction='Forward';if(preset==='Spin Axis'&&!a.AxisConfigured)suggestSpinAxis(a);if(preset==='Shimmer')a.Target='All';if(a.Target==='Selected'&&!a.TargetPathIds.length&&selectedPath())a.TargetPathIds=[selectedPath().Id]});
  if(preset==='Spin Axis')labStatus('Drag the two gold handles on the canvas to set the spin line. The click point stays in the same place.');
};
$('labAnimationTarget').onchange=e=>{
  const a=ensureDesignAnimation();
  if(guidedPreset(a.Preset)&&e.target.value==='All'){e.target.value='Selected';labStatus('This animation can only move a decorative shape, not the whole cursor.');return}
  mutateAnimation(animation=>{animation.Target=e.target.value;if(animation.Target==='Selected'&&!animation.TargetPathIds.length){const candidate=guidedPreset(animation.Preset)?decorativePaths()[0]:selectedPath();if(candidate)animation.TargetPathIds=[candidate.Id]}});
};
$('labAnimationSpeed').oninput=e=>$('labAnimationSpeedValue').textContent=e.target.value;
$('labAnimationSpeed').onchange=e=>mutateAnimation(a=>a.Speed=Number(e.target.value));
$('labAnimationIntensity').oninput=e=>$('labAnimationIntensityValue').textContent=e.target.value;
$('labAnimationIntensity').onchange=e=>mutateAnimation(a=>a.Intensity=Number(e.target.value));
$('labAnimationDirection').onchange=e=>mutateAnimation(a=>a.Direction=e.target.value);
for(const [id,endpoint,coordinate] of [['labAxisStartX','AxisStart','X'],['labAxisStartY','AxisStart','Y'],['labAxisEndX','AxisEnd','X'],['labAxisEndY','AxisEnd','Y']]){
  $(id).onchange=e=>{
    const a=ensureDesignAnimation(),value=Number(e.target.value);
    if(!Number.isFinite(value)){syncAnimationControls();return}
    const next={...a[endpoint],[coordinate]:Math.max(0,Math.min(99.99,value))},other=a[endpoint==='AxisStart'?'AxisEnd':'AxisStart'];
    if(Math.hypot(next.X-other.X,next.Y-other.Y)<1){labStatus('The two gold axis handles need to stay at least one grid unit apart.');syncAnimationControls();return}
    mutateAnimation(animation=>{animation[endpoint]=next;animation.AxisConfigured=true});
  };
}
$('labSkin').onchange=e=>{
  const skin=materials.find(m=>m.Id===e.target.value);if(!skin)return;
  lab.snapshot.Skin=clone(skin.Settings);
  if(skin.Color)lab.snapshot.Color=clone(skin.Color);
  else{lab.snapshot.Color.Rgb=false;lab.snapshot.Color.Primary=skin.Settings.Primary;lab.snapshot.Color.Secondary=skin.Settings.Secondary}
  if(skin.Rendering)lab.snapshot.Rendering=clone(skin.Rendering);
  labSafety('Checking cursor safety…');lab.rev++;labSchedulePreview();
};
function stopLabPreviewAnimation(){if(lab.previewRaf)cancelAnimationFrame(lab.previewRaf);lab.previewRaf=0;lab.previewFrames=[];lab.previewIndex=-1}
function playLabPreview(now){
  if(!lab.previewFrames.length)return;
  const index=Math.floor(((now-lab.previewStart)%lab.previewDuration)/lab.previewDuration*lab.previewFrames.length);
  if(index!==lab.previewIndex){lab.previewIndex=index;$('labPreview').src=lab.previewFrames[index]}
  lab.previewRaf=requestAnimationFrame(playLabPreview);
}
function labSchedulePreview(){clearTimeout(lab.timer);const animated=ensureDesignAnimation().Preset!=='None'||lab.snapshot?.Color.Rgb;lab.timer=setTimeout(labRender,animated?320:150)}
async function labRender(){
  if(shell.hidden||!lab.design)return;
  if(lab.previewBusy){lab.pendingPreview=true;return}
  lab.previewBusy=true;lab.pendingPreview=false;const rev=lab.rev;
  try{
    const animation=ensureDesignAnimation(),animated=animation.Preset!=='None'||lab.snapshot.Color.Rgb,action=animated?'labPreviewFrames':'labPreview';
    const r=await call(action,{role:lab.role,design:clone(lab.design)},clone(lab.snapshot));
    if(rev===lab.rev){
      stopLabPreviewAnimation();
      if(r.images?.length>1){
        const unsafeFrame=Number(r.safety?.match(/Frame (\d+)/)?.[1]||0);
        if(unsafeFrame>0){$('labPreview').src=r.images[Math.min(r.images.length-1,unsafeFrame-1)];labStatus('Preview stopped on a frame where the cursor would lose its safe click point. Move the animated shape away from the gold click point, or change what the animation affects.')}
        else{lab.previewFrames=r.images;lab.previewDuration=r.durationMs||1200;lab.previewStart=performance.now();lab.previewIndex=-1;playLabPreview(lab.previewStart)}
      }
      else $('labPreview').src=r.image||r.images?.[0]||'';
      labSafety(r.safety);
      if(!lab.dirty)labStatus(animated?'Ready · animated preview uses '+r.count+' sample frames':'Ready · Done returns these changes to your project');
    }
  }
  catch(e){if(rev===lab.rev){labSafety(e.error||'Cursor safety could not be checked');labStatus(e.error||'Preview unavailable')}}
  finally{lab.previewBusy=false;if(lab.pendingPreview||rev!==lab.rev)labSchedulePreview()}
}
let closeAfterRoleSave=false;
function showRoleSaveDialog(closeAfter=false){
  const creatingTheme=!project.CustomFamilyId;closeAfterRoleSave=closeAfter;
  $('labSaveRole').innerHTML=roleIds.map((r,i)=>'<option value="'+r+'">'+roleNames[i]+'</option>').join('');$('labSaveRole').value=lab.role;
  $('labThemeNameRow').hidden=!creatingTheme;$('labThemeName').required=creatingTheme;
  $('labSaveTitle').textContent=creatingTheme?'Create a new custom theme':'Save role to custom theme';
  $('labSaveGuidance').textContent=creatingTheme?(lab.blankSet?'Name this blank custom theme. Each remaining Windows role stays empty until you design it.':'Built-in themes are protected. Name a new theme; every unchanged role will be copied from '+familyName(project.FamilyId)+'.'):'Only this role will change in your custom theme.';
  if(creatingTheme){
    let suggestion=(lab.blankSet?'Blank canvas':familyName(project.FamilyId))+' custom',suffix=2;
    const names=new Set(customFamilies.map(f=>f.Name.toLowerCase()));
    while(names.has(suggestion.toLowerCase()))suggestion=(lab.blankSet?'Blank canvas':familyName(project.FamilyId))+' custom '+suffix++;
    $('labThemeName').value=suggestion;
  }
  $('labSaveForm').querySelector('[type=submit]').textContent=creatingTheme?'Create custom theme':'Save role';
  $('labSaveDialog').hidden=false;checkSaveRole();
  if(creatingTheme)setTimeout(()=>$('labThemeName').focus(),0);
}
$('labSave').onclick=()=>finishUnifiedLab(true);
let labCheckToken=0;
async function checkSaveRole(){
  const token=++labCheckToken,submit=$('labSaveForm').querySelector('[type=submit]');
  submit.disabled=true;$('labSaveNote').textContent='Checking the cursor at Windows size…';
  try{
    const checked=await call('labCheck',{role:$('labSaveRole').value,design:clone(lab.design)},clone(project));
    if(token!==labCheckToken||$('labSaveDialog').hidden)return;
    $('labSaveNote').textContent=checked.safety||'Ready to save this role.';
    submit.disabled=!!checked.safety;
  }catch(error){if(token===labCheckToken){$('labSaveNote').textContent=error.error||'Safety check failed';submit.disabled=true}}
}
$('labSaveRole').onchange=checkSaveRole;
$('labSaveCancel').onclick=()=>{closeAfterRoleSave=false;pendingLabRole=null;$('labSaveDialog').hidden=true};
async function saveRoleToProject(assigned,themeName=''){
  const r=await call('labSave',{role:assigned,design:clone(lab.design),newSet:lab.newSet,blankSet:lab.blankSet,themeName},clone(project));
  customFamilies=r.customFamilies;project=r.project;committed=clone(project);lab.familyId=project.CustomFamilyId||null;lab.entryProject=clone(project);lab.geometryBaseline=JSON.stringify(lab.design);lab.newSet=false;lab.blankSet=false;lab.role=assigned;lab.dirty=false;
  role=assigned;revision++;roleImages.clear();clearAnimation();renderControls();renderCatalog();updateState();
  $('labTemplate').value=lab.role;$('labSave').textContent='Done';labStatus('Changes returned to your project. Use Save project to keep a named copy.');saveLabDraft().catch(()=>{});
}
$('labSaveForm').onsubmit=async e=>{
  e.preventDefault();const submit=e.submitter;submit.disabled=true;
  try{
    const shouldClose=closeAfterRoleSave,next=pendingLabRole;await saveRoleToProject($('labSaveRole').value,$('labThemeName').value.trim());$('labSaveDialog').hidden=true;closeAfterRoleSave=false;if(next)await switchLabRole(next);else if(shouldClose)await closeLabNow();
  }catch(e){$('labSaveNote').textContent=e.error||e.message||'Save failed'}
  finally{submit.disabled=false}
};
async function closeLabNow(){
  clearTimeout(labPersistTimer);clearTimeout(lab.timer);stopLabPreviewAnimation();
  try{await call('closeLabWindow',{},null)}catch(e){labStatus('Cursor Lab could not close. Try again.')}
}
async function flushLabAndClose(){
  if(!$('labExitDialog').hidden)return;
  pendingLabRole=null;$('labExitTitle').textContent='KEEP YOUR LAB CHANGES?';$('labExitSave').textContent='Keep changes and close';
  if(lab.dirty){
    $('labExitMessage').textContent=lab.safety||'Your Lab edits have not been returned to the project yet.';
    $('labExitSave').disabled=!!lab.safety;$('labExitDialog').hidden=false;return;
  }
  await closeLabNow();
}
$('labClose').onclick=flushLabAndClose;
$('labExitCancel').onclick=()=>{pendingLabRole=null;$('labExitDialog').hidden=true};
$('labExitDiscard').onclick=discardUnifiedLab;
$('labExitSave').onclick=async()=>{
  await finishUnifiedLab(!pendingLabRole);
};
// A double-click offers a direct transition from object selection to point editing.
$('labCanvas').ondblclick=e=>{
  if(e.target.dataset.layer!==undefined){
    lab.selected=Number(e.target.dataset.layer);if(!editablePath()){labDraw();labInspector();return}labTool('points');labInspector();
  }
};
document.querySelector('[data-lab-tool="select"]').title='Move shapes; drag corner handles to resize or the round handle to rotate. Hold Shift to constrain.';
document.querySelector('[data-lab-tool="points"]').title='Drag a box to select points, Ctrl-click to add/remove points, then drag or nudge them together. Arrows use the Snap grid, or 1 unit with Snap off. Double-click a shape to enter this mode.';
document.querySelector('[data-lab-tool="pen"]').title='Optional precision tool: click for straight corner points, drag for a curve, and press Enter to finish.';
document.querySelector('[data-lab-tool="freehand"]').title='Draw naturally; Cursor Lab fits the stroke to editable points using the Point detail setting.';

$('labLayers').ondblclick=e=>{
  const button=e.target.closest('[data-layer-select]');if(!button)return;
  const p=lab.design.Paths[Number(button.dataset.layerSelect)];
  if(!editablePath(p))return;
  const input=document.createElement('input');input.value=p.Name;input.maxLength=80;input.title='Shape name';
  button.replaceWith(input);input.focus();input.select();
  let finished=false;
  const finish=save=>{if(finished)return;finished=true;if(save&&input.value.trim()!==p.Name){labRemember();p.Name=input.value.trim()||'Path';labChanged()}else labDraw()};
  input.onblur=()=>finish(true);
  input.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();finish(true)}if(ev.key==='Escape'){ev.preventDefault();finish(false)}};
};
async function refreshAfterLab(){
  const r=await call('catalog',{},null);
  workspaceEpoch++;clearTimeout(workspaceSaveTimer);adoptHostState(r);
  project=r.project;customFamilies=r.customFamilies;labDraft=r.draft;materials=r.materials;
  currentProjectId=r.currentProjectId??null;projects=r.projects||projects;savedProjectSnapshot=r.savedProject?clone(r.savedProject):null;
  committed=clone(project);history=[];future=[];lastEditKey='';revision++;roleImages.clear();clearAnimation();
  renderControls();renderCatalog();renderProjectLibrary();updateState();schedulePreview();syncFamilyThumbnails();
  if(effectsRunning)syncRunningEffects();
}
document.addEventListener('keydown',e=>{
  if(shell.hidden||!e.ctrlKey||['INPUT','TEXTAREA'].includes(e.target.tagName))return;
  const key=e.key.toLowerCase();
  if(!['s','z','y'].includes(key))return;
  e.preventDefault();e.stopImmediatePropagation();
  $(key==='s'?'labSave':key==='y'||e.shiftKey?'labRedo':'labUndo').click();
},true);
// Synchronous editor regression check. It swaps in a scratch document and never
// contacts the host, saves a draft, or touches the user's projects/library.
function runLabEditingSmoke(){
  const saved={...lab},focused=document.activeElement,status=$('labStatusText').textContent,checks=[];
  const require=(condition,message)=>{if(!condition)throw new Error(message);checks.push(message)};
  try{
    Object.assign(lab,{editingSmoke:true,design:{Version:1,Paths:[],Hotspot:{X:13,Y:8},HotspotSet:false},selected:-1,node:-1,history:[],future:[],tool:'select',drag:null,safety:'Scratch check',penPath:-1});
    const p=addPath(primitive('rectangle',{x:20,y:20},{x:65,y:65}),true,'Smoke rectangle');
    ensureDesignAnimation();labDraw();labInspector();
    require($('labSelectionName').textContent==='Smoke rectangle'&&!$('labX').disabled,'Selection identifies an editable shape');
    togglePathLock(0);
    require(p.Locked&&JSON.parse(JSON.stringify(lab.design)).Paths[0].Locked,'Lock survives document serialization');
    require($('labX').disabled&&$('labDelete').disabled&&$('labLockSelected').textContent==='Unlock','Locked inspector clearly offers Unlock');
    const locked=JSON.stringify(lab.design),history=lab.history.length;
    mutatePath(path=>path.Nodes[0].X+=10);$('labDelete').onclick();
    const svg=$('labCanvas'),point=new DOMPoint(30,30).matrixTransform(svg.getScreenCTM());
    svg.onpointerdown({button:0,target:svg.querySelector('[data-layer="0"]'),clientX:point.x,clientY:point.y,pointerId:1,preventDefault(){}});
    require(JSON.stringify(lab.design)===locked&&lab.history.length===history&&!lab.drag,'Locked shape rejects edits, deletion and canvas drag');
    require(!svg.querySelector('[data-resize]'),'Locked shape has no misleading resize handles');
    labTool('points');labInspector();
    require(!svg.querySelector('[data-node]'),'Locked shape has no editable point handles');
    $('labDuplicate').onclick();
    require(lab.design.Paths.length===2&&lab.design.Paths[0].Locked&&!selectedPath().Locked,'Duplicate makes an unlocked copy and protects the original');
    const order=lab.design.Paths.map(path=>path.Id).join();$('labUp').onclick();
    require(lab.design.Paths.map(path=>path.Id).join()===order,'Reordering cannot displace a locked neighbor');
    $('labUndo').onclick();require(lab.design.Paths.length===1&&selectedPath().Locked,'Undo restores locked state');
    $('labRedo').onclick();require(lab.design.Paths.length===2&&!lab.design.Paths[1].Locked,'Redo restores the editable copy');
    lab.selected=0;togglePathLock(0);labTool('points');lab.node=0;labDraw();labInspector();
    require(!selectedPath().Locked&&!$('labNodeX').disabled&&!!svg.querySelector('[data-node]'),'Unlock restores point editing');
    const before=selectedPath().Nodes[0].X;mutatePath(path=>path.Nodes[0].X+=2);
    require(selectedPath().Nodes[0].X===before+2,'Unlocked points can change');
    return {ok:true,checks};
  }finally{
    Object.assign(lab,saved);delete lab.editingSmoke;labDraw();labInspector();labStatus(status);
    document.querySelectorAll('[data-lab-tool]').forEach(button=>button.classList.toggle('selected',button.dataset.labTool===lab.tool));
    if(focused?.isConnected)focused.focus();
  }
}
async function runLabSmoke(){
  if(document.querySelectorAll('[data-role]').length!==17)throw new Error('Role cards missing');
  if(!$('effectsToggle'))throw new Error('Effects toggle missing');
  await loadLabRole('Arrow');
  if(!lab.design?.Paths.length)throw new Error('Built-in capture failed');
  runLabEditingSmoke();
  $('labPart').value='Ring';$('labPart').dispatchEvent(new Event('change'));
  if(selectedPath().Name!=='Ring')throw new Error('Editable ring failed');
  const componentStart=lab.design.Paths.length;
  addLabShape('Gear');
  if(lab.design.Paths.length!==componentStart+1||selectedPath().Name!=='Gear')throw new Error('Editable shape failed');
  $('labUndo').click();$('labRedo').click();
  const saved=await call('labSave',{role:'Arrow',design:clone(lab.design),themeName:'Verification theme'},clone(project));
  if(!saved.project.Roles.Arrow.Design)throw new Error('Project role save failed');
  const saved2=await call('labSave',{role:'Help',design:clone(lab.design)},saved.project);
  if(!saved2.project.Roles.Arrow.Design||!saved2.project.Roles.Help.Design)throw new Error('Project role merge failed');
  const image=await call('labPreview',{role:'Arrow',design:clone(lab.design)},clone(lab.snapshot));
  $('labPreview').src=image.image;await $('labPreview').decode();
  labStatus('Verified: capture, editable components, Boolean paths, undo/redo, save and role isolation');
}

// Reset remains a Lab edit, so it shares Undo, Redo, safety and Done.
$('labResetHotspot').onclick=()=>{
  if(!lab.design||!lab.defaultHotspot)return;
  setHotspotOnPoint(lab.defaultHotspot,true);
};
