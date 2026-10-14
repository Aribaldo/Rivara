/* Scrollcraft — scroll-driven motion for Rivara pages.
   data-reveal            fade + rise when entering view
   data-mask              text wipes up from a mask
   data-curtain           image opens from an inset clip
   data-delay="0.2"       stagger (seconds) for the three above
   data-hero              scroll-linked slow zoom/drift (hero media)
   data-hero-fade         content fades & lifts as hero scrolls away
   data-parallax="0.08"   vertical parallax (fraction of viewport)
   data-zoom              scale settles 1.06 → 1 as it scrolls in
   data-line[="y"]        hairline draws in (scaleX / scaleY)
   data-drift="0.25"      horizontal drift linked to scroll
   data-hscroll / data-hscroll-pin / data-hscroll-track   pinned horizontal scroll (≥900px)
*/
(function () {
  if (window.__scrollcraft) return;
  window.__scrollcraft = true;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.22,.61,.24,1)';
  var moving = [], hs = [], bar = null, sy = null;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var els = (e.target.__scFor || []).concat([e.target]);
      els.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none'; el.style.clipPath = 'inset(0% 0% 0% 0%)'; });
      io.unobserve(e.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

  function prep(el) {
    if (el.__sc) return; el.__sc = 1;
    if (reduce) return;
    var d = parseFloat(el.getAttribute('data-delay') || 0) || 0;
    var dur = el.hasAttribute('data-curtain') ? 2.2 : el.hasAttribute('data-mask') ? 1.9 : el.hasAttribute('data-line') ? 2 : 1.6;
    if (el.hasAttribute('data-mask')) { el.style.opacity = '0'; el.style.filter = 'blur(6px)'; el.style.transform = 'translateY(14px)'; }
    else if (el.hasAttribute('data-curtain')) { el.style.clipPath = 'inset(5% 4% 5% 4%)'; el.style.opacity = '0.001'; }
    else if (el.hasAttribute('data-line')) { el.style.transform = el.getAttribute('data-line') === 'y' ? 'scaleY(0)' : 'scaleX(0)'; }
    else { el.style.opacity = '0'; el.style.transform = 'translateY(18px)'; }
    el.getBoundingClientRect();
    el.style.transition = 'opacity ' + dur + 's ' + EASE + ' ' + d + 's, transform ' + dur + 's ' + EASE + ' ' + d + 's, clip-path ' + dur + 's ' + EASE + ' ' + d + 's, filter ' + dur + 's ' + EASE + ' ' + d + 's';
    var target = el;
    if (el.hasAttribute('data-mask') && el.parentElement) { target = el.parentElement; if (target.__scFor) { target.__scFor.push(el); return; } target.__scFor = [el]; }
    requestAnimationFrame(function () { requestAnimationFrame(function () { io.observe(target); }); });
  }

  function layoutH() {
    hs.forEach(function (w) {
      var pin = w.querySelector('[data-hscroll-pin]'), track = w.querySelector('[data-hscroll-track]');
      if (!pin || !track) return;
      var on = window.innerWidth >= 900 && !reduce;
      w.__on = on; w.__track = track;
      if (on) {
        pin.style.position = 'sticky'; pin.style.top = '0px'; pin.style.height = '100vh'; pin.style.overflow = 'hidden';
        stack(w, track, false);
        track.style.overflowX = 'visible'; track.style.scrollSnapType = 'none';
        var dist = Math.max(0, track.scrollWidth - pin.clientWidth);
        w.__dist = dist; w.style.height = (dist + window.innerHeight) + 'px';
      } else {
        pin.style.position = ''; pin.style.height = ''; pin.style.overflow = '';
        track.style.transform = '';
        stack(w, track, true); w.style.height = '';
      }
    });
  }

  var KEYS = ['width', 'maxWidth', 'flex', 'paddingRight', 'display'];
  function save(el, keys) { if (!el.__orig) { el.__orig = {}; keys.forEach(function (k) { el.__orig[k] = el.style[k]; }); } }
  function restore(el) { if (el.__orig) Object.keys(el.__orig).forEach(function (k) { el.style[k] = el.__orig[k]; }); }
  function stack(w, track, on) {
    if (!on && !track.__stacked) return;
    var kids = Array.prototype.slice.call(track.children).concat(Array.prototype.slice.call(w.querySelectorAll(':scope > [data-hscroll-pin] > [data-hscroll-hide]')));
    if (on) {
      save(track, ['flexDirection', 'alignItems', 'gap', 'overflowX', 'scrollSnapType']);
      track.style.flexDirection = 'column'; track.style.alignItems = 'stretch'; track.style.gap = '56px'; track.style.overflowX = 'visible'; track.style.scrollSnapType = 'none';
      kids.forEach(function (c) {
        save(c, KEYS);
        if (c.hasAttribute('data-hscroll-hide')) { c.style.display = 'none'; return; }
        c.style.width = '100%'; c.style.maxWidth = 'none'; c.style.flex = '0 0 auto'; c.style.paddingRight = '0';
      });
      track.__stacked = true;
    } else {
      restore(track); kids.forEach(restore); track.__stacked = false;
    }
  }
  function scan() {
    document.querySelectorAll('[data-reveal],[data-mask],[data-curtain],[data-line]').forEach(prep);
    moving = Array.prototype.slice.call(document.querySelectorAll('[data-parallax],[data-zoom],[data-hero],[data-hero-fade],[data-drift]'));
    hs = Array.prototype.slice.call(document.querySelectorAll('[data-hscroll]'));
    layoutH();
  }

  function frame() {
    var H = window.innerHeight, W = window.innerWidth, ry = window.scrollY;
    sy = sy == null ? ry : sy + (ry - sy) * 0.085; if (Math.abs(ry - sy) < 0.05) sy = ry;
    var y = ry, lag = sy - ry;
    if (bar) {
      var max = document.documentElement.scrollHeight - H;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
    }
    if (!reduce) {
      for (var i = 0; i < moving.length; i++) {
        var el = moving[i], r0 = el.getBoundingClientRect(), r = { top: r0.top - lag, bottom: r0.bottom - lag, height: r0.height };
        if (r.bottom < -300 || r.top > H + 300) continue;
        var t = '';
        if (el.hasAttribute('data-hero')) { var p = clamp(sy / H, 0, 1); t += 'translate3d(0,' + (p * H * 0.14).toFixed(1) + 'px,0) scale(' + (1.02 + p * 0.04).toFixed(4) + ')'; }
        if (el.hasAttribute('data-hero-fade')) { var q = clamp(sy / (H * 0.6), 0, 1); el.style.opacity = String(1 - q); t += ' translate3d(0,' + (-q * 30).toFixed(1) + 'px,0)'; }
        var c = (r.top + r.height / 2 - H / 2) / H;
        if (el.hasAttribute('data-parallax')) { t += ' translate3d(0,' + (-c * (parseFloat(el.getAttribute('data-parallax')) || 0.08) * 0.6 * H).toFixed(1) + 'px,0)'; }
        if (el.hasAttribute('data-drift')) { t += ' translate3d(' + (c * (parseFloat(el.getAttribute('data-drift')) || 0.25) * W).toFixed(1) + 'px,0,0)'; }
        if (el.hasAttribute('data-zoom')) { var z = clamp((H - r.top) / (H * 1.1), 0, 1); t += ' scale(' + (1.06 - 0.06 * z).toFixed(4) + ')'; }
        el.style.transform = t;
      }
      for (var j = 0; j < hs.length; j++) {
        var w = hs[j]; if (!w.__on) continue;
        var rr = w.getBoundingClientRect();
        var pr = w.__dist > 0 ? clamp(-rr.top / w.__dist, 0, 1) : 0;
        w.__track.style.transform = 'translate3d(' + (-pr * w.__dist).toFixed(1) + 'px,0,0)';
        w.style.setProperty('--sc-progress', pr.toFixed(4));
        var ind = w.querySelector('[data-hscroll-bar]'); if (ind) ind.style.transform = 'scaleX(' + pr.toFixed(4) + ')';
      }
    }
    requestAnimationFrame(frame);
  }

  var tm = null;
  function schedule() { clearTimeout(tm); tm = setTimeout(scan, 120); }

  function start() {
    bar = document.createElement('div');
    bar.setAttribute('aria-hidden', 'true');
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:1px;background:#B59444;opacity:.7;transform-origin:0 50%;transform:scaleX(0);z-index:200;pointer-events:none';
    document.body.appendChild(bar);
    scan();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', function () { layoutH(); });
    window.addEventListener('load', layoutH);
    requestAnimationFrame(frame);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
