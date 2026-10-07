/* Social confirm modal: LinkedIn / GitHub / Facebook -> "open in new tab?" with
 * spring animation.
 *
 * Shared by every page that renders the social icon buttons: index.html, the
 * blog post footers, blog.html and faq.html. It used to sit at the end of
 * script.js, and script.js is only ever loaded by index.html - so the identical
 * buttons on a post opened the link straight away with none of the confirmation
 * the homepage gives them. Nothing here needs a page-level stylesheet or markup:
 * it injects its own <style> and builds the dialog on first use, so a page only
 * has to include this file.
 *
 * The click handler is delegated from document and deliberately narrow: brand
 * icon links inside .social-icons / .contact-socials / .social / footer only.
 * Text links in a post's "Thanks for reading" line (.post-footer) are left to
 * open normally, and modifier-clicks are never intercepted. */
(function () {
  const BRANDS = [
    { key: 'linkedin', match: 'linkedin.com/in/glenpatrick', name: 'LinkedIn', color: '#0A66C2', icon: 'fa-brands fa-linkedin', desc: 'My work profile and certifications' },
    { key: 'github', match: 'github.com/Gl3nnnn', name: 'GitHub', color: '#24292f', icon: 'fa-brands fa-github', desc: 'My code and projects' },
    { key: 'facebook', match: 'facebook.com/Gl3nQt', name: 'Facebook', color: '#1877F2', icon: 'fa-brands fa-facebook', desc: 'Say hi and follow along' }
  ];
  const CSS = `
  .social-modal-overlay{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(5,8,12,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;visibility:hidden;transition:opacity .28s ease,visibility 0s linear .28s}
  .social-modal-overlay.show{opacity:1;visibility:visible;transition:opacity .28s ease}
  .social-modal{position:relative;box-sizing:border-box;max-width:calc(100vw - 32px);width:min(380px,100%);border-radius:20px;padding:28px 24px 22px;text-align:center;color:inherit;background:var(--bg-color,var(--panel,#1a1a1a));border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.06) inset;transform:translateY(18px) scale(.94);opacity:0;transition:transform .38s cubic-bezier(.34,1.56,.64,1),opacity .28s ease}
  .social-modal-overlay.show .social-modal{transform:translateY(0) scale(1);opacity:1}
  .social-modal-icon{width:72px;height:72px;margin:0 auto 14px;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:34px;color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.35);transform:scale(.6);opacity:0}
  .social-modal-overlay.show .social-modal-icon{animation:socialIconPop .55s cubic-bezier(.34,1.56,.64,1) .08s forwards}
  @keyframes socialIconPop{0%{transform:scale(.6) rotate(-10deg);opacity:0}60%{transform:scale(1.12) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  .social-modal h3{margin:0 0 6px;font-size:20px;font-weight:700}
  .social-modal p.sub{margin:0 0 14px;font-size:13.5px;opacity:.75;line-height:1.5}
  .social-url{display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:9px 12px;font-size:12.5px;margin-bottom:18px;word-break:break-all;opacity:0;transform:translateY(8px)}
  .social-modal-overlay.show .social-url{animation:socialFadeUp .45s ease .18s forwards}
  .social-url i{opacity:.6}
  @keyframes socialFadeUp{to{opacity:1;transform:translateY(0)}}
  .social-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .social-btn{border-radius:13px;padding:13px 10px;font-weight:700;font-size:14px;cursor:pointer;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;transition:transform .15s ease,border-color .2s,background .2s}
  .social-btn:hover{transform:translateY(-1px)}
  .social-btn:active{transform:translateY(0) scale(.98)}
  .social-btn.primary{color:#fff;border:0;position:relative;overflow:hidden}
  .social-btn.primary::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg);animation:socialShine 2.8s ease infinite}
  @keyframes socialShine{0%{left:-60%}55%{left:130%}100%{left:130%}}
  .social-btn.primary.is-opening{pointer-events:none;opacity:.85}
  .social-close{position:absolute;top:10px;right:12px;border:0;background:transparent;color:inherit;font-size:22px;cursor:pointer;opacity:.6;line-height:1}
  .social-close:hover{opacity:1}
  .social-hint{margin:12px 0 0;font-size:11.5px;opacity:.55}
  [data-theme="light"] .social-modal{background:#fff;border-color:rgba(0,0,0,.08)}
  [data-theme="light"] .social-url{background:#f3f4f6;border-color:rgba(0,0,0,.08)}
  [data-theme="light"] .social-btn{background:#f3f4f6;border-color:rgba(0,0,0,.08)}
  @media (prefers-reduced-motion:reduce){.social-modal-overlay,.social-modal,.social-modal-icon,.social-url{transition:none!important;animation:none!important;transform:none!important;opacity:1!important}.social-btn.primary::after{display:none}}`;
    try {
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
    let overlay = null, pendingUrl = '', pendingName = '';
    function ensure() {
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.className = 'social-modal-overlay';
      overlay.innerHTML = `
        <div class="social-modal" role="dialog" aria-modal="true" aria-labelledby="social-modal-title">
          <button type="button" class="social-close" aria-label="Close">&times;</button>
          <div class="social-modal-icon"><i></i></div>
          <h3 id="social-modal-title">Open LinkedIn?</h3>
          <p class="sub">You are about to open this in a <strong>new tab</strong>.</p>
          <div class="social-url"><i class="fa-solid fa-link"></i><span></span></div>
          <div class="social-actions">
            <button type="button" class="social-btn ghost">Stay here</button>
            <button type="button" class="social-btn primary">Open <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left:6px;font-size:12px"></i></button>
          </div>
          <p class="social-hint">Right-click or long-press the icon to copy the link instead.</p>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) hideSocialModal(); });
      overlay.querySelector('.social-close').addEventListener('click', hideSocialModal);
      overlay.querySelector('.social-btn.ghost').addEventListener('click', hideSocialModal);
      overlay.querySelector('.social-btn.primary').addEventListener('click', confirmOpen);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideSocialModal(); });
      return overlay;
    }
    function openSocialModal(brand, url) {
      pendingUrl = url; pendingName = brand.name;
      const ov = ensure();
      const iconBox = ov.querySelector('.social-modal-icon');
      const iconEl = ov.querySelector('.social-modal-icon i');
      iconBox.style.background = brand.color;
      iconEl.className = brand.icon;
      ov.querySelector('#social-modal-title').textContent = 'Open ' + brand.name + '?';
      ov.querySelector('.sub').innerHTML = 'You are about to open <strong>' + brand.name + '</strong> in a <strong>new tab</strong>.<br>' + brand.desc + '.';
      let clean = url.replace(/^https?:\/\/(www\.)?/, '');
      ov.querySelector('.social-url span').textContent = clean;
      const primary = ov.querySelector('.primary');
      primary.style.background = brand.color;
      primary.classList.remove('is-opening');
      primary.innerHTML = 'Open <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left:6px;font-size:12px"></i>';
      // restart entrance animation
      ov.classList.remove('show');
      void ov.offsetWidth;
      ov.classList.add('show');
      try { ov.querySelector('.social-btn.ghost').focus(); } catch (e) {}
    }
    function confirmOpen() {
      if (!pendingUrl) return;
      const ov = ensure();
      const primary = ov.querySelector('.primary');
      primary.classList.add('is-opening');
      primary.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Opening...';
      const url = pendingUrl;
      setTimeout(() => {
        try { window.open(url, '_blank', 'noopener'); } catch (e) { window.location.href = url; }
        primary.innerHTML = '<i class="fa-solid fa-check"></i> Opened!';
        setTimeout(hideSocialModal, 650);
      }, 450);
    }
    function hideSocialModal() { if (overlay) overlay.classList.remove('show'); }
    window.showSocialModal = openSocialModal;
    window.hideSocialModal = hideSocialModal;
    document.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href*="linkedin.com"],a[href*="github.com/Gl3nnnn"],a[href*="facebook.com/Gl3nQt"]') : null;
      if (!a) return;
      // only social icon buttons (home / contact / footer), not project cards or text links
      const isSocialBtn = a.closest && (a.closest('.social-icons') || a.closest('.contact-socials') || a.closest('.social') || a.closest('footer'));
      // blog post footers have text links - let those open normally
      if (a.closest && a.closest('.post-footer')) return;
      if (!isSocialBtn) {
        // footer wrapper is broad, so double-check it really is a brand icon link
        if (!(a.getAttribute('aria-label') && /linkedin|github|facebook/i.test(a.getAttribute('aria-label')))) return;
      }
      if (a.closest && a.closest('.social-modal-overlay')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || (e.button !== undefined && e.button !== 0)) return;
      e.preventDefault();
      const href = a.getAttribute('href') || '';
      const brand = BRANDS.find(b => href.includes(b.match)) || { name: 'link', color: '#1bb30e', icon: 'fa-solid fa-link', desc: 'External link' };
      openSocialModal(brand, href);
    });
  })();
