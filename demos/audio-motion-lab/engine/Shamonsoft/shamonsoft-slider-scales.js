(() => {
  // Hue sliders already communicate their position through the color spectrum;
  // percentage labels and ruler marks are meaningful only for numeric controls.
  const fillSelector = 'input[type="range"]:not(.spectrum-slider):not(.progress-slider):not(.playlist-scroll)';
  const selector = `${fillSelector}:not([data-shamonsoft-scale="false"])`;
  const tickMarkup = Array.from({ length: 21 }, (_, index) => {
    const className = index === 0 || index === 10 || index === 20
      ? 'major'
      : index % 5 === 0
        ? 'medium'
        : 'minor';
    return `<i class="${className}"></i>`;
  }).join('');

  function endpointFor(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    const epsilon = Math.max(1e-9, Math.abs(max - min) * 1e-6);
    if (value <= min + epsilon) return 'min';
    if (value >= max - epsilon) return 'max';
    return 'middle';
  }

  function updateScale(input) {
    const scale = input.closest('.shamonsoft-range-with-scale')?.querySelector('.shamonsoft-range-scale');
    if (scale) scale.dataset.endpoint = endpointFor(input);
    updateFill(input);
  }

  function updateFill(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    const percent = Math.max(0, Math.min(100, max > min ? ((value - min) / (max - min)) * 100 : 0));
    const thumbHitSize = 9;
    const correction = (0.5 - percent / 100) * thumbHitSize;
    input.style.setProperty('--fill', `calc(${percent}% + ${correction}px)`);
  }

  function decorate(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.shamonsoftScale === 'true') return;
    input.dataset.shamonsoftScale = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'shamonsoft-range-with-scale';
    const scale = document.createElement('div');
    scale.className = 'shamonsoft-range-scale';
    scale.setAttribute('aria-hidden', 'true');
    const signed = input.dataset.shamonsoftSigned === 'true';
    scale.innerHTML = `
      <div class="shamonsoft-range-ticks">${tickMarkup}</div>
      <div class="shamonsoft-range-labels">
        <span data-scale-label="min">${signed ? input.min : '0'}</span>
        <span>${signed ? '0' : '50'}</span>
        <span data-scale-label="max">${signed ? input.max : '100'}</span>
      </div>`;

    input.before(wrapper);
    wrapper.append(input, scale);
    input.addEventListener('input', () => updateScale(input));
    input.addEventListener('change', () => updateScale(input));
    updateScale(input);
  }

  function decorateAll(root = document) {
    if (root instanceof HTMLInputElement && root.matches(fillSelector)) updateFill(root);
    root.querySelectorAll?.(fillSelector).forEach(updateFill);
    if (root instanceof HTMLInputElement && root.matches(selector)) decorate(root);
    root.querySelectorAll?.(selector).forEach(decorate);
  }

  decorateAll();
  // Workspace and preset restoration can set values during startup. Re-sync
  // after layout settles so a restored thumb and its fill agree immediately.
  requestAnimationFrame(() => requestAnimationFrame(() => decorateAll()));
  window.addEventListener('pageshow', () => decorateAll());
  document.addEventListener('input', event => {
    if (event.target instanceof HTMLInputElement && event.target.matches(fillSelector)) updateFill(event.target);
  }, true);
  document.addEventListener('change', event => {
    if (event.target instanceof HTMLInputElement && event.target.matches(fillSelector)) updateFill(event.target);
  }, true);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) decorateAll(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
