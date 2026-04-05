/**
 * sidebar-fix.js
 * Fixes two issues present on every dashboard page:
 *   1. The <aside class="sidenav"> is missing id="sidenav-main" which soft-ui-dashboard.js
 *      needs to toggle the sidebar open/closed.
 *   2. There is no hamburger button in the navbar, so on mobile there is no way to
 *      open the sidebar.
 *
 * Include this AFTER soft-ui-dashboard.min.js on every page:
 *   <script src="../assets/js/sidebar-fix.js"></script>
 */

(function () {
  // ── 1. Give the <aside> the id the soft-ui JS expects ──────────────────────
  const aside = document.querySelector('aside.sidenav');
  if (aside && !aside.id) {
    aside.id = 'sidenav-main';
  }

  // ── 2. Inject the hamburger button into the top navbar ────────────────────
  // The soft-ui JS listens for clicks on #iconNavbarSidenav.
  // We insert it at the start of the navbar container so it appears top-left.
  function injectHamburger() {
    // Don't inject twice
    if (document.getElementById('iconNavbarSidenav')) return;

    const navbarContainer = document.querySelector('.navbar-main .container-fluid');
    if (!navbarContainer) return;

    const btn = document.createElement('button');
    btn.id = 'iconNavbarSidenav';
    btn.className = 'btn btn-link p-0 d-xl-none me-3';
    btn.setAttribute('aria-label', 'Toggle sidebar');
    btn.setAttribute('type', 'button');
    btn.style.cssText = 'background:none;border:none;cursor:pointer;line-height:1;';
    btn.innerHTML = `
      <div class="sidenav-toggler-inner">
        <i class="sidenav-toggler-line bg-dark"></i>
        <i class="sidenav-toggler-line bg-dark"></i>
        <i class="sidenav-toggler-line bg-dark"></i>
      </div>`;

    // Insert before the first child of the navbar container
    navbarContainer.insertBefore(btn, navbarContainer.firstChild);

    // Wire up the toggle manually (soft-ui-dashboard.js may have already run
    // before we injected the button, so we attach the handler ourselves too)
    btn.addEventListener('click', function () {
      const body = document.body;
      const sidenavEl = document.getElementById('sidenav-main');
      const iconClose = document.getElementById('iconSidenav');
      const className = 'g-sidenav-pinned';

      if (body.classList.contains(className)) {
        body.classList.remove(className);
        if (sidenavEl) {
          setTimeout(() => sidenavEl.classList.remove('bg-white'), 100);
          sidenavEl.classList.remove('bg-transparent');
        }
      } else {
        body.classList.add(className);
        if (sidenavEl) {
          sidenavEl.classList.add('bg-white');
          sidenavEl.classList.remove('bg-transparent');
        }
        if (iconClose) iconClose.classList.remove('d-none');
      }
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHamburger);
  } else {
    injectHamburger();
  }
})();