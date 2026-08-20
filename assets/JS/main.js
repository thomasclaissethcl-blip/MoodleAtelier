(function () {
  "use strict";

  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav-links]");

  function closeNav(returnFocus) {
    if (!toggle || !nav) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Menu";
    if (returnFocus) toggle.focus();
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Fermer" : "Menu";
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeNav(false);
    });
    document.addEventListener("click", function (event) {
      if (nav.classList.contains("is-open") && !event.target.closest(".site-nav")) closeNav(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) closeNav(false);
    });
  }

  var tooltip;
  var activeTrigger;
  var tooltipId = 0;

  function closeTooltip() {
    if (tooltip) tooltip.remove();
    if (activeTrigger) activeTrigger.removeAttribute("aria-describedby");
    tooltip = null;
    activeTrigger = null;
  }

  function openTooltip(trigger) {
    closeTooltip();
    tooltip = document.createElement("div");
    tooltip.className = "tooltip-popover";
    tooltip.id = "tooltip-" + (++tooltipId);
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = trigger.getAttribute("data-tooltip");
    document.body.appendChild(tooltip);

    var rect = trigger.getBoundingClientRect();
    var tooltipRect = tooltip.getBoundingClientRect();
    var left = Math.max(12, Math.min(rect.left, window.innerWidth - tooltipRect.width - 12));
    var top = rect.bottom + 8;
    if (top + tooltipRect.height > window.innerHeight - 12) top = rect.top - tooltipRect.height - 8;
    tooltip.style.left = left + "px";
    tooltip.style.top = Math.max(12, top) + "px";
    activeTrigger = trigger;
    trigger.setAttribute("aria-describedby", tooltip.id);
  }

  document.querySelectorAll("[data-tooltip]").forEach(function (trigger) {
    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      if (activeTrigger === trigger) closeTooltip(); else openTooltip(trigger);
    });
    trigger.addEventListener("mouseenter", function () { openTooltip(trigger); });
    trigger.addEventListener("mouseleave", closeTooltip);
    trigger.addEventListener("focus", function () { openTooltip(trigger); });
    trigger.addEventListener("blur", closeTooltip);
  });

  document.addEventListener("click", closeTooltip);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeTooltip();
      if (nav && nav.classList.contains("is-open")) closeNav(true);
    }
  });
  window.addEventListener("resize", closeTooltip);
  window.addEventListener("scroll", closeTooltip, { passive: true });

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll("[data-toc] a[href^='#']"));
  var tocSections = tocLinks.map(function (link) {
    return document.querySelector(link.getAttribute("href"));
  }).filter(Boolean);

  function activateToc(id) {
    tocLinks.forEach(function (link) {
      var active = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
    });
    var configureLink = document.querySelector(".nav-links a[href='#phase-1']");
    var pilotLink = document.querySelector(".nav-links a[href='#phase-2']");
    if (configureLink && pilotLink && id.indexOf("phase-") === 0) {
      if (id === "phase-1") {
        configureLink.setAttribute("aria-current", "page");
        pilotLink.removeAttribute("aria-current");
      } else {
        pilotLink.setAttribute("aria-current", "page");
        configureLink.removeAttribute("aria-current");
      }
    }
  }

  if (tocSections.length && "IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      if (visible.length) activateToc(visible[0].target.id);
    }, { rootMargin: "-22% 0px -62% 0px", threshold: 0 });
    tocSections.forEach(function (section) { sectionObserver.observe(section); });
    activateToc((location.hash || tocLinks[0].getAttribute("href")).replace("#", ""));
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { return; }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (error) { return; }
  }

  function updateProgress() {
    var indicators = document.querySelectorAll("[data-progress-phase]");
    var doneCount = 0;
    indicators.forEach(function (indicator) {
      var done = storageGet("atelier-moodle-phase-" + indicator.getAttribute("data-progress-phase")) === "done";
      indicator.classList.toggle("is-complete", done);
      if (done) doneCount += 1;
    });
    var label = document.querySelector("[data-progress-label]");
    if (label) label.textContent = doneCount + " phase" + (doneCount === 1 ? "" : "s") + " sur 5 terminée" + (doneCount === 1 ? "" : "s");
  }

  document.querySelectorAll("[data-phase-complete]").forEach(function (button) {
    var phase = button.getAttribute("data-phase-complete");
    var key = "atelier-moodle-phase-" + phase;
    function render(done) {
      button.classList.toggle("is-complete", done);
      button.setAttribute("aria-pressed", String(done));
      button.textContent = done ? "Phase terminée" : "Marquer comme terminée";
    }
    render(storageGet(key) === "done");
    button.addEventListener("click", function () {
      var done = storageGet(key) !== "done";
      if (done) storageSet(key, "done"); else storageRemove(key);
      render(done);
      updateProgress();
    });
  });
  updateProgress();

  document.querySelectorAll("[data-copy-target]").forEach(function (button) {
    button.addEventListener("click", function () {
      var target = document.querySelector(button.getAttribute("data-copy-target"));
      if (!target) return;
      var value = target.innerText.trim();
      var copyPromise;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        copyPromise = navigator.clipboard.writeText(value);
      } else {
        var field = document.createElement("textarea");
        field.value = value;
        field.setAttribute("readonly", "");
        field.className = "visually-hidden";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
        copyPromise = Promise.resolve();
      }
      copyPromise.then(function () {
        var original = button.textContent;
        button.textContent = "Copié";
        setTimeout(function () { button.textContent = original; }, 1800);
      });
    });
  });

  document.querySelectorAll(".figure img").forEach(function (img) {
    img.setAttribute("loading", "lazy");
    var button = document.createElement("button");
    button.type = "button";
    button.className = "figure-zoom";
    button.textContent = "Agrandir la capture";
    img.insertAdjacentElement("afterend", button);
    button.addEventListener("click", function () {
      var dialog = document.createElement("dialog");
      dialog.className = "image-dialog";
      dialog.innerHTML = '<button type="button" class="image-dialog-close">Fermer</button><img alt="">';
      var dialogImg = dialog.querySelector("img");
      dialogImg.src = img.src;
      dialogImg.alt = img.alt;
      document.body.appendChild(dialog);
      dialog.querySelector("button").addEventListener("click", function () { dialog.close(); });
      dialog.addEventListener("close", function () { dialog.remove(); button.focus(); });
      dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
      dialog.showModal();
    });
  });

  var glossarySearch = document.querySelector("[data-glossary-search]");
  var glossaryItems = Array.prototype.slice.call(document.querySelectorAll("[data-glossary-item]"));
  var glossaryCount = document.querySelector("[data-glossary-count]");
  var glossaryEmpty = document.querySelector("[data-glossary-empty]");
  var glossaryClear = document.querySelector("[data-glossary-clear]");

  glossaryItems.forEach(function (item) {
    var term = item.querySelector("dt");
    if (!term || item.id) return;
    item.id = term.textContent.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    term.innerHTML = '<a class="glossary-anchor" href="#' + item.id + '">' + term.textContent + '</a>';
  });

  function filterGlossary() {
    var query = glossarySearch.value.toLocaleLowerCase("fr").trim();
    var visible = 0;
    glossaryItems.forEach(function (item) {
      var match = item.textContent.toLocaleLowerCase("fr").indexOf(query) !== -1;
      item.hidden = !match;
      if (match) visible += 1;
    });
    if (glossaryCount) glossaryCount.textContent = visible + (visible > 1 ? " termes affichés" : " terme affiché");
    if (glossaryEmpty) glossaryEmpty.hidden = visible !== 0;
    if (glossaryClear) glossaryClear.hidden = !query;
  }

  if (glossarySearch && glossaryItems.length) {
    glossarySearch.addEventListener("input", filterGlossary);
    if (glossaryClear) glossaryClear.addEventListener("click", function () {
      glossarySearch.value = "";
      filterGlossary();
      glossarySearch.focus();
    });
  }

  document.querySelectorAll("[data-print]").forEach(function (button) {
    button.addEventListener("click", function () { window.print(); });
  });
})();
