(() => {
  const card = document.querySelector('[data-effect-id="sonicRunway"]'), body = card?.querySelector('.anim-body');
  if (!body) return;
  const shapes = ['Square', 'Heptagon', 'Decagon', 'Pointed arch', 'Shield', 'Trefoil', 'Quatrefoil', 'Teardrop', 'Keyhole'];
  const definitions = [
    ['Architecture', 'Profile width', 50, 'Width of the opening. Center preserves the original proportions.'],
    ['Architecture', 'Profile height', 50, 'Height of the opening, independent of its width.'],
    ['Architecture', 'Profile angle', 0, 'Rotate the cross-section; the floor stays level and fits the walls.', -90, 90],
    ['Architecture', 'Panel spacing', 50, 'Distance between glass frames. Center preserves the original spacing.'],
    ['Architecture', 'Floor level', 50, 'Move the floor up or down. Center preserves its original placement.'],
    ['Travel & color', 'Direction', 'Forward', 'Forward, reverse or a stationary structure.', ['Forward', 'Reverse', 'Hover']],
    ['Travel & color', 'Idle travel', 'Music only', 'Music only preserves the original behavior. Always also travels when music is paused.', ['Music only', 'Always']],
    ['Travel & color', 'RGB speed', 50, 'Speed of RGB Flow along the tunnel. Requires RGB Flow; zero holds its color pattern.'],
    ['Surface & response', 'Surface', 'Glass', 'Glass preserves the accepted polished material. Light frame reveals only its illuminated structure.', ['Glass', 'Light frame']],
    ['Surface & response', 'Audio band', 'Bass', 'Choose which part of the music drives Response and Breathing.', ['Bass', 'Mid', 'Treble', 'Full mix']],
    ['Surface & response', 'Breathing', 0, 'Additional smooth expansion with the selected audio band. Zero preserves the original subtle response.']
  ];
  const controls = new Map(), defaults = Object.fromEntries(definitions.map(([, label, value]) => [label, value]));
  const idFor = label => 'aml-tunnel-' + label.toLowerCase().replaceAll(' ', '-');
  const dispatch = input => { input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); };
  const container = document.createElement('div'); container.className = 'aml-tunnel-options';
  for (const group of [...new Set(definitions.map(x => x[0]))]) {
    const details = document.createElement('details'), summary = document.createElement('summary'), grid = document.createElement('div');
    details.style.cssText = 'margin-top:10px;border-top:1px solid var(--border);padding-top:9px';
    summary.textContent = group; summary.style.cssText = 'cursor:pointer;font-weight:600;padding-bottom:8px'; grid.className = 'slider-grid';
    for (const [, label, value, help, choices, maximum] of definitions.filter(x => x[0] === group)) {
      const cell = document.createElement('div'); cell.className = 'slider-cell';
      const heading = document.createElement('div'); heading.className = 'slider-label-row';
      const text = document.createElement('span'); text.textContent = label; heading.append(text); cell.append(heading);
      let input;
      if (Array.isArray(choices)) {
        input = document.createElement('select'); input.className = 'anim-select';
        for (const choice of choices) input.add(new Option(choice, choice, choice === value, choice === value));
      } else {
        input = document.createElement('input'); input.type = 'range'; input.className = 'real-slider';
        input.min = String(typeof choices === 'number' ? choices : 0); input.max = String(maximum ?? 100); input.step = '1'; input.defaultValue = String(value);
        if (Number(input.min) < 0) input.dataset.shamonsoftSigned = 'true';
      }
      input.id = idFor(label); input.value = String(value); input.title = help; input.setAttribute('aria-label', 'Tunnel ' + label);
      cell.append(input); grid.append(cell); controls.set(label, input);
    }
    details.append(summary, grid); container.append(details);
  }
  body.append(container);
  const shapePicker = [...body.querySelectorAll('.slider-cell')].find(c => c.querySelector('.slider-label-row span')?.textContent.trim() === 'Shape')?.querySelector('select');
  for (const name of shapes) shapePicker?.add(new Option(name, name));

  function profile(shape) {
    const result = [], add = (x, y) => result.push({ x, y });
    if (shape === 'Square') return [{ x:-1.05,y:-1.05 },{ x:1.05,y:-1.05 },{ x:1.05,y:1.05 },{ x:-1.05,y:1.05 }];
    if (shape === 'Pointed arch') return [{x:-1.1,y:.88},{x:-1.1,y:-.15},{x:-.62,y:-.85},{x:0,y:-1.3},{x:.62,y:-.85},{x:1.1,y:-.15},{x:1.1,y:.88}];
    if (shape === 'Shield') return [{x:-1.1,y:-.9},{x:1.1,y:-.9},{x:1.1,y:.2},{x:.72,y:.72},{x:0,y:1.1},{x:-.72,y:.72},{x:-1.1,y:.2}];
    if (shape === 'Keyhole') {
      for (let i=0;i<=24;i++) { const a=Math.PI+i/24*Math.PI; add(Math.cos(a)*1.08,-.24+Math.sin(a)*.98); }
      return [...result,{x:.48,y:.2},{x:.48,y:1},{x:-.48,y:1},{x:-.48,y:.2}];
    }
    if (!['Heptagon','Decagon','Trefoil','Quatrefoil','Teardrop'].includes(shape)) return null;
    const count = shape === 'Heptagon' ? 7 : shape === 'Decagon' ? 10 : 48;
    for (let i=0;i<count;i++) {
      const a=i/count*Math.PI*2-Math.PI/2;
      const lobes=shape==='Trefoil'?3:4, r=shape==='Trefoil'||shape==='Quatrefoil'?1+.17*Math.cos(a*lobes):1;
      add(Math.cos(a)*1.12*r*(shape==='Teardrop'?1+Math.sin(a)*.32:1), Math.sin(a)*(shape==='Teardrop'?1.2:1)*r);
    }
    return result;
  }
  function transform(cross, floor, width, height, angle, level) {
    // Neutral values leave the accepted vertex/floor values completely untouched.
    if (width===50 && height===50 && angle===0 && level===50) return;
    const scale=v=>v<=50?.55+v/50*.45:1+(v-50)/50*.65;
    const sx=scale(width), sy=scale(height), a=angle*Math.PI/180, c=Math.cos(a), s=Math.sin(a);
    for (const point of cross) { const x=point.x*sx,y=point.y*sy;point.x=x*c-y*s;point.y=x*s+y*c; }
    const low=Math.min(...cross.map(p=>p.y))+.06, high=Math.max(...cross.map(p=>p.y))-.06;
    const original=Math.max(low,Math.min(high,floor[0]*sy));
    floor[0]=level<=50?high+(original-high)*level/50:original+(low-original)*(level-50)/50;
  }
  function prepareRestore(project) {
    // Validate before mutation; older projects must not inherit a previous new look.
    for (const [label,input] of controls) {
      const state=project.controls['id:'+input.id]; if (!state) continue;
      const value=String(state.value ?? defaults[label]);
      if (input.tagName==='SELECT' ? ![...input.options].some(o=>o.value===value) : !Number.isFinite(Number(value))||Number(value)<Number(input.min)||Number(value)>Number(input.max)) throw Error('Invalid Tunnel setting: '+label);
    }
    for (const [label,input] of controls) if (!('id:'+input.id in project.controls)) { input.value=String(defaults[label]);dispatch(input); }
  }
  window.__amlTunnelOptions = { shapes, defaults, profile, transform, prepareRestore };
})();
