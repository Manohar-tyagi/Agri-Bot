/* Shared UI chrome for every page: floating navbar, modal system, reveal-on-scroll.
   The assembly stage and live telemetry live in script.js (homepage) / inline scripts (subpages). */

(function () {
  "use strict";

  /* Floating-navbar scrim — soft paper gradient so the pill never reads as
     clipping the panel it passes over. Injected once per page. */
  var scrim = document.createElement("div");
  scrim.className = "nav-scrim";
  scrim.setAttribute("aria-hidden", "true");
  document.body.insertBefore(scrim, document.body.firstChild);

  /* Modal content — single source of truth for all pages. */
  var MODALS = {
    home: {
      title: "Agri-Pal",
      body: [
        "An autonomous field robot for the row crop — it follows a guide line between crops, senses obstacles ahead, and reaches out to pluck ripe produce into its payload.",
        "Each part is drawn, wired and coded for a college subject project, with a Java Spring Boot backend serving live telemetry.",
        "Open the components list in the menu to walk through each part."
      ],
      cards: null,
      jump: { text: "Jump to section", href: "#top" }
    },
    components: {
      title: "Under the Hood",
      body: [],
      cards: [
        {
          name: "Chassis & Drive System",
          short: "Cut acrylic frame, 4 driven wheels, differential drive with PID for straight, level rows.",
          part: "Frame + drive train",
          spec: [
            "3mm laser-cut acrylic chassis, 4 independently driven DC motors",
            "Bi-directional motor driver with differential drive",
            "PID speed control keeps the bot centred and straight on the line"
          ],
          how: "Motor driver maps PWM to the four wheels; the line-following loop keeps left and right sides balanced so the chassis tracks the row without veering."
        },
        {
          name: "Line Following Module",
          short: "IR sensor array + PID loop keeps the bot perfectly centred on the guide line.",
          part: "IR array of sensors",
          spec: [
            "Array of IR line sensors under the front bumper",
            "Weighted analog readout gives a continuous steering error",
            "PID loop converts error into per-side motor corrections ~100×/s"
          ],
          how: "Sensors read light reflected off the guide line; the weighted error feeds the PID, which nudges the outer motors to bend the path back to centre."
        },
        {
          name: "Obstacle Detection & Avoidance",
          short: "Ultrasonic ranging scans ahead and halts, reroutes or raises an alert.",
          part: "Ultrasonic rangefinder",
          spec: [
            "Ultrasonic rangefinder scanning forward",
            "Hardware/software safety threshold in front of the wheels",
            "Halt, reroute or raise an alert when something is too close"
          ],
          how: "The rangefinder pings a few times a second. If the return is closer than the safety margin the controller brakes, picks a reroute, or reports the obstacle."
        },
        {
          name: "Plucking / Harvesting Arm",
          short: "Servo-driven gripper arm that reaches out, grips and plucks into the payload.",
          part: "Servo gripper + arm",
          spec: [
            "Servo-driven two-finger gripper",
            "Shoulder reach + wrist rotate for approach motion",
            "Grip sensing closes on detection of ripe produce"
          ],
          how: "On a harvest trigger the arm extends, the gripper closes around the target, and a quick wrist twist snaps the stem before releasing into the payload tray."
        },
        {
          name: "Power System",
          short: "Rechargeable battery pack, BMS balance, under-voltage cutoff, smooth rail.",
          part: "Li-ion pack + BMS",
          spec: [
            "Rechargeable Li-ion pack with balancing BMS",
            "Under-voltage and over-current protection",
            "Clean 5V/3.3V rails for logic and sensors"
          ],
          how: "The pack feeds the motor driver and a regulated rail; telemetry reports charge so the operator can swap before the bot calls it a day."
        },
        {
          name: "Control Unit",
          short: "On-board brains: runs line PID, sensor loop and telemetry over serial/Wi-Fi.",
          part: "Microcontroller",
          spec: [
            "Run line-following PID and obstacle loop in real time",
            "Coordinate the harvest arm and payload",
            "Stream status to the dashboard via the backend"
          ],
          how: "The control loop ticks through sensors, steering and the arm at high frequency, publishing a small status packet the Spring Boot server forwards on."
        },
        {
          name: "Connectivity & Monitoring",
          short: "Status packets, local API, dashboard — watch battery, mode and alerts live.",
          part: "Backend + dashboard",
          spec: [
            "Status packets published from the controller",
            "Java Spring Boot API on the local network",
            "Live dashboard on this site (battery, mode, obstacle, harvests)"
          ],
          how: "The controller posts telemetry; the Spring Boot service serves REST endpoints the dashboard polls every few seconds and renders."
        },
        {
          name: "Sensor Suite",
          short: "Camera vision for fruit ID, plus the sensors that keep the bot on the row.",
          part: "Camera + IR + ultrasonic",
          spec: [
            "IR array for line following",
            "Ultrasonic for obstacle distance",
            "Camera vision (optional) for ripeness and fruit identification"
          ],
          how: "Each sensor feeds a dedicated pipeline; combined they turn a strip of tape and a row of plants into a drivable, harvestable line."
        }
      ],
      jump: null
    },
    specs: {
      title: "Full Specs",
      body: [],
      cards: null,
      rows: [
        ["Chassis", "3mm laser-cut acrylic, differential drive, 4 driven wheels"],
        ["Drive", "4 × DC gear motors, bi-directional motor driver"],
        ["Steering", "Differential PID speed control"],
        ["Line following", "IR sensor array with weighted error + PID"],
        ["Obstacle detection", "Ultrasonic rangefinder, adjustable threshold"],
        ["Harvesting", "Servo gripper, 2 DOF arm, grip sensing"],
        ["Vision", "Camera (optional) for ripeness / fruit ID"],
        ["Control", "On-board microcontroller, 100Hz control loop"],
        ["Power", "Rechargeable Li-ion pack + BMS, 5V/3.3V rails"],
        ["Connectivity", "Java Spring Boot API, live dashboard telemetry"],
        ["Payload", "Integrated tray with quick-release"],
        ["Status reporting", "Battery %, mode, last obstacle, items plucked"],
        ["Build", "College subject project — hardware, software & docs by the team"]
      ],
      jump: { text: "Jump to live status", href: "#live" }
    },
    status: {
      title: "Live Status",
      body: [
        "The dashboard below pulls telemetry straight from the on-board controller over the local Spring Boot API — battery, mode, obstacles and harvest count.",
        "If the backend isn't running, the dashboard shows a graceful offline state instead of failing silently."
      ],
      cards: null,
      liveLink: { text: "Open full dashboard", href: "live-status.html" },
      jump: { text: "Jump to live section", href: "#live" }
    },
    contact: {
      title: "Get in touch",
      body: [
        "Questions about the build, the code, or the field tests? Write to the team — we answer within a day.",
        "<strong>hello@agripal.xyz</strong>"
      ],
      cards: null
    }
  };

  /* ---------- Navbar ---------- */
  var burger = document.getElementById("nav-burger");
  var navLinks = document.getElementById("nav-links");

  function closeNav() {
    if (navLinks) navLinks.classList.remove("open");
    if (burger) { burger.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
  }
  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });
  }

  /* Highlight the current page in the nav. */
  var current = (location.pathname.split("/").pop() || "index.html").split("#")[0];
  var dataPage = document.body && document.body.getAttribute("data-page");
  if (navLinks) {
    navLinks.querySelectorAll("a").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var hrefPage = href.split("#")[0] || "index.html";
      if (hrefPage === current) { a.classList.add("active"); a.setAttribute("aria-current", "page"); }
      else if (current === "index.html" && hrefPage === "" && dataPage === "home") { a.classList.add("active"); a.setAttribute("aria-current", "page"); }
    });
  }

  /* ---------- Modal system ---------- */
  var modalRoot = document.getElementById("modal-root");

  function svgArrow() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"></path></svg>';
  }
  function svgUpRight() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"></path></svg>';
  }

  function rowsTable(rows) {
    var out = '<div class="modal-table-wrap"><table class="specs-table"><thead><tr><th>System</th><th>Specification</th></tr></thead><tbody>';
    rows.forEach(function (r) { out += "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>"; });
    return out + "</tbody></table></div>";
  }

  function cardList(cards) {
    var out = '<div class="modal-cards">';
    cards.forEach(function (c, i) {
      out +=
        '<button class="modal-card" data-open-component="' + i + '">' +
          "<div><h4>" + c.name + "</h4><p>" + c.short + "</p></div>" +
          '<span class="go">' + svgArrow() + "</span>" +
        "</button>";
    });
    return out + "</div>";
  }

  function cardDetail(card, index) {
    var specHtml = "<ul class='modal-chip-list'>" + card.spec.map(function (s) { return "<li class='modal-chip'>" + s + "</li>"; }).join("") + "</ul>";
    var visual = card.img
      ? '<figure class="modal-visual"><img src="' + card.img + '" alt="' + card.name + ' diagram"/></figure>'
      : '<div class="modal-visual placeholder" role="img" aria-label="Diagram placeholder for ' + card.name + '">' +
          '<span class="vs-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg></span>' +
          "<p>Drop a photo, exploded diagram or labelled illustration for \u201c" + card.name + "\u201d here. Set <code>img</code> on this card in ui.js to use it.</p>" +
        "</div>";
    var out =
      '<span class="modal-part">Part ' + (index + 1) + " / 8</span>" +
      "<h3 class='detail-title'>" + card.name + "</h3>" +
      visual +
      '<div class="modal-detail">' +
        "<div><h4>Specification</h4>" + specHtml + "</div>" +
        "<div><h4>How it works</h4><p>" + card.how + "</p></div>" +
      "</div>" +
      '<div class="modal-footer" style="padding:18px 0 0;border-top:0;">' +
        '<button class="btn btn-ghost" data-open-modal="components">All components</button>' +
      "</div>";
    return out;
  }

  function buildModal(key, index) {
    var data = MODALS[key];
    if (!data) return "";
    var body = "";
    if (data.body) data.body.forEach(function (p) { body += "<p>" + p + "</p>"; });
    if (data.rows) body += rowsTable(data.rows);
    if (data.cards) body += (index != null ? cardDetail(data.cards[index], index) : cardList(data.cards));

    var footer = "";
    if (data.jump) {
      footer += '<a class="modal-jump" href="' + data.jump.href + '">' + data.jump.text + " " + svgUpRight() + "</a>";
    }
    if (data.liveLink) {
      footer += '<a class="btn btn-accent btn-arrow" href="' + data.liveLink.href + '">' + data.liveLink.text + " " + svgArrow() + "</a>";
    }
    if (!footer) footer = '<button class="btn btn-ghost" data-close-modal>Close</button>';

    return (
      '<div class="modal" role="dialog" aria-modal="true" aria-label="' + data.title + '">' +
        '<div class="modal-backdrop" data-close-modal></div>' +
        '<div class="modal-panel"><div class="modal-shell">' +
          '<div class="modal-head"><span class="modal-title">' + data.title + '</span>' +
          '<button class="modal-close" data-close-modal aria-label="Close dialog">' + svgArrow() + "</button></div>" +
          '<div class="modal-scroll"><div class="modal-body">' + body + "</div></div>" +
          '<div class="modal-footer">' + footer + "</div>" +
        "</div></div>" +
      "</div>"
    );
  }

  var active = null;

  function openModal(key, index, focusOnClose) {
    closeModal();
    if (!modalRoot || !MODALS[key]) return;
    var node = document.createElement("div");
    node.innerHTML = buildModal(key, index);
    var modal = node.firstElementChild;
    modalRoot.appendChild(modal);
    modal.classList.add("open");
    requestAnimationFrame(function () {
      var closeBtn = modal.querySelector(".modal-close");
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    });
    active = { el: modal, key: key, index: index, focusOnClose: focusOnClose };
    document.body.style.overflow = "hidden";

    /* inline interactions inside the modal */
    modal.addEventListener("click", function (e) {
      var o = e.target.closest("[data-open-component]");
      if (o) { openModal("components", Number(o.getAttribute("data-open-component")), focusOnClose); return; }
      var o2 = e.target.closest("[data-open-modal]");
      if (o2) { openModal(o2.getAttribute("data-open-modal"), null, focusOnClose); return; }
      if (e.target.closest("[data-close-modal]")) closeModal();
    });
  }

  function closeModal() {
    if (active) { active.el.remove(); active = null; document.body.style.overflow = ""; }
  }

  /* Nav links + any [data-modal] trigger */
  document.addEventListener("click", function (e) {
    if (e.target.closest(".modal, #modal-root")) return;
    var trig = e.target.closest("[data-modal]");
    if (trig) {
      e.preventDefault();
      openModal(trig.getAttribute("data-modal"), null, trig);
      closeNav();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Custom cursor trail — tapered ink stroke (fine pointers only) ---------- */
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (finePointer && !reduceMotion) {
    (function () {
      var canvas = document.createElement("canvas");
      canvas.className = "cursor-trail";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
      var ctx = canvas.getContext("2d");
      var dpr = window.devicePixelRatio || 1;
      function resize() {
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
      }
      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("orientationchange", resize);

      /* The last few positions become a smooth, tapered pen stroke.
         Points age out within ~420ms of the cursor moving away, so the
         tail naturally lifts. */
      var points = [];
      var TTL = 420;
      var MAX = 40;
      var SEGS = 9;
      var running = false;

      window.addEventListener("pointermove", function (e) {
        points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        if (points.length > MAX) points.splice(0, points.length - MAX);
        if (!running) { running = true; requestAnimationFrame(tick); }
      }, { passive: true });

      /* Catmull-Rom-style smoothing: quadratic curves through the
         midpoints of consecutive tracked points. */
      function smoothSamples(P) {
        var pts = [{ x: P[0].x, y: P[0].y }];
        var cx = P[0].x, cy = P[0].y;
        for (var i = 1; i < P.length - 1; i++) {
          var mx = (P[i].x + P[i + 1].x) / 2;
          var my = (P[i].y + P[i + 1].y) / 2;
          for (var k = 1; k <= SEGS; k++) {
            var u = k / SEGS, v = 1 - u;
            pts.push({
              x: v * v * cx + 2 * v * u * P[i].x + u * u * mx,
              y: v * v * cy + 2 * v * u * P[i].y + u * u * my
            });
          }
          cx = mx; cy = my;
        }
        pts.push({ x: P[P.length - 1].x, y: P[P.length - 1].y });
        return pts;
      }

      function tick(now) {
        while (points.length && now - points[0].t > TTL) points.shift();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (points.length > 1) {
          /* cumulative arc-length so width/alpha taper by position along
             the stroke. cum[0] is the OLDEST point (stroke start, i.e.
             the tail), so flip progress so head = newest = cursor. */
          var S = smoothSamples(points);
          var cum = [0];
          var total = 0;
          for (var i = 1; i < S.length; i++) {
            total += Math.hypot(S[i].x - S[i - 1].x, S[i].y - S[i - 1].y);
            cum.push(total);
          }
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          for (var i = 0; i < S.length - 1; i++) {
            /* 0 = head (cursor, newest), 1 = tail (oldest) */
            var t = total > 0 ? 1 - cum[i] / total : 0;
            var fade = 1 - t;
            var width = 3.6 * Math.pow(fade, 1.25) + 0.4;
            var alpha = 0.85 * Math.pow(fade, 0.85);
            if (alpha <= 0.02) continue;
            /* soft outer glow + solid core for a wet-ink look */
            ctx.strokeStyle = "rgba(61, 220, 132, " + (alpha * 0.3).toFixed(3) + ")";
            ctx.lineWidth = width * 2.6;
            ctx.beginPath(); ctx.moveTo(S[i].x, S[i].y); ctx.lineTo(S[i + 1].x, S[i + 1].y); ctx.stroke();
            ctx.strokeStyle = "rgba(61, 220, 132, " + alpha.toFixed(3) + ")";
            ctx.lineWidth = width;
            ctx.beginPath(); ctx.moveTo(S[i].x, S[i].y); ctx.lineTo(S[i + 1].x, S[i + 1].y); ctx.stroke();
          }
        }
        if (points.length) { requestAnimationFrame(tick); }
        else { running = false; }
      }
    })();
  }

  /* Jump links inside modals should close the modal before navigating. */
  document.addEventListener("click", function (e) {
    var j = e.target.closest(".modal-jump");
    if (j && active) { closeModal(); }
  });

  window.AgriPalUI = { MODALS: MODALS, openModal: openModal, closeModal: closeModal };
})();