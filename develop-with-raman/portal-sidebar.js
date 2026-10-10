/* Phone navigation for the signed-in pages: a slide-in menu with Sign out always reachable.
   Desktop and tablet layouts are unchanged. Styles live in client-portal.css (.portal-menu-ready). */
(() => {
  const shell = document.querySelector('.portal-shell');
  const sidebar = document.querySelector('.portal-sidebar');
  const main = document.querySelector('.portal-main');
  if (!shell || !sidebar || !main) return;
  const phone = matchMedia('(max-width:650px)');
  sidebar.id = sidebar.id || 'portal-sidebar';

  const bar = document.createElement('div');
  bar.className = 'portal-menubar';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'portal-menu-toggle';
  toggle.setAttribute('aria-controls', sidebar.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  toggle.textContent = '☰';
  const title = document.createElement('span');
  title.className = 'portal-menu-title';
  title.textContent = (document.querySelector('.portal-brand')?.firstChild?.textContent || 'Menu').trim();
  bar.append(toggle, title);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'portal-menu-close';
  close.setAttribute('aria-label', 'Close menu');
  close.textContent = '✕';
  sidebar.prepend(close);

  const backdrop = document.createElement('div');
  backdrop.className = 'portal-backdrop';
  backdrop.hidden = true;
  shell.insertBefore(bar, main);
  shell.append(backdrop);

  let returnFocus = null;
  const setOpen = open => {
    sidebar.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    backdrop.hidden = !open;
    document.documentElement.classList.toggle('portal-menu-open', open);
    // While the menu is open, the page behind it cannot be tabbed into.
    if ('inert' in main) { main.inert = open; bar.inert = open; }
    if (open) {
      returnFocus = document.activeElement;
      (sidebar.querySelector('.portal-nav a') || close).focus();
    } else if (returnFocus) {
      returnFocus.focus?.();
      returnFocus = null;
    }
  };
  const apply = () => {
    shell.classList.toggle('portal-menu-ready', phone.matches);
    sidebar.dataset.open = 'false';
    if (!phone.matches) setOpen(false);
  };

  toggle.addEventListener('click', () => setOpen(sidebar.dataset.open !== 'true'));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', event => { if (event.target.closest?.('a')) setOpen(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && sidebar.dataset.open === 'true') setOpen(false); });
  let startX = null;
  sidebar.addEventListener('touchstart', event => { startX = event.touches[0].clientX; }, { passive: true });
  sidebar.addEventListener('touchend', event => {
    if (startX !== null && event.changedTouches[0].clientX - startX < -60) setOpen(false);
    startX = null;
  }, { passive: true });
  phone.addEventListener('change', apply);
  apply();
})();
