/* ═══════════════════════════════════════════════════════════════
   srajit-site v2 :: SAI-ARCHIV — tabbed
   Tier 1: semantic HTML (works without JS — all pages stack).
   Tier 2: tab switching, theme toggle, session clock.
   Tier 3: slash-prompt REPL with thematic easter eggs.
   No deps. Vanilla.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── (a) THEME ─────────────────────────────────────────────── */
  const themeKey = 'sai-archiv:theme';
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function bindThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(themeKey, next);
    });
  }

  /* ── (b) TABS ──────────────────────────────────────────────── */

  function setActiveTab(pageId) {
    const tabs = document.querySelectorAll('.tab[data-page]');
    const pages = document.querySelectorAll('.page[data-page]');
    let matched = false;
    tabs.forEach(t => {
      const is = t.dataset.page === pageId;
      t.classList.toggle('is-active', is);
      if (is) matched = true;
    });
    pages.forEach(p => p.classList.toggle('is-active', p.dataset.page === pageId));
    if (!matched) {
      // fallback to about
      document.querySelector('.tab[data-page="about"]').classList.add('is-active');
      document.querySelector('.page[data-page="about"]').classList.add('is-active');
    }
    // echo command into REPL output if open
    const tab = document.querySelector(`.tab[data-page="${pageId}"]`);
    if (tab && tab.dataset.cmd) {
      echoToRepl(tab.dataset.cmd);
    }
  }

  function bindTabs() {
    document.querySelectorAll('.tab[data-page]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = tab.dataset.page;
        if (!pageId) return;
        history.replaceState(null, '', `#${pageId}`);
        setActiveTab(pageId);
        // scroll up subtly
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });

    // hash routing on load + on hashchange
    const fromHash = () => {
      const id = (location.hash || '').replace('#', '') || 'about';
      setActiveTab(id);
    };
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* ── (c) SESSION CLOCK ─────────────────────────────────────── */

  function startClock() {
    const el = document.getElementById('status-clock');
    if (!el) return;
    const start = Date.now();
    function tick() {
      const s = Math.floor((Date.now() - start) / 1000);
      const hh = String(Math.floor(s / 3600)).padStart(2, '0');
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      el.textContent = `${hh}:${mm}:${ss}`;
    }
    tick();
    if (!reducedMotion) setInterval(tick, 1000);
  }

  /* ── (d) VISITOR COUNTER (honest-fake, local only) ────────── */

  function paintCounter(n) {
    const box = document.getElementById('visitor-counter');
    if (!box) return;
    const digits = String(n).padStart(6, '0').split('');
    box.innerHTML = digits.map(d => `<span class="digit">${d}</span>`).join('');
  }
  function maybeIncrementCounter() {
    const key = 'sai-archiv:visits';
    const cur = parseInt(localStorage.getItem(key) || '412', 10) + 1;
    localStorage.setItem(key, String(cur));
    paintCounter(cur);
  }

  /* ── (e) MISC ──────────────────────────────────────────────── */

  function setYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }
  function setLastIndexed() {
    const el = document.getElementById('last-indexed');
    if (!el) return;
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    el.textContent = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* ── (f) REPL DRAWER ───────────────────────────────────────── */

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function openDrawer() {
    const d = document.getElementById('repl-drawer');
    if (!d) return;
    d.hidden = false;
    d.removeAttribute('aria-hidden');
    const inp = document.getElementById('repl-in');
    if (inp) setTimeout(() => inp.focus(), 30);
  }
  function closeDrawer() {
    const d = document.getElementById('repl-drawer');
    if (!d) return;
    d.hidden = true;
    d.setAttribute('aria-hidden', 'true');
  }
  function echoToRepl(cmd) {
    const out = document.getElementById('repl-out');
    if (!out || !cmd) return;
    if (document.getElementById('repl-drawer').hidden) return;
    out.innerHTML = `<span class="echo">guest@sai-archiv:~$</span> <span class="hl">${escapeHTML(cmd)}</span>`;
  }

  function bindDrawer() {
    const openBtn = document.getElementById('open-prompt');
    const closeBtn = document.getElementById('repl-close');
    const guestBtn = document.getElementById('sign-guestbook');
    if (openBtn) openBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (guestBtn) guestBtn.addEventListener('click', () => {
      openDrawer();
      const inp = document.getElementById('repl-in');
      if (inp) { inp.value = 'guestbook'; setTimeout(() => {
        inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      }, 120); }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        openDrawer();
      }
      if (e.key === 'Escape') closeDrawer();
    });
  }

  /* ── REPL COMMANDS ─────────────────────────────────────────── */

  function gotoTab(id) {
    history.replaceState(null, '', `#${id}`);
    setActiveTab(id);
  }

  const commands = {
    help() {
      return [
        '<span class="dim">commands:</span>',
        '  <span class="acc">about</span>     open the about page',
        '  <span class="acc">research</span>  dissertation &amp; interests',
        '  <span class="acc">talks</span>     list talks',
        '  <span class="acc">writing</span>   working papers / publications',
        '  <span class="acc">contact</span>   address &amp; links',
        '  <span class="acc">cv</span>        open cv (pdf)',
        '  <span class="acc">whois srajit</span>',
        '  <span class="acc">clear</span>     clear this output',
        '',
        '<span class="dim">also: man time · cat kanpur.txt · whois kapital · ls /1947 · guestbook</span>',
      ].join('\n');
    },

    'whois srajit'() {
      return [
        '<span class="hl">Srajit M. Kumar</span>',
        '  PhD candidate · Dept. of History · South Asia Institute',
        '  Heidelberg University · DAAD scholar',
        '  <span class="dim">labour history · time · political consciousness</span>',
      ].join('\n');
    },

    about()    { gotoTab('about');    return `<span class="echo">→ about</span>`; },
    research() { gotoTab('research'); return `<span class="echo">→ research</span>`; },
    talks()    { gotoTab('talks');    return `<span class="echo">→ talks</span>`; },
    writing()  { gotoTab('writing');  return `<span class="echo">→ writing</span>`; },
    contact()  { gotoTab('contact');  return `<span class="echo">→ contact</span>`; },
    cv()       { setTimeout(() => window.open('cv.pdf', '_blank'), 240); return `<span class="ok">→ opening cv.pdf …</span>`; },

    ls()       { return '<span class="dim">about.txt   research/   talks.log   writing/   contact.txt   cv.pdf</span>'; },
    pwd()      { return '<span class="acc">/archive/sai-heidelberg/kumar_s</span>'; },
    whoami()   { return '<span class="dim">guest</span>  <span class="dim">(authenticated read-only)</span>'; },

    'man time'() {
      return [
        '<span class="hl">TIME(1)</span>                                          <span class="dim">SAI-ARCHIV</span>',
        '',
        '<span class="acc">NAME</span>',
        '       time — a contested social category',
        '',
        '<span class="acc">SYNOPSIS</span>',
        '       time [--linear] [--cyclical] [--imposed]',
        '            [--worked] [--unworked] [--resisted]',
        '',
        '<span class="acc">DESCRIPTION</span>',
        '       In nineteenth- and twentieth-century industrial regimes,',
        '       time was instituted as discipline. In the Kanpur mills',
        '       between 1914 and 1947 it was rarely accepted whole.',
        '       Workers turned the shift, the bell, and the clock into',
        '       objects of negotiation.',
        '',
        '<span class="acc">BUGS</span>',
        '       Many. Documented partially. The archive is uneven.',
      ].join('\n');
    },

    'cat kanpur.txt'() {
      return [
        '<span class="dim">// /archive/places/kanpur.txt</span>',
        '',
        'Kanpur (formerly Cawnpore). United Provinces. Cotton and',
        'woollen mills opened from the late nineteenth century along the',
        'Ganges. By the inter-war decades, a labouring population',
        'drawn from agrarian districts — Awadh, Bhojpur, Bundelkhand —',
        'lived between the village and the shift. The site of the',
        'dissertation: how that population learned, and refused, the',
        'clock. <span class="dim">[ 1880s–1950s ]</span>',
      ].join('\n');
    },

    'whois kapital'() {
      return [
        '<span class="hl">KAPITAL</span>  <span class="dim">— author: Marx, K. (1867–1894)</span>',
        '  <span class="dim">on the working day, ch. X.</span>',
        '  <span class="dim">see also:</span> <span class="acc">man time</span>',
      ].join('\n');
    },

    'ls /1947'() {
      return '<span class="warn">[ permission denied ]</span>  <span class="dim">consult: partition.txt — pending release</span>';
    },

    guestbook() {
      return [
        '<span class="hl">~*~ THE GUESTBOOK ~*~</span>',
        '<span class="dim">(handwritten in pencil, on the inside cover)</span>',
        '',
        '  <span class="acc">19 may 2026</span>  — you, just now. thanks for stopping by.',
        '  <span class="acc">06 nov 2024</span>  — somebody asked, in a colloquium,',
        '                  whether the clock was the coloniser.',
        '  <span class="acc">14 aug 1947</span>  — <span class="dim">(page missing)</span>',
        '  <span class="acc">10 apr 1928</span>  — strike at the kanpur mills. several',
        '                  signatures, mostly with an X.',
        '  <span class="acc">28 jul 1914</span>  — first entry. illegible.',
        '',
        '<span class="dim">to sign, send a postcard to room 215.</span>',
      ].join('\n');
    },

    'sudo guestbook'() {
      return '<span class="err">sudo: the guestbook is read-only. it always was.</span>';
    },

    'git blame'() { return '<span class="warn">blame is the wrong frame.</span>'; },
    'git log'()   { return '<span class="dim">commits authored 1914–1947, mostly unsigned.</span>'; },
    history()     { return '<span class="dim">[ access restricted ]</span>  <span class="dim">history is read in the reading room.</span>'; },
    uptime()      { return '<span class="dim">archive open since 1914; load average: heavy.</span>'; },
    uname()       { return '<span class="dim">SAI-ARCHIV  v0.2  Heidelberg / Kanpur</span>'; },
    date()        { return `<span class="hl">${new Date().toUTCString()}</span> <span class="dim">— but whose time?</span>`; },
    time()        { return `<span class="hl">${new Date().toLocaleTimeString()}</span> <span class="dim">— see <span class="acc">man time</span>.</span>`; },
    clock()       { return '<span class="dim">tick. tock. the clock is a contested object.</span>'; },
    sudo()        { return '<span class="err">permission denied</span> <span class="dim">— the archive is read-only.</span>'; },
    rm()          { return '<span class="err">rm: refusing to delete the historical record.</span>'; },
    exit()        { closeDrawer(); return null; },
    cat()         { return '<span class="dim">🐈  meow.  usage: cat &lt;file&gt;</span>'; },

    clear() {
      const out = document.getElementById('repl-out');
      if (out) out.innerHTML = '';
      return null;
    },
  };

  function runREPL() {
    const input = document.getElementById('repl-in');
    const out = document.getElementById('repl-out');
    if (!input || !out) return;

    function exec(raw) {
      const cmd = raw.trim().toLowerCase();
      if (!cmd) return;
      let fn = commands[cmd]
            || commands[cmd.split(' ').slice(0, 2).join(' ')]
            || commands[cmd.split(' ')[0]];
      const echo = `<span class="echo">guest@sai-archiv:~$</span> <span class="hl">${escapeHTML(raw)}</span>`;
      if (!fn) {
        out.innerHTML = `${echo}\n<span class="err">command not found:</span> <span class="dim">${escapeHTML(cmd)}</span> — try '<span class="acc">help</span>'`;
        return;
      }
      const res = fn();
      if (res === null) return;
      out.innerHTML = `${echo}\n${res}`;
    }

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const val = input.value;
      input.value = '';
      exec(val);
    });
  }

  /* ── BOOT ──────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    bindThemeToggle();
    bindTabs();
    bindDrawer();
    startClock();
    setYear();
    setLastIndexed();
    maybeIncrementCounter();
    runREPL();
  });
})();
