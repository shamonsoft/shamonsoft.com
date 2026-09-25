(() => {
  const toggle = document.querySelector('.mobile-nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close image">×</button><img alt="">';
  document.body.appendChild(box);
  const boxImg = box.querySelector('img');
  const close = box.querySelector('.lightbox-close');
  let lastFocus = null;

  function openLightbox(el) {
    const src = el.dataset.full || el.querySelector('img')?.src;
    const img = el.querySelector('img');
    if (!src) return;
    lastFocus = document.activeElement;
    boxImg.src = src;
    boxImg.alt = img?.alt || 'Expanded screenshot';
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    close.focus();
  }
  function closeLightbox() {
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    boxImg.src = '';
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.querySelectorAll('.zoomable').forEach(el => {
    el.addEventListener('click', () => openLightbox(el));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(el); }
    });
  });
  close.addEventListener('click', closeLightbox);
  box.addEventListener('click', e => { if (e.target === box) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('open')) closeLightbox(); });
})();
