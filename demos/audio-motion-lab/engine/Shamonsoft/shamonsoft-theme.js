(() => {
  // Interface preference only: never part of a scene, preset or exported image.
  const key = 'shamonsoft-val-interface-mode';
  let mode = 'dark';
  try { if (localStorage.getItem(key) === 'light') mode = 'light'; } catch { /* Dark remains the safe default. */ }
  const apply = () => {
    // Keep the studio switch independent of retired graphite/ember selectors.
    // Those used data-theme=dark/light and must not repaint this interface.
    document.documentElement.dataset.studioTheme = mode;
    document.documentElement.style.colorScheme = mode;
    const button = document.getElementById('shamonsoft-mode-button');
    if (!button) return;
    button.textContent = mode === 'light' ? 'Light' : 'Dark';
    button.setAttribute('aria-pressed', String(mode === 'light'));
    button.setAttribute('aria-label', `Switch to ${mode === 'light' ? 'Dark' : 'Light'} mode`);
    button.title = button.getAttribute('aria-label');
  };
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('shamonsoft-mode-button')?.addEventListener('click', () => {
      mode = mode === 'dark' ? 'light' : 'dark';
      apply();
      try { localStorage.setItem(key, mode); } catch { /* Switching still works without storage. */ }
    });
  }, { once: true });
})();
