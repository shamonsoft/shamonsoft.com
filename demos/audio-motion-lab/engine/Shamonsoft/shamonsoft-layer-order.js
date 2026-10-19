(() => {
  // Back-to-front drawing order, independent of the fixed settings-card order.
  const legacyRenderOrder = ['background', 'floorGrid', 'sonicRunway', 'main', 'particles', 'lightBeams', 'shockwave', 'proceduralScene', 'shamonsoftOverlays'];
  const previousDefaults = ['background', 'floorGrid', 'sonicRunway', 'particles', 'lightBeams', 'shockwave', 'proceduralScene', 'shamonsoftOverlays', 'main'];
  const defaults = ['background', 'proceduralScene', 'floorGrid', 'sonicRunway', 'particles', 'lightBeams', 'shockwave', 'shamonsoftOverlays', 'main'];
  let order = [...defaults];
  const rows = new Map();

  function refresh() {
    for (const [id, row] of rows) {
      const index = order.indexOf(id);
      const rank = order.length - index;
      const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
      row.querySelector('span').textContent = `Layer order: ${rank}${suffix}`;
      row.querySelector('[data-layer-step="-1"]').disabled = index === 0;
      row.querySelector('[data-layer-step="1"]').disabled = index === order.length - 1;
      row.title = `${rank}${suffix} of ${order.length} — 1st is closest, ${order.length}th is farthest`;
    }
  }
  function restore(saved, version) {
    // Upgrade factory orders only; explicitly saved current/custom orders stay intact.
    if (version !== 3 && Array.isArray(saved) && saved.length === defaults.length
      && (saved.every((id, index) => id === previousDefaults[index])
        || (version !== 2 && saved.every((id, index) => id === legacyRenderOrder[index])))) saved = defaults;
    const seen = new Set();
    order = (Array.isArray(saved) ? saved : defaults).filter(id => {
      if (!defaults.includes(id) || seen.has(id)) return false;
      seen.add(id); return true;
    });
    order.push(...defaults.filter(id => !seen.has(id)));
    refresh();
  }
  function decorate() {
    for (const card of document.querySelectorAll('#left-rail .anim-card[data-effect-id]')) {
      const id = card.dataset.effectId;
      if (!defaults.includes(id) || rows.has(id)) continue;
      const row = document.createElement('div');
      row.className = 'shamonsoft-layer-order-row';
      row.innerHTML = '<span>Layer order</span><button type="button" data-layer-step="-1" title="Send backward one layer">Send backward</button><button type="button" data-layer-step="1" title="Bring forward one layer">Bring forward</button>';
      row.addEventListener('click', event => {
        const button = event.target.closest('button[data-layer-step]');
        if (!button || button.disabled) return;
        const index = order.indexOf(id), next = index + Number(button.dataset.layerStep);
        if (next < 0 || next >= order.length) return;
        window.__shamonsoftHistory?.rememberBeforeChange?.();
        [order[index], order[next]] = [order[next], order[index]];
        refresh();
        // Existing project autosave owns persistence; no separate storage key.
        button.dispatchEvent(new Event('change', { bubbles: true }));
      });
      card.querySelector(':scope > .anim-head')?.after(row);
      rows.set(id, row);
    }
    refresh();
  }
  window.__shamonsoftLayerOrder = {
    serialize: () => [...order], restore,
    reset: () => restore(defaults),
    // The older fixed rendering pipeline is valid only for its original order.
    // New defaults put Visualizers in front and therefore use ordered composition.
    isCustom: () => order.some((id, index) => id !== legacyRenderOrder[index]),
  };
  document.addEventListener('DOMContentLoaded', decorate, { once: true });
})();
