(() => {
  const card=document.querySelector('[data-effect-id="sonicRunway"]'),body=card?.querySelector('.anim-body');if(!body)return;
  const base={Shape:'Octagon',Floor:'Runway',Hue:220,Response:50,Glow:50,Size:50,Depth:50,Thickness:50,Speed:50,Twist:0,Opacity:65,Brightness:65,...(window.__amlTunnelOptions?.defaults || {})};
  const looks=[
    {name:'Original glass',values:{}},
    {name:'Arctic capsule',values:{Shape:'Capsule',Floor:'Brushed metal',Hue:192,Depth:72,Thickness:36,Speed:34,Opacity:48,Brightness:75,Glow:58}},
    {name:'Rose cathedral',values:{Shape:'Arch',Floor:'Obsidian',Hue:334,Depth:74,Thickness:34,Speed:30,Opacity:50,Brightness:76,Glow:62}},
    {name:'Amber metro',values:{Shape:'Rounded rectangle',Floor:'Ribbed deck',Hue:28,Size:57,Depth:68,Speed:42,Opacity:57,Brightness:72}},
    {name:'Northern glass',values:{Shape:'Superellipse',Floor:'Grid',Hue:162,Size:57,Depth:78,Speed:32,Opacity:40,Brightness:75,Glow:63}},
    {name:'Deep observatory',values:{Shape:'Dodecagon',Floor:'Obsidian',Hue:252,Size:61,Depth:86,Speed:27,Opacity:45,Brightness:74,Glow:54}},
    {name:'Prism star',values:{Shape:'Star',Floor:'None',Size:60,Depth:70,Speed:35,Opacity:45,Brightness:75,Glow:60},rgb:true},
    {name:'Left helix',values:{Shape:'Hexagon',Floor:'Brushed metal',Hue:274,Depth:66,Twist:-38,Speed:36,Opacity:48,Brightness:74}},
    {name:'Right helix',values:{Shape:'Hexagon',Floor:'Brushed metal',Hue:202,Depth:66,Twist:38,Speed:36,Opacity:48,Brightness:74}},
    {name:'Wide gallery',values:{Shape:'Superellipse',Floor:'Stone tiles',Hue:40,Size:68,Depth:64,Speed:22,Opacity:32,Brightness:78,Glow:58}},
    {name:'Spectrum flight',values:{Shape:'Capsule',Floor:'Obsidian',Depth:76,Speed:48,Opacity:42,Brightness:77,Glow:65},rgb:true},
    {"name": "Gothic gallery", "values": {"Shape": "Pointed arch", "Floor": "Obsidian", "Hue": 272, "Depth": 76, "Speed": 28, "Opacity": 43, "Brightness": 77, "Profile height": 65}, "group": "Architecture"},
    {"name": "Keyhole passage", "values": {"Shape": "Keyhole", "Floor": "Brushed metal", "Hue": 198, "Depth": 72, "Speed": 32, "Opacity": 48, "Thickness": 34}, "group": "Architecture"},
    {"name": "Clover lounge", "values": {"Shape": "Quatrefoil", "Floor": "None", "Hue": 154, "Depth": 67, "Speed": 24, "Opacity": 38, "Panel spacing": 65}, "group": "Architecture"},
    {"name": "Triad chamber", "values": {"Shape": "Trefoil", "Floor": "None", "Hue": 302, "Depth": 72, "Speed": 30, "Opacity": 45, "Twist": 18}, "group": "Architecture"},
    {"name": "Shield vault", "values": {"Shape": "Shield", "Floor": "Obsidian", "Hue": 210, "Depth": 78, "Speed": 33, "Opacity": 45}, "group": "Architecture"},
    {"name": "Sevenfold hall", "values": {"Shape": "Heptagon", "Floor": "Runway", "Hue": 32, "Depth": 72, "Speed": 37, "Opacity": 48, "Profile height": 63}, "group": "Architecture"},
    {"name": "Decagon express", "values": {"Shape": "Decagon", "Floor": "Ribbed deck", "Hue": 190, "Depth": 80, "Speed": 60, "Opacity": 42, "Panel spacing": 36}, "group": "Architecture"},
    {"name": "Crystal square", "values": {"Shape": "Square", "Floor": "Brushed metal", "Hue": 225, "Depth": 72, "Speed": 28, "Opacity": 35, "Profile angle": 12}, "group": "Architecture"},
    {"name": "Teardrop chamber", "values": {"Shape": "Teardrop", "Floor": "None", "Hue": 336, "Depth": 78, "Speed": 26, "Opacity": 43}, "group": "Architecture"},
    {"name": "Cathedral bloom", "values": {"Shape": "Pointed arch", "Floor": "Stone tiles", "Hue": 28, "Size": 60, "Depth": 70, "Speed": 24, "Opacity": 40, "Profile height": 77, "Panel spacing": 70}, "group": "Architecture"},
    {"name": "Copper foundry", "values": {"Shape": "Shield", "Floor": "Brushed metal", "Hue": 18, "Depth": 70, "Speed": 35, "Opacity": 58, "Thickness": 64}, "group": "Architecture"},
    {"name": "Violet vault", "values": {"Shape": "Square", "Floor": "Obsidian", "Hue": 275, "Depth": 76, "Speed": 28, "Opacity": 42, "Profile width": 65, "Profile height": 63}, "group": "Architecture"},
    {"name": "Backward drift", "values": {"Shape": "Capsule", "Floor": "Grid", "Hue": 190, "Depth": 74, "Speed": 32, "Opacity": 40, "Direction": "Reverse"}, "group": "Travel & atmosphere"},
    {"name": "Hover atrium", "values": {"Shape": "Decagon", "Floor": "None", "Depth": 72, "Opacity": 35, "Direction": "Hover", "RGB speed": 30}, "group": "Travel & atmosphere", "rgb": true},
    {"name": "Midnight cruise", "values": {"Shape": "Superellipse", "Floor": "Obsidian", "Hue": 232, "Depth": 85, "Speed": 24, "Opacity": 32, "Brightness": 72, "Idle travel": "Always"}, "group": "Travel & atmosphere"},
    {"name": "Wide boulevard", "values": {"Shape": "Rounded rectangle", "Floor": "Runway", "Hue": 198, "Depth": 76, "Speed": 45, "Opacity": 48, "Profile width": 82, "Profile height": 42}, "group": "Travel & atmosphere"},
    {"name": "Low passage", "values": {"Shape": "Capsule", "Floor": "Brushed metal", "Hue": 30, "Depth": 72, "Speed": 32, "Opacity": 45, "Profile width": 65, "Profile height": 30, "Floor level": 40}, "group": "Travel & atmosphere"},
    {"name": "Aurora lanterns", "values": {"Shape": "Quatrefoil", "Floor": "None", "Depth": 78, "Speed": 28, "Opacity": 35, "Profile height": 72, "Profile angle": 15, "RGB speed": 35}, "group": "Travel & atmosphere", "rgb": true},
    {"name": "Twin glow portal", "values": {"Shape": "Trefoil", "Floor": "None", "Hue": 174, "Depth": 70, "Speed": 27, "Surface": "Light frame", "Glow": 62, "Thickness": 65}, "group": "Frames & response"},
    {"name": "Rose frame", "values": {"Shape": "Keyhole", "Floor": "Obsidian", "Hue": 330, "Depth": 76, "Speed": 30, "Surface": "Light frame", "Glow": 60, "Thickness": 60}, "group": "Frames & response"},
    {"name": "Wire prism", "values": {"Shape": "Star", "Floor": "None", "Depth": 78, "Speed": 32, "Surface": "Light frame", "Glow": 66, "Thickness": 65, "Twist": 25}, "group": "Frames & response", "rgb": true},
    {"name": "Pulse flight", "values": {"Shape": "Decagon", "Floor": "Obsidian", "Hue": 205, "Depth": 72, "Speed": 42, "Opacity": 45, "Audio band": "Full mix", "Breathing": 65}, "group": "Frames & response"},
    {"name": "Treble lace", "values": {"Shape": "Quatrefoil", "Floor": "None", "Hue": 278, "Depth": 76, "Speed": 28, "Surface": "Light frame", "Thickness": 60, "Audio band": "Treble", "Breathing": 40}, "group": "Frames & response"},
    {"name": "Midrange chapel", "values": {"Shape": "Pointed arch", "Floor": "Stone tiles", "Hue": 145, "Depth": 72, "Speed": 30, "Opacity": 42, "Audio band": "Mid", "Breathing": 48}, "group": "Frames & response"}
  ];
  const wrapper=document.createElement('div');wrapper.dataset.projectControl='false';wrapper.style.marginBottom='10px';
  const picker=document.createElement('select');picker.className='anim-select';picker.id='aml-tunnel-look';picker.setAttribute('aria-label','Tunnel look');
  picker.innerHTML='<option value="">Custom tunnel</option>'+['Original & familiar','Architecture','Travel & atmosphere','Frames & response'].map(group=>`<optgroup label="${group}">${looks.map((p,i)=>(p.group||'Original & familiar')===group?`<option value="${i}">${p.name}</option>`:'').join('')}</optgroup>`).join('');wrapper.append(picker);body.prepend(wrapper);
  let applying=false;
  const dispatch=input=>{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
  function fields(){return new Map([...body.querySelectorAll('.slider-cell')].map(cell=>[cell.querySelector('.slider-label-row span')?.textContent?.trim(),cell.querySelector('input,select')]).filter(([,value])=>value));}
  function apply(index,{restoreSliders=false}={}){
    const look=looks[index];if(!look)return;window.__shamonsoftHistory?.rememberBeforeChange?.();applying=true;
    try{
      const inputs=fields();for(const [label,value] of Object.entries({...base,...look.values})){const input=inputs.get(label);if(input&&(restoreSliders||input.tagName==='SELECT')){input.value=String(value);dispatch(input);}}
      const rgb=card.querySelector('.randomize-btn');rgb?.classList.toggle('active-toggle',Boolean(look.rgb));rgb?.setAttribute('aria-pressed',String(Boolean(look.rgb)));
      const mode=card.querySelector('.rgb-mode-select');if(mode){mode.value='flow';dispatch(mode);}
      const enabled=card.querySelector('.anim-head .toggle input');enabled.checked=true;dispatch(enabled);picker.value=String(index);
      window.__amlProject?.changed?.();
    }finally{applying=false;}
  }
  const original=document.createElement('button');original.type='button';original.textContent='Restore original glass';original.style.cssText='margin-top:8px;min-height:26px;padding:0 9px;border:1px solid var(--border);border-radius:5px;background:var(--panel-2);color:var(--text);font:inherit;font-size:.65rem;cursor:pointer';original.title='Restore the original Tunnel settings; Undo keeps your previous look.';original.addEventListener('click',()=>apply(0,{restoreSliders:true}));wrapper.append(original);
  picker.addEventListener('change',()=>{if(picker.value!=='')apply(Number(picker.value));});
  body.addEventListener('input',event=>{if(!applying&&event.target!==picker&&event.target.tagName==='SELECT')picker.value='';});
  body.addEventListener('change',event=>{if(!applying&&event.target!==picker&&event.target.tagName==='SELECT')picker.value='';});
  window.__amlTunnelLooks={names:looks.map(x=>x.name),apply};
})();
