(function () {
  "use strict";

  var GREEN = "#3ddc84";
  var PAPER = "#f6f7f3";
  var R = 92;
  var PUSH = 30;

  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DENSE = window.innerWidth < 768 || !FINE;
  var CAP = DENSE ? 2600 : 5200;
  var RADIUS = DENSE ? 1 : 1.25;

  var INFO = {
    components: {
      num: "01",
      label: "COMPONENTS",
      bread: "[ 01 / 03 ] — HARDWARE BREAKDOWN",
      tag: "HARDWARE × SOFTWARE",
      big: "Under the hood",
      desc: "Eight subsystems — chassis and drive, line following, obstacle sensing, the harvesting arm, power, control, sensors and connectivity — working as one field robot.",
      figCap: "FIG. 01 / SYSTEM OVERVIEW",
      figNote: "Sensing on top, a control core in the middle, actuation and drive below — every subsystem plugs into the same loop.",
      rowsTitle: "Eight subsystems",
      rowsSub: "Each row expands into the full write-up — components, sensors and what they actually do.",
      rows: [
        { t: "Chassis & Drive System", d: "Cut acrylic frame, 4 driven wheels, differential PID drive.", mono: "CS" },
        { t: "Line Following Module", d: "IR sensor array + PID keeps the bot centred on the row.", mono: "LF" },
        { t: "Obstacle Detection & Avoidance", d: "Ultrasonic ranging scans ahead; halts, reroutes or alerts.", mono: "OD" },
        { t: "Plucking / Harvesting Arm", d: "Servo gripper arm that reaches out, grips and plucks.", mono: "PA" },
        { t: "Power System", d: "Li-ion pack, BMS balance, under-voltage cutoff.", mono: "PW" },
        { t: "Control Unit", d: "Runs line PID, sensor loop and telemetry.", mono: "CU" },
        { t: "Connectivity & Monitoring", d: "Status packets, local API, live dashboard.", mono: "CM" },
        { t: "Sensor Suite", d: "Camera vision + IR + ultrasonic keep the bot aware.", mono: "SS" }
      ]
    },
    specs: {
      num: "02",
      label: "SPECS",
      bread: "[ 02 / 03 ] — THE BUILD SHEET",
      tag: "MECHANICS × ELECTRONICS",
      big: "The build sheet",
      desc: "The numbers behind the bot: laser-cut acrylic chassis, differential drive, weighted IR line sensing, ultrasonic obstacle scan and the Spring Boot telemetry pipeline.",
      figCap: "FIG. 02 / TECHNICAL LAYOUT",
      figNote: "Every number that decides how the bot moves, steers and senses its way down a row.",
      rowsTitle: "Seven headline numbers",
      rowsSub: "The spec sheet distilled — chassis, motion, control, perception, power.",
      rows: [
        { t: "Chassis", d: "3mm laser-cut acrylic, differential drive, 4 driven wheels.", mono: "CH", how: "The acrylic chassis keeps weight low while four driven wheels with differential drive hold a straight line over uneven rows." },
        { t: "Drive motors", d: "4 × DC gear motors, bi-directional motor driver.", mono: "DM", how: "Four DC gear motors bring both power and torque; the driver handles full bidirectional control with PWM." },
        { t: "Controller", d: "On-board microcontroller, 100Hz control loop.", mono: "CT", how: "A single microcontroller runs the 100Hz loop that ties sensors, steering and the arm together." },
        { t: "Sensors", d: "IR line array, ultrasonic rangefinder, optional camera vision.", mono: "SN", how: "The IR array tracks the guide line, the ultrasonic scans ahead, and the optional camera helps identify ripe fruit." },
        { t: "Power source", d: "Rechargeable Li-ion pack + BMS, 5V/3.3V rails.", mono: "PS", how: "The Li-ion pack with balancing BMS feeds a regulated 5V/3.3V logic rail with under-voltage and over-current protection." },
        { t: "Speed control", d: "Differential PID speed control, weighted line error.", mono: "SC", how: "PID corrects per-side motor speed hundreds of times a second so the bot stays centred on the guide line." },
        { t: "Payload", d: "Integrated tray with quick-release.", mono: "PL", how: "The quick-release tray snaps out at the end of a pass to unload the plucked produce." }
      ]
    },
    status: {
      num: "03",
      label: "LIVE STATUS",
      bread: "[ 03 / 03 ] — LIVE TELEMETRY",
      tag: "LOCAL API × DASHBOARD",
      big: "Live telemetry",
      desc: "Battery, mode, obstacle count and harvests stream from the on-board controller over the local Spring Boot API — with a graceful offline state when it isn't running.",
      figCap: "FIG. 03 / TELEMETRY VIEW",
      figNote: "Status packets flow from the controller to the Spring Boot API and out to this dashboard.",
      rowsTitle: "Four live fields",
      rowsSub: "The controller publishes a small status packet; these four values are what the dashboard renders.",
      rows: [
        { t: "Battery", d: "Remaining charge, reported by the BMS.", mono: "BA", how: "Telemetry polls the charge level and raises an alert when it drops below the swap threshold." },
        { t: "Mode", d: "Idle, line-following, obstacle handling or harvesting.", mono: "MD", how: "The controller publishes its current state, so the dashboard always shows which task the bot is in." },
        { t: "Last obstacle", d: "Most recent object detected, and when.", mono: "LO", how: "Every close pass by the rangefinder records distance and time, building a log of row traffic." },
        { t: "Items plucked", d: "Harvest count since the run started.", mono: "HP", how: "Each successful pluck increments the counter shown on the live dashboard." }
      ]
    }
  };

  var currentKey = null;
  var page = null;
  var canvas = null;
  var ctx = null;
  var rect = null;
  var stageW = 0;
  var stageH = 0;
  var parts = [];
  var ambient = [];
  var running = false;
  var rafId = 0;
  var morphed = false;
  var hovered = false;
  var mx = -10000;
  var my = -10000;
  var textAnchors = {};
  var botAnchors = null;
  var morphSettledAt = 0;
  var eyeCount = 0;
  var irisW = 0;
  var irisH = 0;

  function stageSize() {
    irisW = window.innerWidth;
    irisH = window.innerHeight;
  }

  function makeAnchors(draw, withEyes) {
    var ca = document.createElement("canvas");
    ca.width = stageW;
    ca.height = stageH;
    var g1 = ca.getContext("2d", { willReadFrequently: true });
    var cb = null;
    var g2 = null;
    if (withEyes) {
      cb = document.createElement("canvas");
      cb.width = stageW;
      cb.height = stageH;
      g2 = cb.getContext("2d", { willReadFrequently: true });
    }
    var step = 2;
    var out = null;
    for (var guard = 0; guard < 9; guard++) {
      g1.clearRect(0, 0, stageW, stageH);
      draw(g1);
      var d1 = g1.getImageData(0, 0, stageW, stageH).data;
      var d2 = null;
      if (withEyes) {
        g2.clearRect(0, 0, stageW, stageH);
        drawEyes(g2);
        d2 = g2.getImageData(0, 0, stageW, stageH).data;
      }
      out = [];
      for (var y = 0; y < stageH; y += step) {
        for (var x = 0; x < stageW; x += step) {
          var i4 = (y * stageW + x) * 4;
          if (d1[i4 + 3] > 128) {
            out.push({ x: x, y: y, eye: withEyes ? d2[i4 + 3] > 128 : false });
          }
        }
      }
      if (out.length <= CAP || step > 12) return out;
      step = step < 4 ? step + 1 : step + 2;
    }
    return out;
  }

  function drawLabel(g, label) {
    g.fillStyle = PAPER;
    g.textAlign = "center";
    g.textBaseline = "middle";
    var fs = Math.min(stageW * 0.125, stageH * 0.18);
    g.font = "900 " + fs + "px 'Archivo Black', 'Arial Black', sans-serif";
    var tw = g.measureText(label).width;
    if (tw > stageW * 0.9) {
      fs = (fs * stageW * 0.9) / tw;
      g.font = "900 " + fs + "px 'Archivo Black', 'Arial Black', sans-serif";
    }
    g.fillText(label, stageW / 2, stageH * 0.4);
  }

  function botTransform(g) {
    var s = Math.min((stageW * 0.46) / 310, (stageH * 0.5) / 380);
    g.save();
    g.translate(stageW / 2, stageH * 0.54);
    g.scale(s, s);
    g.translate(-155, -190);
    g.lineJoin = "round";
    g.lineCap = "round";
    g.strokeStyle = PAPER;
    g.fillStyle = PAPER;
  }

  function drawBot(g) {
    botTransform(g);
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(150, -32);
    g.lineTo(150, 14);
    g.stroke();
    g.beginPath();
    g.arc(150, -42, 13, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(86, 30);
    g.lineTo(214, 30);
    g.lineTo(214, 118);
    g.lineTo(86, 118);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.arc(128, 74, 13, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(172, 74, 13, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(106, 106);
    g.lineTo(194, 106);
    g.stroke();
    g.beginPath();
    g.moveTo(150, 118);
    g.lineTo(150, 150);
    g.stroke();
    g.lineWidth = 13;
    g.beginPath();
    g.moveTo(66, 150);
    g.lineTo(234, 150);
    g.lineTo(234, 252);
    g.lineTo(66, 252);
    g.closePath();
    g.stroke();
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(106, 168);
    g.lineTo(194, 168);
    g.lineTo(194, 196);
    g.lineTo(106, 196);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.moveTo(118, 220);
    g.lineTo(182, 220);
    g.stroke();
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(66, 166);
    g.lineTo(30, 210);
    g.lineTo(34, 254);
    g.stroke();
    g.beginPath();
    g.moveTo(234, 166);
    g.lineTo(270, 210);
    g.lineTo(266, 254);
    g.stroke();
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(32, 266, 15, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(268, 266, 15, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 14;
    g.beginPath();
    g.arc(96, 292, 44, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(204, 292, 44, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  function drawEyes(g) {
    botTransform(g);
    g.beginPath();
    g.arc(128, 74, 13, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(172, 74, 13, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function anchorsFor(key) {
    if (!textAnchors[key]) {
      textAnchors[key] = makeAnchors(function (g) {
        drawLabel(g, INFO[key].label);
      }, false);
    }
    return textAnchors[key];
  }

  function anchorsForBot() {
    if (!botAnchors) botAnchors = makeAnchors(drawBot, true);
    return botAnchors;
  }

  function pickAnchors() {
    return morphed ? anchorsForBot() : anchorsFor(currentKey);
  }

  function spawnParticles(list) {
    var n = list.length;
    parts = [];
    for (var i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * stageW,
        y: Math.random() * stageH,
        ax: list[i].x,
        ay: list[i].y,
        rate: 0.08 + ((i % 9) * 0.009),
        ph: Math.random() * Math.PI * 2,
        start: (i / (n - 1)) * 420 + ((i % 17) * 9),
        eye: false,
        ox: 0,
        oy: 0
      });
    }
    eyeCount = 0;
  }

  function spawnAmbient() {
    ambient = [];
    var gap = DENSE ? 44 : 38;
    for (var y = 8; y < stageH; y += gap) {
      for (var x = 8; x < stageW; x += gap) {
        ambient.push({
          x: Math.random() * stageW,
          y: Math.random() * stageH,
          ax: x + (Math.random() - 0.5) * gap * 0.6,
          ay: y + (Math.random() - 0.5) * gap * 0.6,
          rate: 0.05 + Math.random() * 0.03,
          ph: Math.random() * Math.PI * 2,
          start: (ambient.length % 23) * 8,
          eye: false,
          ox: 0,
          oy: 0,
          base: 0.24 + Math.random() * 0.14,
          rad: (DENSE ? 0.7 : 0.9) + Math.random() * 0.4
        });
      }
    }
  }

  function scrollProgress() {
    if (!page) return 0;
    return Math.min(1, Math.max(0, page.scrollTop / Math.max(1, stageH)));
  }

  function retarget(list, now) {
    var n = parts.length;
    var L = list.length;
    eyeCount = 0;
    for (var i = 0; i < n; i++) {
      var j = L > 1 ? Math.round((i * (L - 1)) / (n - 1)) : 0;
      parts[i].ax = list[j].x;
      parts[i].ay = list[j].y;
      parts[i].eye = !!(list[j].eye);
      parts[i].ox = 0;
      parts[i].oy = 0;
      parts[i].start = 0;
      if (parts[i].eye) eyeCount++;
    }
  }

  function tickAt(now) {
    if (!ctx) return;
    var over = hovered && FINE;
    var rx = rect ? rect.left : 0;
    var ry = rect ? rect.top : 0;
    var mxs = mx - rx;
    var mys = my - ry;
    var sp = scrollProgress();
    var amp = sp * sp * 72 + sp * 16;
    var fade = 1 - sp * 0.97;
    var uw = now * 0.0012;
    ctx.clearRect(0, 0, stageW, stageH);
    ctx.fillStyle = GREEN;

    for (var a = 0; a < ambient.length; a++) {
      var ap = ambient[a];
      if (now < ap.start) continue;
      var uu = uw + ap.ph;
      var atx = ap.ax + Math.sin(uu) * 0.4;
      var aty = ap.ay + Math.cos(uu * 1.15) * 0.3;
      if (over) {
        var adx = ap.x - mxs;
        var ady = ap.y - mys;
        var ad2 = adx * adx + ady * ady;
        if (ad2 < R * R) {
          var ad = Math.sqrt(ad2) || 1;
          var arf = 1 - ad / R;
          atx += (adx / ad) * PUSH * 0.7 * arf * arf;
          aty += (ady / ad) * PUSH * 0.7 * arf * arf;
        }
      }
      var asw = Math.sin(ap.x * 0.011 + sp * 14 + uw);
      atx += Math.cos(ap.x * 0.009 + sp * 9 + uw * 1.7) * amp * 0.5 + (ap.x - stageW / 2) * sp * sp * 0.14;
      aty += asw * amp - sp * amp * 0.55 + (ap.y - stageH * 0.5) * sp * sp * 0.14;
      var ak = ap.rate;
      ap.x += (atx - ap.x) * ak;
      ap.y += (aty - ap.y) * ak;
      ctx.globalAlpha = ap.base * fade;
      ctx.beginPath();
      ctx.arc(ap.x, ap.y, ap.rad, 0, 6.2832);
      ctx.fill();
    }

    var n = parts.length;
    var eyeOn = morphed && running && eyeCount > 0 && now - morphSettledAt > 1150;
    var cx = 0;
    var cy = 0;
    if (eyeOn) {
      var s = 0;
      for (var e = 0; e < n; e++) {
        if (parts[e].eye) {
          cx += parts[e].ax;
          cy += parts[e].ay;
          s++;
        }
      }
      cx /= s;
      cy /= s;
    }
    var lookX = Math.cos(now * 0.0005) * 2.6;
    var lookY = Math.sin(now * 0.00035) * 1.4;
    for (var i = 0; i < n; i++) {
      var p = parts[i];
      if (now < p.start) continue;
      var u = now * 0.0016;
      var tx = p.ax + Math.sin(u + p.ph) * 0.7;
      var ty = p.ay + Math.cos(u * 1.3 + p.ph) * 0.5;
      if (eyeOn && p.eye) {
        var edx;
        var edy;
        if (over) {
          edx = mxs - cx;
          edy = mys - cy;
          var el = Math.hypot(edx, edy) || 1;
          var em = Math.min(1, el / 260);
          var mag = 1.4 + 2.6 * em;
          edx = (edx / el) * mag;
          edy = (edy / el) * mag;
        } else {
          edx = lookX + Math.sin(now * 0.001 + p.ph) * 0.25;
          edy = lookY + Math.cos(now * 0.0013 + p.ph) * 0.2;
        }
        p.ox += (edx - p.ox) * 0.12;
        p.oy += (edy - p.oy) * 0.12;
        tx += p.ox;
        ty += p.oy;
      } else if (over) {
        var pdx = p.x - mxs;
        var pdy = p.y - mys;
        var pd2 = pdx * pdx + pdy * pdy;
        if (pd2 < R * R) {
          var pd = Math.sqrt(pd2) || 1;
          var pf = 1 - pd / R;
          var push = PUSH * pf * pf;
          tx += (pdx / pd) * push;
          ty += (pdy / pd) * push;
        }
      }
      var psw = Math.sin(p.x * 0.011 + sp * 14 + uw);
      tx += Math.cos(p.x * 0.009 + sp * 9 + uw * 1.7) * amp * 0.5 + (p.x - stageW / 2) * sp * sp * 0.14;
      ty += psw * amp - sp * amp * 0.55 + (p.y - stageH * 0.5) * sp * sp * 0.14;
      var k = p.rate;
      p.x += (tx - p.x) * k;
      p.y += (ty - p.y) * k;
      ctx.globalAlpha = 0.85 * fade;
      ctx.beginPath();
      ctx.arc(p.x, p.y, RADIUS, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (!running) return;
    tickAt(now);
    rafId = requestAnimationFrame(loop);
  }

  function rowMarkup(key, idx) {
    var info = INFO[key];
    var r = info.rows[idx];
    var inner = "";
    if (key === "components") {
      var m = window.AgriPalUI && AgriPalUI.MODALS && AgriPalUI.MODALS.components;
      var card = m && m.cards ? m.cards[idx % m.cards.length] : null;
      if (card) {
        if (card.spec && card.spec.length) {
          inner += "<ul>";
          card.spec.forEach(function (s) {
            inner += "<li>" + s + "</li>";
          });
          inner += "</ul>";
        }
        if (card.how) inner += "<p>" + card.how + "</p>";
        else inner += "<p>" + r.d + "</p>";
      } else {
        inner += "<p>" + r.d + "</p>";
      }
    } else {
      inner += "<p>" + r.d + "</p>";
      if (r.how) inner += "<p>" + r.how + "</p>";
    }
    var nn = (idx + 1 < 10 ? "0" : "") + (idx + 1);
    return (
      '<div class="pt-item">' +
      '<button class="pt-rowhead" type="button" aria-expanded="false" aria-controls="ptd-' + nn + '">' +
      '<span class="pt-num">' + nn + "</span>" +
      '<span class="pt-title">' + r.t + "</span>" +
      '<span class="pt-iconsq">' + r.mono + "</span>" +
      '<span class="pt-brief">' + r.d + "</span>" +
      '<span class="pt-plus" aria-hidden="true">&plus;</span>' +
      "</button>" +
      '<div class="pt-detail" id="ptd-' + nn + '" role="region">' + inner + "</div>" +
      "</div>"
    );
  }

  function storyMarkup(key) {
    var info = INFO[key];
    var h = '<section class="pt-intro"><div class="pt-intro-inner">' +
      '<div class="pt-kicker"><span class="pt-part">' +
      info.num + " / " + info.label +
      '</span><span class="pt-tag">' + info.tag + "</span></div>" +
      '<hr class="pt-rule">' +
      '<div class="pt-intro-grid">' +
      '<div class="pt-intro-text"><h2>' + info.big + "</h2><p>" + info.desc + "</p></div>" +
      '<figure class="pt-fig">' + staticBotSvg() +
      "<figcaption>" + info.figCap + "</figcaption>" +
      '<p class="pt-fig-note">' + info.figNote + "</p></figure>" +
      "</div></div></section>";
    h += '<section class="pt-rows"><div class="pt-rows-inner">' +
      '<h3 class="pt-rows-title">' + info.rowsTitle + "</h3>" +
      '<p class="pt-rows-sub">' + info.rowsSub + "</p>" +
      '<div class="pt-rows-list">';
    for (var i = 0; i < info.rows.length; i++) {
      h += rowMarkup(key, i);
    }
    h += "</div></div></section>";
    return h;
  }

  function footMarkup(key) {
    var info = INFO[key];
    return (
      '<section class="pt-foot"><div class="pt-foot-inner"><p>Agri-Pal / section ' +
      info.num +
      " of 03</p><b>Designed for the field</b></div></section>"
    );
  }

  function bindAccordion(scope) {
    scope.querySelectorAll(".pt-rowhead").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".pt-item");
        var open = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  function bindReveal(scope) {
    var rows = scope.querySelector(".pt-rows");
    if (!rows) return;
    var items = rows.querySelectorAll(".pt-item");
    var io = "IntersectionObserver" in window
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add("is-in");
              io.unobserve(en.target);
            }
          });
        }, { rootMargin: "0px 0px -8% 0px" })
      : null;
    var revealAllInView = function () {
      var limit = window.innerHeight - Math.round(window.innerHeight * 0.08);
      items.forEach(function (it) {
        if (it.classList.contains("is-in")) return;
        if (it.getBoundingClientRect().top < limit) {
          it.classList.add("is-in");
          if (io) io.unobserve(it);
        }
      });
    };
    items.forEach(function (it, i) {
      it.style.transitionDelay = Math.min(i, 8) * 45 + "ms";
      if (io) io.observe(it);
    });
    if (scope.addEventListener) scope.addEventListener("scroll", revealAllInView, { passive: true });
    revealAllInView();
  }

  function staticBotSvg() {
    return (
      '<svg class="pt-bot-svg" viewBox="0 0 310 380" aria-hidden="true"><g fill="none" stroke="' +
      GREEN +
      '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M150 -32 V14"/><circle cx="150" cy="-42" r="13" fill="' +
      GREEN +
      '" stroke="none"/>' +
      '<rect x="88" y="30" width="124" height="88"/>' +
      '<circle cx="128" cy="74" r="13" fill="' +
      GREEN +
      '" stroke="none"/><circle cx="172" cy="74" r="13" fill="' +
      GREEN +
      '" stroke="none"/>' +
      '<path d="M106 106 H194 M150 118 V150"/><rect x="68" y="150" width="164" height="102"/>' +
      '<path d="M106 168 H194 V196 H106 M118 220 H182"/>' +
      '<path d="M68 166 C 40 190 34 214 38 256 M232 166 C 260 190 266 214 262 256"/>' +
      '<circle cx="36" cy="266" r="15" fill="' +
      GREEN +
      '" stroke="none"/><circle cx="264" cy="266" r="15" fill="' +
      GREEN +
      '" stroke="none"/>' +
      '<circle cx="96" cy="292" r="44"/><circle cx="204" cy="292" r="44"/>' +
      "</g></svg>"
    );
  }

  function buildPage(key, cx, cy) {
    var info = INFO[key];
    page = document.createElement("div");
    page.className = "pt-page";
    page.setAttribute("role", "dialog");
    page.setAttribute("aria-modal", "true");

    if (REDUCED) {
      page.setAttribute("data-calm", "");
      page.innerHTML =
        '<button class="pt-close" aria-label="Close intro">&times;</button>' +
        '<div class="pt-inner"><section class="pt-stage pt-static-stage">' +
        '<p class="pt-bread">' + info.bread + "</p>" +
        '<h2 class="pt-static">' + info.label + "</h2>" +
        '<p class="pt-desc">' + info.desc + "</p>" +
        '<button class="pt-swap" type="button">See it as the bot</button>' +
        '<div class="pt-bot-box" hidden>' + staticBotSvg() + "</div>" +
        '<p class="pt-hint">Scroll to explore &#8595;</p></section>' +
        '<div class="pt-story">' + storyMarkup(key) + "</div>" +
        footMarkup(key) +
        "</div>";
    } else {
      page.innerHTML =
        '<button class="pt-close" aria-label="Close intro">&times;</button>' +
        '<div class="pt-inner"><section class="pt-stage">' +
        '<canvas class="pt-canvas" role="img" aria-label="Interactive particle text: ' +
        info.label +
        ' — click to remould into the robot silhouette"></canvas>' +
        '<p class="pt-bread">' + info.bread + "</p>" +
        '<p class="pt-hint">Scroll to explore &#8595;</p>' +
        '<p class="pt-morph">Remould into the bot &#8598;</p>' +
        "</section>" +
        '<div class="pt-story">' + storyMarkup(key) + "</div>" +
        footMarkup(key) +
        "</div>";
    }

    var radius = Math.hypot(irisW, irisH) * 1.15;
    page.style.setProperty("--c0", "circle(0px at " + cx + "px " + cy + "px)");
    page.style.setProperty("--c1", "circle(" + radius + "px at " + cx + "px " + cy + "px)");
    document.body.appendChild(page);
    void page.offsetWidth;
    if (!REDUCED) page.classList.add("is-open");
    else page.classList.add("is-open-calm");

    bindAccordion(page);
    bindReveal(page);

    var closeBtn = page.querySelector(".pt-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        close();
      });
      setTimeout(function () {
        try { closeBtn.focus(); } catch (e2) {}
      }, 60);
    }

    if (REDUCED) {
      var swap = page.querySelector(".pt-swap");
      var botBox = page.querySelector(".pt-bot-box");
      if (swap && botBox) {
        swap.addEventListener("click", function () {
          botBox.hidden = !botBox.hidden;
          swap.textContent = botBox.hidden ? "See it as the bot" : "Back to the label";
        });
      }
      page.dataset.ready = "1";
      return;
    }

    canvas = page.querySelector(".pt-canvas");
    ctx = canvas.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    rect = canvas.getBoundingClientRect();
    stageW = Math.max(1, Math.round(rect.width));
    stageH = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(stageW * dpr);
    canvas.height = Math.round(stageH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    spawnAmbient();

    canvas.addEventListener("pointermove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      hovered = true;
    });
    canvas.addEventListener("pointerleave", function () {
      hovered = false;
    });
    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      morph(performance.now());
    });

    var ready = window.document.fonts ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      if (!canvas) return;
      var list = anchorsFor(key);
      spawnParticles(list);
      running = true;
      rafId = requestAnimationFrame(loop);
      page.dataset.ready = "1";
    });
  }

  function applyKey(key) {
    var info = INFO[key];
    var story = page.querySelector(".pt-story");
    var part = page.querySelector(".pt-part");
    if (story) story.outerHTML = '<div class="pt-story">' + storyMarkup(key) + "</div>";
    if (part) part.textContent = info.num + " / " + info.label;
    var foot = page.querySelector(".pt-foot");
    if (foot) foot.outerHTML = footMarkup(key);
    currentKey = key;
    bindAccordion(page);
    bindReveal(page);
    var cv = page.querySelector(".pt-canvas");
    if (cv) cv.setAttribute("aria-label", "Interactive particle text: " + info.label + " — click to remould into the robot silhouette");
    var b = page.querySelector(".pt-bread");
    if (b) b.textContent = info.bread;
    if (REDUCED) {
      var d2 = page.querySelector(".pt-desc");
      if (d2) d2.textContent = info.desc;
      var st = page.querySelector(".pt-static");
      if (st) st.textContent = info.label;
    } else {
      morphed = false;
      retarget(anchorsFor(key), performance.now());
    }
  }

  function morph(now) {
    if (!running) return;
    morphed = !morphed;
    morphSettledAt = now || performance.now();
    retarget(pickAnchors(), now || performance.now());
  }

  function open(key, ev) {
    if (running) {
      if (key === currentKey) return;
      applyKey(key);
      return;
    }
    if (!INFO[key]) return;
    stageSize();
    var cx = ev && ev.clientX ? ev.clientX : irisW / 2;
    var cy = ev && ev.clientY ? ev.clientY : irisH / 2;
    currentKey = key;
    morphed = false;
    hovered = false;
    mx = -10000;
    my = -10000;
    document.body.style.overflow = "hidden";
    buildPage(key, cx, cy);
  }

  function close() {
    if (!page) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    var live = page;
    live.classList.remove("is-open");
    live.classList.add("is-closing");
    if (REDUCED) live.classList.remove("is-open-calm");
    setTimeout(function () {
      if (live && live.parentNode) live.parentNode.removeChild(live);
      document.body.style.overflow = "";
      page = null;
      canvas = null;
      ctx = null;
      rect = null;
      running = false;
    }, REDUCED ? 340 : 660);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && page) close();
  });

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-modal]") : null;
      if (!t) return;
      var key = t.getAttribute("data-modal");
      if (INFO[key]) {
        e.preventDefault();
        e.stopPropagation();
        open(key, e);
      } else if (currentKey && page) {
        close();
      }
    },
    true
  );

  window.AgriPalParticles = {
    open: open,
    close: close,
    isOpen: function () { return running; },
    INFO: INFO
  };
})();