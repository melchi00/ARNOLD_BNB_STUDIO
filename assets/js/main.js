---
# Front matter so Jekyll can inject pricing from _data/pricing.yml.
---

/* =============================================================
   ARNOLD BNB STUDIO — main.js
   Vanilla JS. No dependencies. No network calls.
   ============================================================= */

(function () {
  "use strict";

  /* ── Pricing config, injected from _data/pricing.yml ────────
     Change prices in _data/pricing.yml — never here. */
  var PRICING = {
    currency:            "{{ site.data.pricing.currency }}",
    standardRate:        {{ site.data.pricing.standard_rate }},
    discountedRate:      {{ site.data.pricing.discounted_rate }},
    dayRate:             {{ site.data.pricing.day_rate }},
    dayRateMaxHours:     {{ site.data.pricing.day_rate_max_hours }},
    extraHourRate:       {{ site.data.pricing.extra_hour_rate }},
    weekendSurchargePct: {{ site.data.pricing.weekend_surcharge_pct }},
    cleaningFee:         {{ site.data.pricing.cleaning_fee }},
    serviceFeePct:       {{ site.data.pricing.service_fee_pct }},
    cleaningCost:        {{ site.data.pricing.cleaning_cost }},
    ownerPct:            {{ site.data.pricing.owner_pct }},
    operatorPct:         {{ site.data.pricing.operator_pct }},
    fixedMonthlyCosts:   {{ site.data.pricing.fixed_monthly_costs }},
    openHoursPerDay:     {{ site.data.pricing.open_hours_per_day }},
    weekdaysPerMonth:    {{ site.data.pricing.weekdays_per_month }},
    weekendDaysPerMonth: {{ site.data.pricing.weekend_days_per_month }}
  };

  var ADDONS = [
    {%- for a in site.data.addons %}
    { key: "{{ a.key }}", label: "{{ a.label }}", price: {{ a.price }}, emoji: "{{ a.emoji }}", perUnit: {{ a.per_unit }} }{% unless forloop.last %},{% endunless %}
    {%- endfor %}
  ];

  /* Expose for the owner dashboard, which lives in its own script. */
  window.ABS = { PRICING: PRICING, ADDONS: ADDONS };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Helpers ────────────────────────────────────────────── */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function money(n) {
    return PRICING.currency + " " + Math.round(n).toLocaleString("en-KE");
  }
  window.ABS.money = money;

  /* ── Pricing engine ─────────────────────────────────────────
     Mirrors the tiers in _data/pricing.yml:
       1–2 hrs  → standardRate per hour
       3–5 hrs  → first 2 at standardRate, rest at discountedRate
       6–10 hrs → flat dayRate
       10+ hrs  → dayRate + extraHourRate per extra hour          */

  function priceHours(hours) {
    var lines = [];
    var cost;

    if (hours <= 2) {
      cost = hours * PRICING.standardRate;
      lines.push(["Room · " + hours + " hr at " + money(PRICING.standardRate), cost]);
      return { cost: cost, lines: lines };
    }
    if (hours <= 5) {
      var std = 2 * PRICING.standardRate;
      var rest = hours - 2;
      var disc = rest * PRICING.discountedRate;
      lines.push(["Room · first 2 hrs", std]);
      lines.push(["Room · " + rest + " hr at " + money(PRICING.discountedRate), disc]);
      return { cost: std + disc, lines: lines };
    }
    if (hours <= PRICING.dayRateMaxHours) {
      lines.push(["Day Pass · " + hours + " hrs, flat", PRICING.dayRate]);
      return { cost: PRICING.dayRate, lines: lines };
    }
    var extra = hours - PRICING.dayRateMaxHours;
    var extraCost = extra * PRICING.extraHourRate;
    lines.push(["Day Pass · " + PRICING.dayRateMaxHours + " hrs, flat", PRICING.dayRate]);
    lines.push(["Extended · " + extra + " extra hr", extraCost]);
    return { cost: PRICING.dayRate + extraCost, lines: lines };
  }

  function tierFor(hours) {
    if (hours <= 2)  return { emoji: "🕐", name: "Short Stay" };
    if (hours <= 5)  return { emoji: "✨", name: "Sweet Spot" };
    if (hours <= PRICING.dayRateMaxHours) return { emoji: "☀️", name: "Day Pass" };
    return { emoji: "🌙", name: "Extended" };
  }

  /* state = { hours, weekend, extraGuests, addons: [keys] } */
  function quote(state) {
    var room = priceHours(state.hours);
    var lines = room.lines.slice();

    var surcharge = 0;
    if (state.weekend) {
      surcharge = Math.round(room.cost * PRICING.weekendSurchargePct / 100);
      lines.push(["Weekend / holiday +" + PRICING.weekendSurchargePct + "%", surcharge]);
    }

    var addonTotal = 0;
    var addonLabels = [];

    if (state.extraGuests > 0) {
      var g = ADDONS.filter(function (a) { return a.key === "extra_guest"; })[0];
      if (g) {
        var gc = state.extraGuests * g.price;
        lines.push([g.label + " × " + state.extraGuests, gc]);
        addonTotal += gc;
        addonLabels.push(g.label + " ×" + state.extraGuests);
      }
    }

    (state.addons || []).forEach(function (key) {
      if (key === "extra_guest") return;
      var a = ADDONS.filter(function (x) { return x.key === key; })[0];
      if (!a) return;
      lines.push([a.label, a.price]);
      addonTotal += a.price;
      addonLabels.push(a.label);
    });

    var subtotal = room.cost + surcharge + addonTotal;
    var serviceFee = Math.round(subtotal * PRICING.serviceFeePct / 100);
    var cleaningFee = PRICING.cleaningFee;
    var total = subtotal + serviceFee + cleaningFee;

    return {
      roomCost: room.cost,
      surcharge: surcharge,
      addonTotal: addonTotal,
      addonLabels: addonLabels,
      subtotal: subtotal,
      serviceFee: serviceFee,
      cleaningFee: cleaningFee,
      total: total,
      perHour: total / state.hours,
      lines: lines
    };
  }

  window.ABS.quote = quote;
  window.ABS.priceHours = priceHours;
  window.ABS.tierFor = tierFor;

  /* ── Theme toggle ───────────────────────────────────────── */

  function initTheme() {
    var btn = $("#themeToggle");
    if (!btn) return;

    function sync() {
      var isLight = document.documentElement.getAttribute("data-theme") === "light";
      btn.setAttribute("aria-pressed", String(isLight));
      btn.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    }

    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("abs_theme", next); } catch (e) {}
      sync();
    });

    sync();
  }

  /* ── Sticky header ──────────────────────────────────────── */

  function initHeader() {
    var header = $("#siteHeader");
    if (!header) return;
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        header.classList.toggle("is-stuck", window.scrollY > 24);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile nav ─────────────────────────────────────────── */

  function initMobileNav() {
    var toggle = $("#navToggle");
    var panel = $("#mobileNav");
    if (!toggle || !panel) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      panel.hidden = !open;
      document.body.classList.toggle("nav-open", open);
      if (open) {
        var first = panel.querySelector("a");
        if (first) first.focus();
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    panel.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ── Scroll reveals ─────────────────────────────────────── */

  function initReveals() {
    var items = $$("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    items.forEach(function (el, i) {
      // Stagger only within a group of siblings, not across the page.
      var sibs = el.parentElement ? $$("[data-reveal]", el.parentElement) : [];
      var idx = sibs.indexOf(el);
      el.style.setProperty("--delay", (idx > 0 ? idx * 80 : 0) + "ms");
      io.observe(el);
    });
  }

  /* ── FAQ accordion ──────────────────────────────────────── */

  function initFaq() {
    $$(".faq__q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var expanded = btn.getAttribute("aria-expanded") === "true";
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        btn.setAttribute("aria-expanded", String(!expanded));
        if (!panel) return;
        panel.style.maxHeight = expanded ? "0px" : panel.scrollHeight + "px";
      });
    });
  }

  /* ── Confetti (sweet spot) ──────────────────────────────── */

  function burstConfetti(host) {
    if (reduceMotion || !host) return;
    var old = host.querySelector(".confetti");
    if (old) old.remove();

    var wrap = document.createElement("div");
    wrap.className = "confetti";
    wrap.setAttribute("aria-hidden", "true");

    for (var i = 0; i < 16; i++) {
      var bit = document.createElement("i");
      var angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
      var dist = 60 + Math.random() * 90;
      bit.style.setProperty("--n", i);
      bit.style.setProperty("--x", Math.cos(angle) * dist + "px");
      bit.style.setProperty("--y", (Math.sin(angle) * dist - 30) + "px");
      bit.style.setProperty("--r", Math.random() * 540 - 270 + "deg");
      wrap.appendChild(bit);
    }
    host.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 1400);
  }

  /* ── The playful calculator (pricing.html) ──────────────── */

  function initCalculator() {
    var calc = $("#calc");
    if (!calc) return;

    var slider     = $("#calcHours");
    var hoursOut   = $("#calcHoursOut");
    var tierOut    = $("#calcTier");
    var weekendIn  = $("#calcWeekend");
    var weekendPill = $("#calcWeekendPill");
    var guestsIn   = $("#calcGuests");
    var linesOut   = $("#calcLines");
    var totalOut   = $("#calcTotal");
    var effOut     = $("#calcEffective");
    var ctaOut     = $("#calcCta");
    var ticks      = $$(".ruler__tick");

    var lastHours = null;
    var lastTotal = null;

    /* Add-on chips, with selection remembered for this tab only. */
    var selected = [];
    try {
      var stored = sessionStorage.getItem("abs_addons");
      if (stored) selected = JSON.parse(stored);
    } catch (e) { selected = []; }

    var chips = $$(".chip[data-addon]", calc);
    chips.forEach(function (chip) {
      var key = chip.getAttribute("data-addon");
      if (selected.indexOf(key) !== -1) chip.setAttribute("aria-pressed", "true");

      chip.addEventListener("click", function () {
        var on = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", String(!on));
        if (on) {
          selected = selected.filter(function (k) { return k !== key; });
        } else {
          selected.push(key);
          if (!reduceMotion) {
            chip.classList.remove("is-jiggling");
            void chip.offsetWidth;
            chip.classList.add("is-jiggling");
          }
        }
        try { sessionStorage.setItem("abs_addons", JSON.stringify(selected)); } catch (e) {}
        render();
      });
    });

    function state() {
      return {
        hours: parseInt(slider.value, 10),
        weekend: weekendIn.checked,
        extraGuests: Math.max(0, parseInt(guestsIn.value, 10) || 0),
        addons: selected
      };
    }

    function render() {
      var s = state();
      var q = quote(s);
      var tier = tierFor(s.hours);

      /* Hours + ruler fill */
      hoursOut.firstChild.nodeValue = String(s.hours);
      var pct = ((s.hours - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty("--pct", pct + "%");
      ticks.forEach(function (t) {
        t.classList.toggle("is-active", parseInt(t.getAttribute("data-h"), 10) === s.hours);
      });

      /* Tier badge */
      if (tierOut.getAttribute("data-tier") !== tier.name) {
        tierOut.setAttribute("data-tier", tier.name);
        tierOut.textContent = tier.emoji + " " + tier.name;
        if (!reduceMotion) {
          tierOut.classList.remove("is-morphing");
          void tierOut.offsetWidth;
          tierOut.classList.add("is-morphing");
        }
      }

      /* Weekend ambience */
      calc.classList.toggle("is-weekend", s.weekend);
      weekendPill.classList.toggle("is-on", s.weekend);

      /* Line items */
      linesOut.innerHTML = q.lines.map(function (l) {
        return '<div class="calc__line"><span>' + l[0] +
               '</span><span class="calc__amount">' + money(l[1]) + '</span></div>';
      }).join("") +
        '<div class="calc__line"><span>Service fee (' + PRICING.serviceFeePct +
        '%)</span><span class="calc__amount">' + money(q.serviceFee) + '</span></div>' +
        '<div class="calc__line"><span>Cleaning</span><span class="calc__amount">' +
        money(q.cleaningFee) + '</span></div>';

      /* Big total, with a pop when it changes */
      totalOut.textContent = money(q.total);
      if (lastTotal !== null && lastTotal !== q.total && !reduceMotion) {
        totalOut.classList.remove("is-popping");
        void totalOut.offsetWidth;
        totalOut.classList.add("is-popping");
      }
      lastTotal = q.total;

      effOut.textContent = "≈ " + money(q.perHour) + " an hour, all in";

      /* Confetti when they land exactly on the sweet spot */
      if (s.hours === 4 && lastHours !== 4) burstConfetti($(".calc__total", calc));
      lastHours = s.hours;

      /* Carry the current selection to the booking page */
      var params = new URLSearchParams();
      params.set("hours", s.hours);
      if (s.weekend) params.set("weekend", "1");
      if (s.extraGuests) params.set("guests", s.extraGuests);
      if (selected.length) params.set("addons", selected.join(","));
      ctaOut.setAttribute("href", ctaOut.getAttribute("data-base") + "?" + params.toString());
    }

    slider.addEventListener("input", render);
    weekendIn.addEventListener("change", render);
    guestsIn.addEventListener("input", render);
    render();
  }

  /* ── WhatsApp message builder ───────────────────────────── */

  function buildBookingMessage(formState) {
    var q = quote({
      hours: formState.hours,
      weekend: formState.weekend,
      extraGuests: formState.extraGuests,
      addons: formState.addons
    });

    var addonText = q.addonLabels.length ? q.addonLabels.join(", ") : "None";

    var msg =
      "*New Booking Request — {{ site.business.name }}*\n\n" +
      "👤 Name: " + (formState.name || "—") + "\n" +
      "📅 Date: " + (formState.date || "—") + "\n" +
      "🕐 Start time: " + (formState.time || "—") + "\n" +
      "⏱ Duration: " + formState.hours + " hr(s)\n" +
      "🌙 Weekend/holiday: " + (formState.weekend ? "Yes" : "No") + "\n" +
      "👥 Extra guests: " + formState.extraGuests + "\n" +
      "➕ Add-ons: " + addonText + "\n\n" +
      "💰 Estimated total: " + money(q.total) + "\n\n" +
      "📝 Notes: " + (formState.notes || "—");

    return msg;
  }

  window.ABS.buildBookingMessage = buildBookingMessage;

  /* ── Booking form (book.html) ───────────────────────────── */

  function initBookingForm() {
    var form = $("#bookForm");
    if (!form) return;

    var hoursIn   = $("#bkHours");
    var hoursOut  = $("#bkHoursOut");
    var dateIn    = $("#bkDate");
    var timeIn    = $("#bkTime");
    var nameIn    = $("#bkName");
    var weekendIn = $("#bkWeekend");
    var guestsIn  = $("#bkGuests");
    var notesIn   = $("#bkNotes");
    var linesOut  = $("#bkLines");
    var totalOut  = $("#bkTotal");
    var tierOut   = $("#bkTier");
    var waButtons = $$("[data-wa]");

    /* Pre-fill from ?hours=4&weekend=1&guests=1&addons=snacks,romantic */
    var params = new URLSearchParams(window.location.search);
    if (params.has("hours")) {
      var h = parseInt(params.get("hours"), 10);
      if (h >= 1 && h <= 12) hoursIn.value = h;
    }
    if (params.get("weekend") === "1") weekendIn.checked = true;
    if (params.has("guests")) guestsIn.value = parseInt(params.get("guests"), 10) || 0;
    if (params.has("addons")) {
      params.get("addons").split(",").forEach(function (key) {
        var box = document.getElementById("bk_" + key);
        if (box) box.checked = true;
      });
    }

    /* Default the date to today so the field is never empty. */
    if (dateIn && !dateIn.value) {
      var t = new Date();
      dateIn.value = t.getFullYear() + "-" +
        String(t.getMonth() + 1).padStart(2, "0") + "-" +
        String(t.getDate()).padStart(2, "0");
    }

    function checkedAddons() {
      return $$("[data-addon-box]", form)
        .filter(function (b) { return b.checked; })
        .map(function (b) { return b.getAttribute("data-addon-box"); });
    }

    function formState() {
      return {
        name: nameIn.value.trim(),
        date: dateIn.value,
        time: timeIn.value,
        hours: parseInt(hoursIn.value, 10),
        weekend: weekendIn.checked,
        extraGuests: Math.max(0, parseInt(guestsIn.value, 10) || 0),
        addons: checkedAddons(),
        notes: notesIn.value.trim()
      };
    }

    function render() {
      var s = formState();
      var q = quote(s);
      var tier = tierFor(s.hours);

      hoursOut.textContent = s.hours + (s.hours === 1 ? " hour" : " hours");
      tierOut.textContent = tier.emoji + " " + tier.name;

      linesOut.innerHTML = q.lines.map(function (l) {
        return '<div class="calc__line"><span>' + l[0] +
               '</span><span class="calc__amount">' + money(l[1]) + '</span></div>';
      }).join("") +
        '<div class="calc__line"><span>Service fee</span><span class="calc__amount">' +
        money(q.serviceFee) + '</span></div>' +
        '<div class="calc__line"><span>Cleaning</span><span class="calc__amount">' +
        money(q.cleaningFee) + '</span></div>';

      totalOut.textContent = money(q.total);
    }

    form.addEventListener("input", render);
    form.addEventListener("change", render);

    /* Each button opens ONE chat — never both at once. */
    waButtons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var s = formState();

        if (!s.name) {
          nameIn.focus();
          nameIn.setAttribute("aria-invalid", "true");
          return;
        }
        nameIn.removeAttribute("aria-invalid");

        var number = btn.getAttribute("data-wa");
        var text = encodeURIComponent(buildBookingMessage(s));
        window.open("https://wa.me/" + number + "?text=" + text, "_blank", "noopener");
      });
    });

    render();
  }

  /* ── Boot ───────────────────────────────────────────────── */

  function boot() {
    initTheme();
    initHeader();
    initMobileNav();
    initReveals();
    initFaq();
    initCalculator();
    initBookingForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
