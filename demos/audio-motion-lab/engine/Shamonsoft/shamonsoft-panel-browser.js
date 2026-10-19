(() => {
  const rail = document.getElementById('left-rail');
  if (!rail) return;

  function cards() {
    return [...rail.querySelectorAll(':scope > .anim-card')];
  }

  function isExpanded(card) {
    return !card.classList.contains('collapsed') && !card.querySelector('.anim-body')?.hidden;
  }

  function syncCollapseLabel(card) {
    const button = card.querySelector('.anim-head .collapse-btn');
    if (!button) return;
    const expanded = isExpanded(card);
    button.textContent = expanded ? '▼' : '▶';
    button.setAttribute('aria-label', expanded ? 'Collapse effect options' : 'Expand effect options');
    button.setAttribute('aria-expanded', String(expanded));
    button.title = expanded ? 'Hide this panel’s options' : 'Show this panel’s options';
  }

  function syncToggleLabel(card) {
    const toggle = card.querySelector('.anim-head-actions > .toggle');
    const input = toggle?.querySelector('input[type="checkbox"]');
    const label = toggle?.nextElementSibling?.classList.contains('effect-toggle-label')
      ? toggle.nextElementSibling
      : null;
    if (!input || !label) return;
    label.textContent = input.checked ? 'On' : 'Off';
    label.dataset.state = input.checked ? 'on' : 'off';
    toggle.title = input.checked ? 'Turn effect off' : 'Turn effect on';
  }

  function decorate() {
    cards().forEach(card => {
      const head = card.querySelector('.anim-head');
      const actions = card.querySelector('.anim-head-actions');
      const collapse = head?.querySelector('.collapse-btn');
      if (head && collapse && collapse.parentElement !== head) {
        head.insertBefore(collapse, head.firstElementChild);
      }
      if (collapse && collapse.dataset.shamonsoftLabelled !== 'true') {
        collapse.dataset.shamonsoftLabelled = 'true';
        collapse.addEventListener('click', () => queueMicrotask(() => syncCollapseLabel(card)));
      }

      const toggle = actions?.querySelector(':scope > .toggle');
      const toggleInput = toggle?.querySelector('input[type="checkbox"]');
      if (toggle && toggleInput && !toggle.nextElementSibling?.classList.contains('effect-toggle-label')) {
        const stateLabel = document.createElement('span');
        stateLabel.className = 'effect-toggle-label';
        toggle.after(stateLabel);
        toggleInput.addEventListener('change', () => syncToggleLabel(card));
      }

      syncCollapseLabel(card);
      syncToggleLabel(card);
    });
  }

  decorate();
  requestAnimationFrame(() => {
    cards().forEach(card => {
      const expanded = false;
      card.classList.toggle('collapsed', !expanded);
      const body = card.querySelector('.anim-body');
      if (body) body.hidden = !expanded;
    });
    decorate();
  });

  window.__shamonsoftPanelBrowser = { count: () => cards().length };
})();
