/* Email modal: copy-first popup for mailto links.
 *
 * Shared by every page with a mail link: index.html, the blog post footers,
 * blog.html and faq.html. It lived at the end of script.js, which only
 * index.html loads, so the identical envelope button on a post fired the
 * mailto: straight at the OS - the exact case this modal exists for, a PC with
 * no default mail app that opens a chooser and does nothing.
 *
 * Like the social modal it injects its own <style> and builds the dialog on
 * first use, so a page only has to include this file. */
/* Email modal: copy-first popup for mailto links.
   Why: on PCs with no default mail app, clicking mailto opens a
   browser/app chooser that does nothing. This intercepts mailto
   clicks and offers Copy + Gmail + Outlook + mail-app options. */
(function emailModalSetup() {
  const EMAIL = 'patrickcabansag5@gmail.com';
  const CSS = `
  .email-modal-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,8,6,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .28s ease}
  .email-modal-overlay.show{opacity:1;pointer-events:auto}
  .email-modal{width:min(400px,94vw);border-radius:22px;padding:28px 24px 22px;text-align:center;position:relative;overflow:hidden;background:var(--bg-color,var(--panel,#101410));color:var(--text-color,var(--text,#eef3ee));border:1px solid rgba(27,179,14,.35);box-shadow:0 24px 80px rgba(0,0,0,.55);transform:translateY(14px) scale(.97);transition:transform .28s ease}
  .email-modal-overlay.show .email-modal{transform:none}
  .email-modal-icon{width:64px;height:64px;margin:0 auto 12px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;background:rgba(27,179,14,.14);border:1px solid rgba(27,179,14,.4)}
  .email-modal h3{margin:0 0 6px;font-size:20px}
  .email-modal p{margin:0 0 14px;font-size:14px;opacity:.85;line-height:1.5}
  .email-addr{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 12px;font-size:14px;margin-bottom:14px;word-break:break-all}
  .email-addr button{flex:none;border:0;border-radius:9px;padding:8px 12px;font-weight:700;cursor:pointer;background:#1bb30e;color:#fff}
  .email-addr button.is-copied{background:#fff;color:#1bb30e}
  .email-actions{display:grid;gap:10px}
  .email-actions a{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border-radius:12px;padding:12px;font-weight:700;font-size:14px;border:1px solid rgba(255,255,255,.16);color:inherit;background:rgba(255,255,255,.05)}
  .email-actions a:hover{border-color:#1bb30e}
  .email-actions a.primary{background:#1bb30e;border-color:#1bb30e;color:#fff}
  .email-close{position:absolute;top:10px;right:12px;border:0;background:transparent;color:inherit;font-size:22px;cursor:pointer;opacity:.7;line-height:1}
  .email-close:hover{opacity:1}`;
  try {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  } catch (e) {}
  let overlay = null;
  function close() {
    if (overlay) overlay.classList.remove('show');
  }
  function copyText(txt, btn) {
    const done = () => {
      if (btn) {
        const old = btn.textContent;
        btn.textContent = 'Copied!';
        try { btn.classList.add('is-copied'); } catch (e) {}
        setTimeout(() => { btn.textContent = old; try { btn.classList.remove('is-copied'); } catch (e2) {} }, 2000);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done).catch(done);
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = txt;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {}
      done();
    }
  }
  function openModal(email, mailtoHref) {
    const to = email || EMAIL;
    const gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to);
    const outlook = 'https://outlook.live.com/mail/deeplink/compose?to=' + encodeURIComponent(to);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'email-modal-overlay';
      overlay.innerHTML = `
        <div class="email-modal" role="dialog" aria-modal="true" aria-label="Send email">
          <button type="button" class="email-close" aria-label="Close">&times;</button>
          <div class="email-modal-icon">✉️</div>
          <h3>Send me an email</h3>
          <p>No mail app? No problem — copy my address or open it in Gmail.</p>
          <div class="email-addr"><span class="email-text"></span><button type="button" class="email-copy">Copy</button></div>
          <div class="email-actions">
            <a class="primary email-gmail" target="_blank" rel="noopener">Open in Gmail</a>
            <a class="email-outlook" target="_blank" rel="noopener">Open in Outlook</a>
            <a class="email-app">Use my mail app</a>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('.email-close').addEventListener('click', close);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
    overlay.querySelector('.email-text').textContent = to;
    overlay.querySelector('.email-gmail').href = gmail;
    overlay.querySelector('.email-outlook').href = outlook;
    const appLink = overlay.querySelector('.email-app');
    appLink.href = mailtoHref || ('mailto:' + to);
    appLink.onclick = () => { setTimeout(close, 300); };
    const copyBtn = overlay.querySelector('.email-copy');
    copyBtn.onclick = () => copyText(to, copyBtn);
    overlay.classList.add('show');
    try { overlay.querySelector('.email-close').focus(); } catch (e) {}
  }
  window.showEmailModal = openModal;
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="mailto:"]') : null;
    if (!a) return;
    if (a.closest && a.closest('.email-modal-overlay')) return;
    // Let the plain text contact email behave as a normal link on right-click/copy,
    // but left-click opens the helper modal so visitors without a mail app are not stuck.
    if (e.metaKey || e.ctrlKey || e.shiftKey || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault();
    const href = a.getAttribute('href') || '';
    const to = href.replace(/^mailto:/i, '').split('?')[0] || EMAIL;
    openModal(to, href);
  });
})();
