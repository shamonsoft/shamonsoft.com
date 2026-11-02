// Original AML effect: a planar recursive rosette, rendered at the composition's exact size.
// No imported shader, image asset, dependency, random clock or offscreen animation loop.
(() => {
  const definitions = [
    ['symmetry','Symmetry',38,'Number of mirrored petals: 4–20.'],
    ['recursion','Recursion',60,'Continuous recursive depth and intricacy: 2–7 levels. Fine levels fade below pixel size.'],
    ['scale','Scale',56,'Size of the complete rosette; remains circular at any aspect ratio.'],
    ['beatReact','Beat reactiveness',50,'Master music response: 0 off, 50 standard, 100 stronger. Automatic animation stays independent.'],
    ['morph','Morph',42,'Resting petal shape and recursive folds, from rounder forms to sharper, deeper ornament.'],
    ['filigree','Filigree',62,'Strength of the fine nested ornament.'],
    ['rotation','Rotation',50,'Counterclockwise at the left, stationary at the center, clockwise at the right.'],
    ['evolution','Evolution',40,'Speed of continuous unfolding. Music-driven twists, petal impacts and beat waves still respond at zero.'],
    ['ringMotion','Ring motion',72,'Independent ring motion plus short opposing twists on detected beats. Zero stops both.'],
    ['shapeFlow','Shape flow',70,'Continuous petal stretching, bending and unfolding; independent of overall scale and rotation.'],
    ['ripples','Beat ripples',66,'Beat-triggered waves travel outward, deforming and illuminating successive rings.'],
    ['growth','Detail growth',56,'Smoothly reveals deeper ornament as music intensifies; quieter sections become simpler.'],
    ['width','Line width',32,'Fine engraved threads through broad luminous ribbons.'],
    ['glow','Glow',48,'Soft local light around the threads; does not blur the composition.'],
    ['hue','Hue',208,'Base color, following the shared orange-to-red spectrum.'],
    ['spread','Color spread',72,'Color separation across the ornament. Zero is monochrome, including RGB Flow; no hidden minimum.'],
    ['saturation','Saturation',86,'From silver-white to rich chromatic light.'],
    ['brightness','Brightness',65,'Exposure with a soft highlight rolloff.'],
    ['bass','Bass expansion',28,'Low frequencies expand the geometry without moving its center.'],
    ['mid','Midrange morph',60,'Midrange and detected beats visibly flex the petals and branches. Zero removes this response.'],
    ['treble','Treble detail',55,'Treble and percussive transients drive fine engraving and local edge accents. Zero removes this response.'],
    ['opacity','Opacity',100,'Zero is completely clear; 100 is the full effect.']
  ];
  const looks = [
    {name:'Prismatic Crown',ringMotion:72,shapeFlow:70,ripples:66,growth:56,style:'rosette',symmetry:38,recursion:60,scale:56,beatReact:50,morph:42,filigree:62,rotation:50,evolution:40,width:32,glow:48,hue:208,spread:72,saturation:86,brightness:65,bass:28,mid:60,treble:55,opacity:100},
    {name:'Glacial Cathedral',ringMotion:45,shapeFlow:42,ripples:58,growth:42,style:'crystal',symmetry:25,recursion:40,scale:66,beatReact:50,morph:20,filigree:45,rotation:49,evolution:16,width:24,glow:35,hue:175,spread:26,saturation:60,brightness:62,bass:28,mid:25,treble:38,opacity:100},
    {name:'Orchid Lace',ringMotion:54,shapeFlow:82,ripples:50,growth:74,style:'lace',symmetry:50,recursion:80,scale:64,beatReact:50,morph:62,filigree:78,rotation:51,evolution:22,width:19,glow:38,hue:262,spread:45,saturation:78,brightness:60,bass:35,mid:55,treble:65,opacity:100},
    {name:'Solar Lotus',ringMotion:50,shapeFlow:72,ripples:70,growth:48,style:'lotus',symmetry:25,recursion:60,scale:67,beatReact:50,morph:38,filigree:55,rotation:50,evolution:18,width:44,glow:52,hue:12,spread:27,saturation:82,brightness:64,bass:50,mid:30,treble:40,opacity:100},
    {name:'Electric Sapphire',ringMotion:80,shapeFlow:66,ripples:80,growth:76,style:'crystal',symmetry:63,recursion:80,scale:64,beatReact:50,morph:75,filigree:72,rotation:53,evolution:35,width:21,glow:56,hue:216,spread:55,saturation:92,brightness:58,bass:55,mid:45,treble:72,opacity:100},
    {name:'Pearl Nocturne',ringMotion:30,shapeFlow:38,ripples:40,growth:34,style:'rosette',symmetry:13,recursion:40,scale:61,beatReact:50,morph:18,filigree:40,rotation:50,evolution:12,width:36,glow:30,hue:275,spread:33,saturation:20,brightness:58,bass:20,mid:20,treble:30,opacity:100}
  ];
  const card=document.createElement('section');
  card.className='anim-card collapsed'; card.dataset.effectId='fractalKaleidoscope';
  card.innerHTML=`<div class="anim-head"><div class="anim-head-main"><div class="anim-title">Fractal Kaleidoscope</div></div><div class="anim-head-actions"><select id="aml-kaleidoscope-rgb-mode" class="rgb-mode-select" aria-label="Fractal Kaleidoscope RGB style"><option value="cycle">Cycle</option><option value="flow" selected>Flow</option></select><button class="collapse-btn" type="button" aria-label="Expand Fractal Kaleidoscope settings" aria-expanded="false" aria-controls="aml-kaleidoscope-body">▸</button><label class="toggle"><input id="aml-kaleidoscope-enabled" type="checkbox" aria-label="Enable Fractal Kaleidoscope"><span></span></label></div></div>
    <div id="aml-kaleidoscope-body" class="anim-body" hidden>
      <select id="aml-kaleidoscope-look" class="anim-select" aria-label="Fractal Kaleidoscope look">${looks.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}</select>
      <select id="aml-kaleidoscope-style" class="anim-select" aria-label="Fractal geometry"><option value="rosette">Rosette · cut-glass petals</option><option value="crystal">Crystal · faceted geometry</option><option value="lace">Lace · woven filaments</option><option value="lotus">Lotus · flowing petals</option></select>
      <div class="slider-grid">${definitions.map(([key,label,value,title])=>`<div class="slider-cell"><div class="slider-label-row"><label for="aml-kaleidoscope-${key}">${label}</label></div><input id="aml-kaleidoscope-${key}" class="real-slider ${key==='hue'?'spectrum-slider':''}" type="range" min="0" max="${key==='hue'?360:100}" step="1" value="${value}" title="${title}"></div>`).join('')}</div>
      <p class="shamonsoft-audio-metrics aml-kaleidoscope-status" role="status" hidden></p>
    </div>`;
  document.querySelector('[data-effect-id="proceduralScene"]')?.after(card);
  if(!card.isConnected)document.getElementById('left-rail')?.append(card);
  const enabled=card.querySelector('.toggle input'),body=card.querySelector('.anim-body');
  const look=card.querySelector('#aml-kaleidoscope-look'),style=card.querySelector('#aml-kaleidoscope-style');
  const inputs=Object.fromEntries(definitions.map(([key])=>[key,card.querySelector('#aml-kaleidoscope-'+key)]));
  const values=Object.fromEntries(definitions.map(([key,,v])=>[key,v]));
  for(const[key,input]of Object.entries(inputs)){
    const read=()=>{values[key]=Number(input.value);if(key==='symmetry'||key==='recursion')input.setAttribute('aria-valuetext',String(key==='symmetry'?4+Math.round(values[key]*.16):(2+values[key]*.05).toFixed(2)))};
    input.addEventListener('input',read); input.addEventListener('change',read);read();
  }
  card.querySelector('.collapse-btn').addEventListener('click',event=>{
    const collapsed=card.classList.toggle('collapsed');body.hidden=collapsed;
    event.currentTarget.setAttribute('aria-expanded',String(!collapsed));event.currentTarget.textContent=collapsed?'▸':'▾';
  });
  look.addEventListener('change',()=>{
    const p=looks[Number(look.value)];if(!p)return;
    style.value=p.style;
    style.dispatchEvent(new Event('input',{bubbles:true}));
    // Looks choose geometry; the shared sliders remain the user's settings.
  });
  const vertex=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const fragment=`
    precision highp float;
    varying vec2 vUv;
    uniform vec2 uResolution;
    uniform vec4 uGeometry; // symmetry, maximum recursion, scale, fixed center
    uniform vec4 uShape; // resting morph, filigree, line width, geometry family
    uniform vec4 uLight; // hue, spread, saturation, exposure
    uniform vec4 uMotion; // evolution phase, whole-object rotation, treble detail, glow
    uniform vec4 uFlow; // counter-rotation, shape flow, ripple strength, detail growth
    uniform vec4 uAudio; // bass, mid, treble, smoothed musical intensity
    uniform vec4 uWaveAge;
    uniform vec4 uWavePower;
    uniform float uWaveSpeed;
    uniform vec3 uBeatTurns;
    uniform float uColorFlow;
    const float PI=3.14159265359;
    mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
    vec3 palette(float h){vec3 p=abs(fract(h+vec3(0.,.6666667,.3333333))*6.-3.);return mix(vec3(1.),clamp(p-1.,0.,1.),uLight.z);}
    vec2 fold(vec2 p,float n){float sector=2.*PI/n;float a=mod(atan(p.y,p.x)+sector*.5,sector)-sector*.5;return length(p)*vec2(cos(a),abs(sin(a)));}
    float line(float d,float width){
      float aa=1.4/uResolution.y;
      #ifdef AML_DERIVATIVES
        aa=max(aa,fwidth(d));
      #endif
      float core=(1.-smoothstep(max(0.,width-aa),width+aa,d))*min(1.,width*1.6/max(aa,.00001));
      return core+exp(-d/max(width*4.,.00001))*uMotion.w*.32;
    }
    void main(){
      vec2 p=(vUv-.5)*vec2(uResolution.x/uResolution.y,1.)*2./uGeometry.z;
      float radius=length(p),phase=uMotion.x,flow=uFlow.y;
      float envelope=1.-smoothstep(1.18,1.48,radius);
      float hole=smoothstep(uGeometry.w,uGeometry.w+.025,radius);
      float wave=0.,crest=0.;
      // Four bounded traveling fronts; their positions depend on elapsed time,
      // never frame number or a screen-wide flash envelope.
      for(int i=0;i<4;i++){
        float age=uWaveAge[i];
        if(age>=0.){
          float front=age*uWaveSpeed;
          float distance=radius-front;
          float fade=(1.-smoothstep(1.20,1.64,front))*uWavePower[i]*uFlow.z;
          float band=exp(-distance*distance/0.0144)*fade;
          wave+=band*sin(distance*19.);
          crest+=exp(-distance*distance/0.0018)*fade;
        }
      }
      // The front bends geometry locally as it crosses each ring.
      p*=1.+wave*.10;
      float r=length(p);
      float outerAngle=atan(p.y,p.x)+uMotion.y+(phase*.18+uBeatTurns.x)*uFlow.x;
      float innerAngle=atan(p.y,p.x)+uMotion.y+(phase*.41+uBeatTurns.z)*uFlow.x;
      float outerPetal=cos(outerAngle*uGeometry.x);
      float innerPetal=cos(innerAngle*uGeometry.x);
      float morphBias=uShape.x-.42;
      float breath=flow*sin(phase*.93);
      float bending=flow*sin(phase*.61+1.3)+uAudio.y*.75;
      float mainRing=.63+(.145+morphBias*.13+breath*.055+uAudio.y*.085+uAudio.x*.025)*outerPetal
        +(.018+morphBias*.065+bending*.023)*(2.*outerPetal*outerPetal-1.);
      float innerRing=.265+(.052+morphBias*.06-breath*.020+uAudio.y*.035)*innerPetal
        +flow*.018*sin(phase*1.27)*(2.*innerPetal*innerPetal-1.);
      float width=mix(.0014,.012,uShape.z);
      vec3 light=palette(uLight.x)*line(abs(r-mainRing),width)*.70;
      light+=palette(uLight.x+uLight.y*.42)*line(abs(r-innerRing),width*.9)*.64;
      // The middle rosette counter-rotates relative to both framing rings.
      vec2 q=fold(turn(uMotion.y-(phase*.27+uBeatTurns.y)*uFlow.x)*p,uGeometry.x);
      float magnification=1.;
      float branchScale=2.05+(uGeometry.y-5.)*.09;
      float visibleDepth=mix(uGeometry.y,max(1.65,uGeometry.y-3.2)+uAudio.w*3.7,uFlow.w);
      for(int i=0;i<7;i++){
        float fi=float(i);if(fi>=uGeometry.y)break;
        float direction=mod(fi,2.)<.5?1.:-1.;
        float unfold=flow*sin(phase*(.82+fi*.08)+fi*1.13);
        float morph=uShape.x+unfold*.26+uAudio.y*.42;
        // Recursive branches have distinct, smoothly evolving local frames.
        q=fold(turn(direction*(phase*.075+.22*sin(uBeatTurns.y))*uFlow.x/(1.+fi*.3))*q,uGeometry.x);
        q-=vec2(.58+morphBias*.11+unfold*.085+uAudio.y*.11,.018*flow*sin(phase*.74+fi));
        q=turn(morph*.48+flow*.20*sin(phase*.69+fi*.9))*q;
        float d;
        if(uShape.w<.5){
          vec2 axes=vec2(.80+morphBias*.18+unfold*.20+uAudio.y*.18,1.16-morphBias*.14-unfold*.17-uAudio.y*.08);
          d=abs(length(q*axes)-(.30+unfold*.032));
        }else if(uShape.w<1.5){
          d=abs(abs(q.x)*(.78+morphBias*.12+unfold*.16+uAudio.y*.08)+abs(q.y)*(.70-morphBias*.08-unfold*.12)-(.32+unfold*.025));
        }else if(uShape.w<2.5){
          float a=atan(q.y,q.x);
          d=abs(length(q)-(.28+(.045+morphBias*.035+uAudio.y*.055)*sin(a*3.+flow*.85*sin(phase*.87+fi)) + unfold*.025*cos(a*6.)));
        }else{
          vec2 axes=vec2(.67+morphBias*.13+unfold*.18,1.42-morphBias*.16-unfold*.30-uAudio.y*.20);
          d=abs(length(q*axes)-(.29+unfold*.035));
        }
        d/=magnification;
        float weight=mix(1.,uShape.y,step(.5,fi))*pow(.74,fi);
        weight*=1.-smoothstep(visibleDepth-.85,visibleDepth+.15,fi);
        weight*=1.-smoothstep(uGeometry.y-.9,uGeometry.y+.1,fi);
        weight*=mix(1.,.16+.84*smoothstep(.08,.85,uAudio.w),uFlow.w*step(.5,fi));
        weight*=smoothstep(.35,1.2,uResolution.y/(magnification*65.));
        float levelWidth=width*pow(.76,fi);
        float engraving=line(d,levelWidth);
        float fineShift=(.022+.018*uAudio.z*sin(phase*3.1+fi+.8))/magnification;
        engraving+=line(abs(d-fineShift),levelWidth*.48)*uMotion.z*.90;
        vec3 ink=palette(uLight.x+sin(fi*1.9+r*1.3+flow*.30*sin(phase*.37)+uColorFlow)*uLight.y*.19);
        // Moving highlights stay attached to ornament; no random whole-frame flicker.
        float sheen=.83+.17*cos(atan(p.y,p.x)*uGeometry.x+phase*1.3+fi);
        light+=ink*engraving*weight*sheen*(1.+crest*.55+uAudio.z*.45);
        q*=branchScale;magnification*=branchScale;
      }
      float jewelRadius=.064+flow*.012*sin(phase*1.43);
      light+=palette(uLight.x+uLight.y*.22)*line(abs(r-jewelRadius),width*.7)*.80;
      light+=palette(uLight.x+uLight.y*.28)*crest*(.025+uMotion.w*.10)*envelope;
      light*=envelope*hole;
      vec3 color=1.-exp(-light*uLight.w);
      color=mix(color,vec3(1.),pow(clamp(max(max(light.r,light.g),light.b)*.37,0.,1.),4.)*.35);
      float alpha=clamp(max(max(color.r,color.g),color.b)*1.12,0.,1.);
      if(alpha<.0001)discard;
      gl_FragColor=vec4(color,alpha);
    }`;
  let surface=null,gl=null,program=null,buffer=null,locations=null,unavailable=false,lost=false,draws=0;
  let phase=0,angle=0,elapsed=0,activity=0,bassEnvelope=0,midEnvelope=0,highEnvelope=0;
  let lastBeatCounter=null,lastBeatLevel=0,beatImpact=0,transientEnvelope=0;
  const beatTurns=[0,0,0],beatTurnRates=[.48,.70,.95],beatTurnUniform=new Float32Array(3);
  const waves=[];
  const waveAges=new Float32Array(4),wavePowers=new Float32Array(4);
  const status=card.querySelector('.aml-kaleidoscope-status');
  function message(text){status.textContent=text;status.hidden=!text}
  function initialize(){
    if(unavailable||lost)return false;
    try{
      if(!surface){surface=document.createElement('canvas');
        surface.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;message('Graphics context lost. The effect will resume when graphics recover.');});
        surface.addEventListener('webglcontextrestored',()=>{lost=false;program=null;buffer=null;locations=null;message('');});
      }
      gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
      if(!gl)throw new Error('WebGL is unavailable.');
      const derivatives=!!gl.getExtension('OES_standard_derivatives');
      function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(info)}return shader}
      const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,(derivatives?'#extension GL_OES_standard_derivatives : enable\n#define AML_DERIVATIVES\n':'')+fragment);
      program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      locations=Object.fromEntries(['uResolution','uGeometry','uShape','uLight','uMotion','uFlow','uAudio','uWaveAge','uWavePower','uWaveSpeed','uBeatTurns','uColorFlow'].map(k=>[k,gl.getUniformLocation(program,k)]));
      message('');return true;
    }catch(error){unavailable=true;message('Fractal Kaleidoscope could not start on this graphics device. Other effects remain available.');console.error('AML Fractal Kaleidoscope:',error);return false}
  }
  function draw(ctx,width,height,bands={},dt=1/60){
    if(!enabled.checked||values.opacity===0)return false;
    const calm=window.__shamonsoftMotionSafety?.enabled?.();
    const factor=calm ? .45 : 1;
    dt=Math.max(0,Math.min(.05,Number(dt)||0));
    const beatGain=values.beatReact/50;
    const unit=x=>Math.max(0,Math.min(1,Number(x)||0));
    const smooth=(value,target,attack,release)=>value+(target-value)*(1.-Math.exp(-dt/(target>value?attack:release)));
    bassEnvelope=smooth(bassEnvelope,unit(bands.bass),.020,.11);
    midEnvelope=smooth(midEnvelope,unit(bands.mid),.035,.15);
    highEnvelope=smooth(highEnvelope,unit(bands.high),.012,.09);
    transientEnvelope=smooth(transientEnvelope,unit(bands.transient),.012,.10);
    beatImpact*=Math.exp(-dt/.13);
    if(beatImpact<.00001)beatImpact=0;
    const intensity=unit(bands.overall ?? (unit(bands.bass)*.40+unit(bands.mid)*.38+unit(bands.high)*.22));
    const beat=unit(bands.beat),counter=Number.isFinite(bands.beatCounter)?bands.beatCounter:null;
    const hit=counter!==null
      ? (counter>0&&(lastBeatCounter===null?beat>.35:counter!==lastBeatCounter))
      : (beat>.22&&lastBeatLevel<=.22);
    // A detected hit accents the body independently of the traveling-wave switch.
    if(hit&&Math.max(beat,intensity)>.025){
      const strength=Math.max(.45,beat,transientEnvelope);
      beatImpact=Math.max(beatImpact,strength);
      if(values.ripples>0&&beatGain>0){
        if(waves.length===4)waves.shift();
        waves.push({age:0,strength:Math.max(.28,beat,bassEnvelope*.8)});
      }
    }
    const bass=unit((bassEnvelope*.65+beatImpact*.35)*beatGain)*values.bass/100*factor;
    const mid=unit((midEnvelope*.42+beatImpact*.65+transientEnvelope*.20)*beatGain)*values.mid/100*factor;
    const high=unit((highEnvelope*.45+beatImpact*.22+transientEnvelope*.50)*beatGain)*values.treble/100*factor;
    activity=beatGain===0?0:smooth(activity,unit((intensity*.55+beatImpact*.48+transientEnvelope*.18)*beatGain),.025,.22);
    if(beatGain===0)waves.length=0;
    elapsed+=dt;
    phase+=dt*values.evolution/100*2.4*factor;
    angle+=dt*(values.rotation-50)/50*.42*factor;
    const impulseTurn=dt*(beatImpact*2.+transientEnvelope*.4)*factor*beatGain;
    for(let i=0;i<3;i++)beatTurns[i]=(beatTurns[i]+impulseTurn*beatTurnRates[i])%(Math.PI*2);
    for(const wave of waves)wave.age+=dt;
    while(waves.length&&waves[0].age>2.6)waves.shift();
    lastBeatCounter=counter;lastBeatLevel=beat;
    if(!program&&!initialize())return false;if(lost)return false;
    const pixelsWide=ctx.canvas.width,pixelsHigh=ctx.canvas.height;
    if(surface.width!==pixelsWide||surface.height!==pixelsHigh){surface.width=pixelsWide;surface.height=pixelsHigh;}
    gl.viewport(0,0,pixelsWide,pixelsHigh);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    const rgb=card.querySelector('.randomize-btn')?.classList.contains('active-toggle');
    let hue=(30+values.hue/360*330)/360;
    if(rgb)hue+=phase*.08;
    const flow=rgb&&card.querySelector('.rgb-mode-select')?.value==='flow';
    gl.uniform2f(locations.uResolution,pixelsWide,pixelsHigh);
    gl.uniform4f(locations.uGeometry,4+Math.round(values.symmetry*.16),2+values.recursion*.05,(.22+values.scale*.007)*(1.+bass*.18),0);
    gl.uniform4f(locations.uShape,values.morph/100,values.filigree/100,values.width/100,['rosette','crystal','lace','lotus'].indexOf(style.value));
    gl.uniform4f(locations.uLight,hue,values.spread/100,values.saturation/100,.40+values.brightness*.028);
    gl.uniform4f(locations.uMotion,phase,angle,Math.min(1,values.filigree/100*.28+high),values.glow/100);
    gl.uniform4f(locations.uFlow,values.ringMotion/100,values.shapeFlow/100*factor,values.ripples/100*factor,values.growth/100);
    gl.uniform4f(locations.uAudio,bass,mid,high,activity);
    waveAges.fill(-1);wavePowers.fill(0);
    waves.forEach((wave,i)=>{waveAges[i]=wave.age;wavePowers[i]=wave.strength*beatGain});
    gl.uniform4fv(locations.uWaveAge,waveAges);gl.uniform4fv(locations.uWavePower,wavePowers);
    gl.uniform1f(locations.uWaveSpeed,(.65+values.evolution*.008)*(.75+.25*factor));
    beatTurnUniform.set(beatTurns);gl.uniform3fv(locations.uBeatTurns,beatTurnUniform);
    gl.uniform1f(locations.uColorFlow,flow?phase*.9:0);
    gl.drawArrays(gl.TRIANGLES,0,6);draws++;
    ctx.save();ctx.globalAlpha*=values.opacity/100;ctx.drawImage(surface,0,0,width,height);ctx.restore();return true;
  }
  function dispose(){if(gl&&!lost){if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);gl.getExtension('WEBGL_lose_context')?.loseContext()}program=buffer=locations=null;}
  function prepareRestore(project){
    // Removed center opening is not a reaction-strength value in legacy projects.
    delete project.controls['id:aml-kaleidoscope-aperture'];
    if(!project.controls['id:aml-kaleidoscope-beatReact']){
      inputs.beatReact.value='50';inputs.beatReact.dispatchEvent(new Event('input',{bubbles:true}));
    }

    // Older ID-based cards had one indexed RGB selector; migrate it explicitly.
    for(const[key,state]of Object.entries(project.controls)){
      if(/^effect:fractalKaleidoscope:control:\d+$/.test(key)&&['cycle','flow'].includes(state?.value)){
        project.controls['id:aml-kaleidoscope-rgb-mode']=state;delete project.controls[key];
      }
    }
    const savedLook=Number(project.controls['id:aml-kaleidoscope-look']?.value||0);
    const defaults=looks[savedLook]||looks[0];
    for(const key of ['ringMotion','shapeFlow','ripples','growth']){
      if(!project.controls['id:aml-kaleidoscope-'+key]){
        inputs[key].value=String(defaults[key]);inputs[key].dispatchEvent(new Event('input',{bubbles:true}));
      }
    }
  }
  function capture(){return{phase,angle,elapsed,activity,bassEnvelope,midEnvelope,highEnvelope,lastBeatCounter,lastBeatLevel,beatImpact,transientEnvelope,beatTurns:[...beatTurns],waves:waves.map(w=>({...w}))}}
  function restore(s){
    const number=(key,fallback=0)=>Number.isFinite(s?.[key])?s[key]:fallback;
    phase=number('phase');angle=number('angle');elapsed=number('elapsed');activity=number('activity');
    bassEnvelope=number('bassEnvelope');midEnvelope=number('midEnvelope');highEnvelope=number('highEnvelope');
    lastBeatCounter=Number.isFinite(s?.lastBeatCounter)?s.lastBeatCounter:null;lastBeatLevel=number('lastBeatLevel');beatImpact=Math.max(0,Math.min(1,number('beatImpact')));transientEnvelope=Math.max(0,Math.min(1,number('transientEnvelope')));
    for(let i=0;i<3;i++)beatTurns[i]=Number.isFinite(s?.beatTurns?.[i])?((s.beatTurns[i]%(Math.PI*2))+Math.PI*2)%(Math.PI*2):0;
    waves.splice(0,waves.length,...(Array.isArray(s?.waves)?s.waves:[]).filter(w=>Number.isFinite(w?.age)&&Number.isFinite(w?.strength)&&w.age>=0&&w.age<2.6).slice(-4).map(w=>({age:w.age,strength:Math.max(0,Math.min(1,w.strength))})));
  }
  window.__amlKaleidoscope={enabled:()=>enabled.checked,visible:()=>enabled.checked&&values.opacity>0,draw,dispose,prepareRestore,looks:looks.map(p=>p.name),diagnostics:()=>({ready:!!program,lost,unavailable,draws,width:surface?.width||0,height:surface?.height||0,...capture()})};
  window.__amlKaleidoscopeClock={capture,restore};
  window.addEventListener('pagehide',dispose,{once:true});
})();
