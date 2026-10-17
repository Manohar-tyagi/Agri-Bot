/* Homepage behaviour: assembly scrub through the 120 render frames,
   pinned capabilities highlight (Navigate → Detect → Harvest),
   draggable telemetry wireframe, and live status polling against the
   Spring Boot API. */

(function () {
  "use strict";

  var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ==========================================================================
     1 · Assembly scrub — canvas driven by scroll over 120 render frames
     ========================================================================= */
  var canvas = document.getElementById("bot-canvas");
  var stageEl = document.getElementById("asc-stage");
  var loader = document.getElementById("asc-loader");
  var caption = document.getElementById("asc-caption");
  var track = document.getElementById("asc-track");
  var frameCount = 120;
  var frames = [];
  var shown = -1;
  var ctx;

  function drawFrame(i) {
    if (!canvas || !frames[i]) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var dpr = window.devicePixelRatio || 1;
    var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw; canvas.height = bh;
    }
    ctx = ctx || canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    var img = frames[i];
    var s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.fillStyle = "#10141a";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function wipeLoader() {
    if (loader && !loader.classList.contains("done")) {
      loader.classList.add("done");
      setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 600);
    }
  }

/* Frames are requested with a RELATIVE path (no leading slash) so they
     resolve both from a local static server and from file://. The `after`
     callback receives the numeric frame INDEX (not the Image element), so
     callers like drawFrame can index the frames[] cache directly. */
  function ensureFrame(i, after) {
    if (frames[i]) { if (after) after(i); return; }
    if (prefersReduced) { i = frameCount - 1; if (frames[i]) { if (after) after(i); return; } }
    var url = "assets/frames/frame_" + String(i + 1).padStart(3, "0") + ".jpg";
    var img = new Image();
    img.onload = function () {
      frames[i] = img;
      if (after) after(i);
    };
    img.onerror = function () {
      frames[i] = null;
      console.error("[agripal] failed to load frame", url);
      if (shown === -1) wipeLoader();
    };
    img.src = url;
  }

  function updateScrub() {
    if (!track || !canvas) return;
    var tr = track.getBoundingClientRect();
    /* Pinned travel = tall wrapper height minus the pinned panel height. */
    var stageH = stageEl ? (stageEl.offsetHeight || window.innerHeight) : window.innerHeight;
    var total = track.offsetHeight - stageH;
    /* Pin offset from the CSS sticky `top` — progress is measured from the
       moment the panel pins, so the full 0..1 range maps onto the travel. */
    var T = stageEl ? (parseFloat(window.getComputedStyle(stageEl).top) || 0) : 0;
    var p = total > 0 ? Math.min(1, Math.max(0, (T - tr.top) / total)) : 1;
    var i = Math.min(frameCount - 1, Math.max(0, Math.round(p * (frameCount - 1))));

    if (i !== shown) {
      shown = i;
      ensureFrame(i, drawFrame);
      if (prefersReduced) return;
      ensureFrame(Math.min(frameCount - 1, i + 1));
      ensureFrame(Math.max(0, i - 1));
    }
    /* caption fades out once the build completes */
    if (caption && p > 0.985 && !caption.classList.contains("faded")) caption.classList.add("faded");
    var bar = document.querySelector(".asc-scrub i");
    if (bar) bar.style.width = (p * 100).toFixed(1) + "%";
  }

  function onScroll() {
    /* Run synchronously on every scroll event — rAF can be throttled by
       background tabs / WebViews, which left the build frame frozen before. */
    updateScrub();
    updateCapabilities();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);

  setTimeout(function () {
    if (shown === -1) wipeLoader();
  }, 9000);

  /* load the first frame eagerly and hide the loader */
  ensureFrame(0, function (img) { drawFrame(0); wipeLoader(); });
  if (prefersReduced) { ensureFrame(frameCount - 1, function () { drawFrame(frameCount - 1); wipeLoader(); }); }

  /* ==========================================================================
     2 · Capabilities — pinned section, labels highlight in sequence
        (Navigate → Detect → Harvest) from scroll progress through the
        200vh track.
     ========================================================================= */
  var capSection = document.getElementById("capabilities");
  var capLabels = document.querySelectorAll(".cap-label");
  var capLabelEls = [].slice.call(capLabels);

  function updateCapabilities() {
    if (!capSection || !capLabelEls.length) return;
    var tr = capSection.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = capSection.offsetHeight - vh;
    /* cap-stage is pinned at top:0, so progress = how far the section has
       travelled past the viewport top, divided by the pinned travel. */
    var p = total > 0 ? Math.min(1, Math.max(0, -tr.top / total)) : 1;
    var phase = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
    capLabelEls.forEach(function (l, idx) {
      l.classList.toggle("lit", idx === phase);
    });
  }
  updateCapabilities();

  /* ==========================================================================
     3 · Hero thumbnail parallax — soft counter-drift on pointer move.
        Desktop only (fine pointer); touch and reduced-motion skip it.
        Tracks the cursor opposite the movement, a few px, layered under
        the idle float (which animates the parent .thumb-img).
     ========================================================================= */
  var hero = document.querySelector(".hero.moodboard");
  var paxFine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (hero && paxFine && !prefersReduced) {
    var thImgs = [].slice.call(hero.querySelectorAll(".thumb img"));
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      var dx = (-nx * 12).toFixed(1), dy = (-ny * 8).toFixed(1);
      for (var k = 0; k < thImgs.length; k++) thImgs[k].style.transform = "translate(" + dx + "px," + dy + "px)";
    });
    hero.addEventListener("pointerleave", function () {
      for (var k = 0; k < thImgs.length; k++) thImgs[k].style.transform = "";
    });
  }

  /* ==========================================================================
     4 · Draggable telemetry wireframe
     ========================================================================= */
  var wire = document.getElementById("wire-rotate");
  if (wire) {
    var rotX = -8, rotY = 18, drag = null;
    function applyRot(animate) {
      wire.style.transition = animate ? "transform .6s " + "cubic-bezier(.22,.61,.36,1)" : "none";
      wire.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
    }
    applyRot(false);
    wire.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY };
      wire.setPointerCapture(e.pointerId);
      applyRot(false);
    });
    wire.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      rotY = Math.min(40, Math.max(-40, rotY + dx * 0.6));
      rotX = Math.min(40, Math.max(-40, rotX - dy * 0.6));
      applyRot(false);
    });
    wire.addEventListener("pointerup", function () { drag = null; applyRot(true); });
    wire.addEventListener("pointercancel", function () { drag = null; applyRot(true); });
  }

  /* ==========================================================================
     5 · Live status polling against the Spring Boot API
     ========================================================================= */
  var statusRows = document.getElementById("stat-rows");
  var valve = { battery: document.getElementById("row-battery"), mode: document.getElementById("row-mode"), obstacle: document.getElementById("row-obstacle"), plucked: document.getElementById("row-plucked") };

  function setOffline(offline) {
    if (!statusRows) return;
    var rows = statusRows.querySelectorAll(".stat-row");
    rows.forEach(function (r) { r.classList.toggle("offline", offline); });
  }

  function applyStatus(d) {
    setOffline(false);
    if (valve.battery) valve.battery.textContent = (d.battery != null ? d.battery : "—") + (typeof d.battery === "number" || (d.battery != null && /%$/.test(String(d.battery))) ? "" : "");
    if (valve.mode) valve.mode.textContent = d.mode || "Standby";
    if (valve.obstacle) valve.obstacle.textContent = d.obstacle || "None";
    if (valve.plucked) {
      var old = valve.plucked.textContent;
      valve.plucked.textContent = d.plucked != null ? d.plucked : "0";
      if (old !== valve.plucked.textContent && valve.plucked.classList) {
        valve.plucked.classList.add("tick");
        setTimeout(function () { valve.plucked.classList.remove("tick"); }, 260);
      }
    }
  }

  function pollStatus() {
    if (!statusRows) return;
    fetch("http://localhost:8080/api/status", { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error("bad"); return res.json(); })
      .then(applyStatus)
      .catch(function () { setOffline(true); });
  }
  pollStatus();
  window.setInterval(pollStatus, 4000);
})();