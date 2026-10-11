(function () {
  "use strict";
  var API_BASE = (document.querySelector('meta[name="api-base"]') || {}).content || "/skillcred-api";
  var $ = function (id) { return document.getElementById(id); };
  var credential = null;
  var issuerName = "SkillCred Demo Issuer";
  var busy = false;
  var verified = false;
  var revoked = false;
  var eventTotal = 0;
  var codeSamples = {
    curl: "curl -sS -X POST \\\n  https://osgard.world/skillcred-api/demo/issue \\\n  -H 'Accept: application/json' \\\n  -H 'Content-Type: application/json' \\\n  -d '{}'",
    python: "import requests\n\nbase = \"https://osgard.world/skillcred-api\"\nresponse = requests.post(\n    base + \"/demo/issue\",\n    json={},\n    timeout=15,\n)\nresponse.raise_for_status()\ncredential = response.json()\nprint(credential[\"id\"])",
    node: "const base = \"https://osgard.world/skillcred-api\";\nconst response = await fetch(base + \"/demo/issue\", {\n  method: \"POST\",\n  headers: { \"Accept\": \"application/json\", \"Content-Type\": \"application/json\" },\n  body: \"{}\",\n});\nif (!response.ok) throw new Error(\"HTTP \" + response.status);\nconst credential = await response.json();\nconsole.log(credential.id);"
  };

  document.documentElement.classList.add("js-ready");
  $("currentYear").textContent = String(new Date().getFullYear());

  function safeText(value, fallback) {
    if (typeof value === "string" && value.trim()) return value.trim();
    return fallback || "—";
  }

  function shortDate(value) {
    if (!value || typeof value !== "string") return "—";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return new Intl.DateTimeFormat("ru-RU", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
  }

  function achievementFrom(item) {
    var subject = item && item.credentialSubject;
    var achievement = subject && subject.achievement;
    if (typeof achievement === "string") return achievement;
    return safeText(achievement && (achievement.name || achievement.title), "Практическая безопасность");
  }

  function descriptionFrom(item) {
    var subject = item && item.credentialSubject;
    var achievement = subject && subject.achievement;
    return safeText(achievement && (achievement.description || achievement.summary), "Цифровое подтверждение практического навыка.");
  }

  function issuerFrom(item) {
    var issuer = item && item.issuer;
    if (typeof issuer === "string") return issuer;
    return safeText(issuer && (issuer.name || issuer.id), issuerName);
  }

  function proofFrom(item) {
    var proof = item && item.proof;
    if (Array.isArray(proof)) proof = proof[0];
    if (!proof || typeof proof !== "object") return "";
    return safeText(proof.proofValue || proof.signatureValue || proof.jws || proof.proof, "");
  }

  async function fingerprint(value) {
    if (!value) return "Не найдено поле подписи";
    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        var digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
        return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, "0"); }).join("").slice(0, 20);
      }
    } catch (_) {}
    var hash = 2166136261;
    for (var i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return "fnv-" + (hash >>> 0).toString(16).padStart(8, "0");
  }

  function timeNow() {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
  }

  function addEvent(name, path, code, detail, ok) {
    eventTotal += 1;
    var list = $("eventLog");
    var empty = list.querySelector(".event-empty");
    if (empty) empty.remove();
    var item = document.createElement("div");
    item.className = "event-item";
    var time = document.createElement("span");
    time.className = "event-time";
    time.textContent = timeNow();
    var details = document.createElement("span");
    details.className = "event-detail";
    var title = document.createElement("strong");
    title.textContent = name;
    var sub = document.createElement("small");
    sub.textContent = path + (detail ? " · " + detail : "");
    details.append(title, sub);
    var status = document.createElement("span");
    status.className = "event-code " + (ok === true ? "is-ok" : ok === false ? "is-bad" : "");
    status.textContent = code === null ? "HTTP —" : "HTTP " + code;
    item.append(time, details, status);
    list.prepend(item);
    $("eventCount").textContent = eventTotal + (eventTotal === 1 ? " событие" : eventTotal < 5 ? " события" : " событий");
  }

  async function request(path, method, body) {
    var options = { method: method || "GET", headers: { "Accept": "application/json" }, cache: "no-store", credentials: "same-origin" };
    if (body !== undefined && body !== null) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    var started = performance.now();
    try {
      var response = await fetch(API_BASE + path, options);
      var data = await response.json().catch(function () { return {}; });
      var duration = Math.round(performance.now() - started);
      var info = data && data.detail ? String(data.detail) : (data && data.service ? String(data.service) : "");
      var label = method === "GET" ? "Запрос состояния" : path.indexOf("/issue") >= 0 ? "Выпуск удостоверения" : path.indexOf("/verify") >= 0 ? "Проверка удостоверения" : path.indexOf("/revoke") >= 0 ? "Отзыв удостоверения" : "Ответ API";
      addEvent(label, path, response.status, duration + " мс" + (info ? " · " + info : ""), response.ok);
      return { ok: response.ok, status: response.status, data: data, duration: duration };
    } catch (_) {
      addEvent("Сетевая ошибка", path, null, "API недоступен", false);
      throw new Error("Не удалось связаться с API через прокси OSGARD. Проверьте соединение и повторите запрос.");
    }
  }

  function setResult(message, mode) {
    var box = $("demoResult").parentElement;
    box.classList.toggle("is-ok", mode === "ok");
    box.classList.toggle("is-bad", mode === "bad");
    $("demoResult").textContent = message;
  }

  function setBusy(value, label) {
    busy = value;
    ["issueBtn", "verifyBtn", "revokeBtn"].forEach(function (id) {
      var button = $(id);
      button.disabled = value || (id === "verifyBtn" && !credential) || (id === "revokeBtn" && (!credential || !verified || revoked));
    });
    if (value) {
      $("demoLive").classList.add("is-online");
      $("demoLive").innerHTML = '<span class="live-dot"></span> ' + (label || "ЗАПРОС ВЫПОЛНЯЕТСЯ");
    } else if (credential) {
      $("demoLive").classList.add("is-online");
      $("demoLive").innerHTML = '<span class="live-dot"></span> ' + (revoked ? "СТАТУС: REVOKED" : verified ? "СТАТУС: ACTIVE" : "ДОКУМЕНТ ВЫДАН");
    } else {
      $("demoLive").classList.remove("is-online");
      $("demoLive").innerHTML = '<span class="live-dot"></span> ОЖИДАЕТ ЗАПУСКА';
    }
  }

  function setStepState(step) {
    ["issueBtn", "verifyBtn", "revokeBtn"].forEach(function (id, index) {
      var button = $(id);
      button.classList.toggle("is-current", index + 1 === step);
      button.classList.toggle("is-complete", index + 1 < step || (index === 0 && !!credential) || (index === 1 && verified) || (index === 2 && revoked));
    });
  }

  function setBadgeStatus(state) {
    var labels = { idle: "ОЖИДАНИЕ", active: "ACTIVE", revoked: "REVOKED", pending: "ОЖИДАЕТ ПРОВЕРКИ" };
    var heroLabels = { idle: "ОЖИДАЕТ ВЫПУСКА", active: "ПОДПИСЬ ВАЛИДНА", revoked: "УДОСТОВЕРЕНИЕ ОТОЗВАНО", pending: "ОЖИДАЕТ ПРОВЕРКИ" };
    var css = state === "active" ? "status-active" : state === "revoked" ? "status-revoked" : "status-idle";
    ["badgeStatus", "heroStatus"].forEach(function (id) {
      var el = $(id);
      el.className = (id === "badgeStatus" ? "badge-status " : "credential-status ") + css;
      if (id === "badgeStatus") el.textContent = labels[state] || labels.idle;
      else el.innerHTML = '<span class="status-dot"></span> ' + (heroLabels[state] || heroLabels.idle);
    });
  }

  function setVerification(state, title, description, side) {
    var line = $("verificationLine");
    line.classList.remove("is-active", "is-revoked");
    if (state === "active") line.classList.add("is-active");
    if (state === "revoked") line.classList.add("is-revoked");
    $("verificationTitle").textContent = title;
    $("verificationText").textContent = description;
    $("verificationSide").textContent = side || "—";
    line.querySelector(".verification-icon").textContent = state === "active" ? "✓" : state === "revoked" ? "×" : "·";
  }

  async function renderCredential(item) {
    credential = item;
    verified = false;
    revoked = false;
    var hash = await fingerprint(proofFrom(item));
    var skill = achievementFrom(item);
    var description = descriptionFrom(item);
    var issuer = issuerFrom(item);
    var date = shortDate(item.issuanceDate || item.validFrom || item.issued);
    issuerName = issuer;
    $("heroSkill").textContent = skill;
    $("heroDescription").textContent = description;
    $("heroIssuer").textContent = issuer;
    $("heroDate").textContent = date;
    $("heroHash").textContent = hash;
    $("heroProof").textContent = "Подпись создана · ожидает проверки";
    $("heroProofSub").textContent = "SHA-256 отпечаток рассчитан в браузере";
    $("badgeTitle").textContent = skill;
    $("badgeDescription").textContent = description;
    $("badgeIssuer").textContent = issuer;
    $("badgeDate").textContent = date;
    $("issuerMonogram").textContent = issuer.slice(0, 1).toUpperCase();
    $("badgeId").textContent = safeText(item.id, "Идентификатор отсутствует");
    $("downloadBtn").hidden = false;
    $("apiStatus").innerHTML = '<span class="status-dot status-dot-idle"></span> Документ получен с сервера';
    setBadgeStatus("pending");
    setVerification("pending", "Подпись ожидает проверки", "Документ выпущен; криптографический результат ещё не подтверждён.", "PENDING");
    setStepState(2);
    setBusy(false);
  }

  async function prepareDemo() {
    var health = await request("/health", "GET");
    var ready = await request("/ready", "GET");
    var issuer = await request("/issuer", "GET");
    if (!health.ok || !ready.ok || !issuer.ok) throw new Error("API не прошёл проверку состояния. Проверьте HTTP-коды в журнале.");
    if (health.data.demo_ready !== true || ready.data.ready !== true) {
      $("apiStatus").innerHTML = '<span class="status-dot" style="background:var(--red)"></span> Сервер отвечает, но демо не готово';
      throw new Error("Сервер доступен, но демо-издатель не готов. Попробуйте позже.");
    }
    issuerName = safeText(issuer.data.name, issuerName);
    $("apiStatus").innerHTML = '<span class="status-dot" style="background:var(--green)"></span> API готов · v' + safeText(health.data.version, "0.3.0");
  }

  $("issueBtn").addEventListener("click", async function () {
    if (busy) return;
    setBusy(true, "ПРОВЕРКА API");
    setResult("Проверяем готовность API и отдельного демо-издателя…");
    try {
      await prepareDemo();
      setResult("Сервер готов. Запрашиваем новое JSON-LD удостоверение с подписью Ed25519…");
      var response = await request("/demo/issue", "POST", {});
      if (!response.ok || !response.data || !response.data.credentialSubject) throw new Error("Выпуск отклонён сервером (HTTP " + response.status + ").");
      await renderCredential(response.data);
      setResult("Удостоверение получено от API. Следующий шаг — проверить реальную подпись и статус отзыва.", "ok");
      setStepState(2);
    } catch (error) {
      setResult("Не удалось выдать удостоверение: " + error.message, "bad");
      setBusy(false);
      $("apiStatus").innerHTML = '<span class="status-dot" style="background:var(--red)"></span> Выпуск не подтверждён';
    }
  });

  $("verifyBtn").addEventListener("click", async function () {
    if (!credential || busy) return;
    setBusy(true, "ПРОВЕРКА ПОДПИСИ");
    setResult("Проверяем подпись и актуальный статус на сервере…");
    try {
      var response = await request("/demo/verify", "POST", { credential: credential });
      if (!response.ok) throw new Error("Проверка отклонена сервером (HTTP " + response.status + ").");
      var result = response.data || {};
      var signatureOk = result.signature_valid === true;
      var state = String(result.status || "unknown").toLowerCase();
      verified = signatureOk && result.valid === true && state === "active";
      revoked = state === "revoked";
      if (verified) {
        setBadgeStatus("active");
        setVerification("active", "Подпись валидна · статус ACTIVE", "Сервер подтвердил подпись и активный статус удостоверения.", "HTTP " + response.status);
        $("heroProof").textContent = "Подпись: валидна ✓";
        $("heroProofSub").textContent = "Bitstring Status List: ACTIVE";
        $("apiStatus").innerHTML = '<span class="status-dot" style="background:var(--green)"></span> Подпись и статус подтверждены';
        setResult("Подпись Ed25519 валидна. Bitstring Status List сообщает ACTIVE. Теперь можно отозвать тестовый документ.", "ok");
        setStepState(3);
      } else if (signatureOk && state === "revoked") {
        setBadgeStatus("revoked");
        setVerification("revoked", "Подпись корректна · статус REVOKED", "Криптографическая подпись не изменилась, но документ больше не действителен.", "HTTP " + response.status);
        $("heroProof").textContent = "Подпись корректна · документ отозван";
        $("heroProofSub").textContent = "Bitstring Status List: REVOKED";
        $("apiStatus").innerHTML = '<span class="status-dot" style="background:var(--red)"></span> Отзыв подтверждён проверкой';
        setResult("Подпись остаётся корректной, но Bitstring Status List сообщает REVOKED. Документ нельзя считать действительным.", "bad");
        verified = false;
        revoked = true;
        setStepState(3);
      } else {
        setBadgeStatus(state === "revoked" ? "revoked" : "pending");
        setVerification("pending", "Проверка не подтверждена", "Ответ сервера не подтвердил одновременно подпись и активный статус.", "HTTP " + response.status);
        $("heroProof").textContent = "Проверка не подтверждена";
        $("heroProofSub").textContent = "Смотрите ответ сервера и ошибки";
        setResult("Удостоверение не прошло проверку. Подробности доступны в JSON-ответе API.", "bad");
      }
    } catch (error) {
      setResult("Проверка не выполнена: " + error.message, "bad");
    } finally {
      setBusy(false);
    }
  });

  $("revokeBtn").addEventListener("click", async function () {
    if (!credential || busy || !verified || revoked) return;
    setBusy(true, "ОТЗЫВ ДОКУМЕНТА");
    setResult("Отправляем запрос на отзыв в Bitstring Status List…");
    try {
      var response = await request("/demo/revoke", "POST", { credential: credential });
      if (!response.ok || response.data.revoked !== true) throw new Error("Сервер не подтвердил отзыв (HTTP " + response.status + ").");
      revoked = true;
      verified = false;
      setBadgeStatus("revoked");
      setVerification("revoked", "Отзыв сохранён · ожидает повторной проверки", "Теперь нажмите «Проверить», чтобы сервер подтвердил статус REVOKED.", "REVOKED");
      $("heroProof").textContent = "Удостоверение отозвано";
      $("heroProofSub").textContent = "Нажмите «Проверить» для подтверждения";
      $("apiStatus").innerHTML = '<span class="status-dot" style="background:var(--red)"></span> Отзыв записан на сервере';
      setResult("Сервер подтвердил отзыв. Для финального шага проверьте документ повторно: подпись останется прежней, статус должен стать REVOKED.", "ok");
      setStepState(3);
    } catch (error) {
      setResult("Не удалось отозвать удостоверение: " + error.message, "bad");
    } finally {
      setBusy(false);
    }
  });

  $("downloadBtn").addEventListener("click", function () {
    if (!credential) return;
    var blob = new Blob([JSON.stringify(credential, null, 2)], { type: "application/ld+json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "skillcred-demo-credential.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  var navToggle = $("menuToggle");
  var primaryNav = $("primaryNav");
  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") !== "true";
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      primaryNav.classList.toggle("is-open", open);
      navToggle.innerHTML = open
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    });
    primaryNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        primaryNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Открыть меню");
      });
    });
  }

  var faqButtons = Array.prototype.slice.call(document.querySelectorAll(".faq-question"));
  faqButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var shouldOpen = button.getAttribute("aria-expanded") !== "true";
      faqButtons.forEach(function (other) { other.setAttribute("aria-expanded", "false"); });
      button.setAttribute("aria-expanded", String(shouldOpen));
    });
  });

  var code = $("codeOutput");
  var codeTabs = Array.prototype.slice.call(document.querySelectorAll("[data-code-tab]"));
  codeTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var selected = tab.getAttribute("data-code-tab");
      code.textContent = codeSamples[selected];
      codeTabs.forEach(function (other) {
        var active = other === tab;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-selected", String(active));
      });
      $("copyCode").textContent = "Копировать";
      if (!$("copyCode").querySelector("svg")) {
        $("copyCode").insertAdjacentHTML("beforeend", '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8" height="9" rx="1.2"/><path d="M3 11V3.7A.7.7 0 0 1 3.7 3H10"/></svg>');
      }
    });
  });

  $("copyCode").addEventListener("click", async function () {
    var button = $("copyCode");
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = "Скопировано";
      button.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    } catch (_) {
      button.textContent = "Выделите код";
      var range = document.createRange();
      range.selectNodeContents(code);
      var selection = window.getSelection();
      if (selection) { selection.removeAllRanges(); selection.addRange(range); }
    }
    window.setTimeout(function () {
      button.textContent = "Копировать";
      button.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8" height="9" rx="1.2"/><path d="M3 11V3.7A.7.7 0 0 1 3.7 3H10"/></svg>');
    }, 1800);
  });

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var timelineSteps = Array.prototype.slice.call(document.querySelectorAll(".timeline-step"));
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = Math.min(index % 3, 2) * 65 + "ms";
      revealObserver.observe(item);
    });
    var timelineObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        timelineSteps.forEach(function (step, index) {
          window.setTimeout(function () { step.classList.add("is-visible"); }, index * 140);
        });
        var progress = $("timelineProgress");
        if (window.matchMedia("(max-width: 760px)").matches) progress.style.height = "100%";
        else progress.style.width = "100%";
        timelineObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    if ($("timeline")) timelineObserver.observe($("timeline"));
  } else {
    revealItems.forEach(function (item) { item.classList.add("is-visible"); });
    timelineSteps.forEach(function (item) { item.classList.add("is-visible"); });
  }

  var tiltCard = $("heroCredential");
  var pointerFine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (tiltCard && pointerFine && !reduceMotion) {
    tiltCard.addEventListener("pointermove", function (event) {
      var rect = tiltCard.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width;
      var y = (event.clientY - rect.top) / rect.height;
      var rotateY = (x - .5) * 5;
      var rotateX = (.5 - y) * 4;
      tiltCard.style.transform = "rotateX(" + rotateX.toFixed(2) + "deg) rotateY(" + rotateY.toFixed(2) + "deg) translateY(-2px)";
    });
    tiltCard.addEventListener("pointerleave", function () { tiltCard.style.transform = ""; });
  }

  window.skillCredDemo = Object.freeze({
    getState: function () { return { issued: !!credential, verified: verified, revoked: revoked, events: eventTotal }; }
  });
})();