(() => {
  document.body.classList.add('shamonsoft-studio-ui');
  const panel = document.querySelector('.presets-panel');
  const rail = document.getElementById('left-rail');
  const visualizers = rail?.querySelector('[data-effect-id="main"]');
  if (!panel || !rail || !visualizers) return;

  // Move the actual controls, never copies: all existing preset listeners,
  // storage, imports and keyboard actions continue to own the same elements.
  const oldHead = panel.querySelector('.preset-section-head');
  const tools = panel.querySelector('.preset-head-actions');
  const grid = document.getElementById('presets-grid');
  const body = document.createElement('div');
  body.id = 'studio-presets-body';
  body.className = 'studio-presets-body';
  body.hidden = true;
  body.append(tools, grid);
  oldHead.remove();
  const head = document.createElement('div');
  head.className = 'anim-head studio-presets-head';
  head.innerHTML = '<button class="collapse-btn" type="button" aria-label="Expand presets" aria-expanded="false" aria-controls="studio-presets-body">▶</button><div class="anim-title">My Presets</div>';
  panel.classList.remove('presets-panel');
  panel.classList.add('studio-presets-card', 'collapsed');
  panel.prepend(head);
  panel.append(body);
  rail.insertBefore(panel, visualizers);
  const toggle = head.querySelector('button');
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? '▼' : '▶';
    toggle.setAttribute('aria-label', expanded ? 'Collapse presets' : 'Expand presets');
    panel.classList.toggle('collapsed', !expanded);
    body.hidden = !expanded;
  });
})();
