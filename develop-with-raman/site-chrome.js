/* Shared accessible navigation for every Develop with Raman page. */
(() => {
  'use strict';
  const init = () => {
    const header = document.querySelector('[data-site-header]');
    const toggle = document.querySelector('[data-site-menu-toggle]');
    if (!header || !toggle) return;
    let overlay = document.getElementById('site-menu-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'site-menu-overlay';
      overlay.id = 'site-menu-overlay';
      overlay.hidden = true;
      overlay.innerHTML = `
        <section class="site-menu-panel" role="dialog" aria-modal="true" aria-label="Website navigation">
          <div class="site-menu-top"><span class="site-menu-wordmark">Develop with Raman</span><button class="site-menu-close" type="button" data-site-menu-close>Close ×</button></div>
          <nav class="site-menu-links" aria-label="Site links">
            <a href="/">Home</a>
            <a href="/projects.html">Projects</a>
            <a href="/#services">Services</a>
            <a href="/#start-project">Start a project</a>
            <a href="/#about">About</a>
            <a href="/#achievements">Achievements</a>
            <a href="/#faq">FAQ</a>
            <a href="/#contact">Contact</a>
            <a href="/dashboard.html">Client workspace / Sign in</a>
          </nav>
          <p class="site-menu-note">A clear brief. Thoughtful design. Practical delivery.</p>
        </section>`;
      document.body.appendChild(overlay);
    }
    const close = () => {
      overlay.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus({preventScroll:true});
    };
    const open = () => {
      overlay.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      overlay.querySelector('[data-site-menu-close]')?.focus({preventScroll:true});
    };
    toggle.addEventListener('click', () => overlay.hidden ? open() : close());
    overlay.querySelector('[data-site-menu-close]')?.addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      overlay.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !overlay.hidden) close();
      if (event.key === 'Tab' && !overlay.hidden) {
        const focusables = [...overlay.querySelectorAll('a[href],button:not([disabled])')];
        if (!focusables.length) return;
        const first=focusables[0], last=focusables[focusables.length-1];
        if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
