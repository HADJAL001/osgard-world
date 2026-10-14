const ALLOWED_STATUSES = new Set(["ready", "test_only", "blocked", "review_required", "not_integrated", "armed"]);

function status(value) {
  return ALLOWED_STATUSES.has(value) ? value : "review_required";
}

const PRICE_REASON_COPY = Object.freeze({
  available: "Цена найдена в Stripe и прошла проверку активности и типа платежа.",
  price_not_configured: "ID цены не задан в серверных переменных. Сумма не принимается из браузера.",
  price_unavailable: "Stripe не подтвердил цену. Повторите проверку и изучите доступность API провайдера.",
  price_inactive: "Цена существует, но выключена в Stripe.",
  price_mode_mismatch: "Тип цены не совпадает с разовым платежом или подпиской.",
  live_payments_disabled: "Live-обработка отключена серверным флагом. Это безопасное состояние по умолчанию.",
  service_not_ready: "База данных, webhook или конфигурация оплаты пока не готовы.",
  benefits_not_ready: "Продажа Premium заблокирована: полноценные права доступа ещё не реализованы.",
});

function productStatus(product, stripeMode, runtimeReady) {
  if (!product) return {
    id: "price-missing",
    label: "Цена не найдена в серверном каталоге",
    status: "blocked",
    detail: "Проверьте фиксированный каталог продуктов на сервере.",
  };
  const reason = String(product.reason || "price_not_configured");
  let level = "blocked";
  if (product.enabled === true && runtimeReady === true) level = stripeMode === "test" ? "test_only" : stripeMode === "live" ? "armed" : "blocked";
  else if (reason === "price_unavailable") level = "review_required";
  return {
    id: "price-" + String(product.key || "unknown"),
    label: String(product.label || product.key || "Платёжный продукт"),
    status: status(level),
    detail: PRICE_REASON_COPY[reason] || "Цена пока не готова к использованию.",
    mode: product.mode === "subscription" ? "subscription" : "payment",
    enabled: product.enabled === true && runtimeReady === true,
  };
}

/** Builds a read-only launch report from redacted statuses, never from secret values. */
export function buildCommercialReadiness(input = {}) {
  const databaseConfigured = input.databaseConfigured === true;
  const databaseReady = input.databaseReady === true;
  const adminTokenConfigured = input.adminTokenConfigured === true;
  const stripeConfigured = input.stripeConfigured === true;
  const stripeMode = input.stripeMode === "test" || input.stripeMode === "live" ? input.stripeMode : "missing";
  const webhookConfigured = input.webhookConfigured === true;
  const livePaymentsOptIn = input.livePaymentsOptIn === true;
  const paymentsRuntimeReady = input.paymentsRuntimeReady === true;
  const premiumEntitlementsImplemented = input.premiumEntitlementsImplemented === true;
  const adNetworkIntegrated = input.adNetworkIntegrated === true;
  const serviceAttributionServiceCountRaw = Number(input.serviceAttributionServiceCount || 0);
  const serviceAttributionServiceCount = Number.isSafeInteger(serviceAttributionServiceCountRaw) && serviceAttributionServiceCountRaw > 0
    ? Math.min(100, serviceAttributionServiceCountRaw)
    : 0;
  const products = Array.isArray(input.products) ? input.products : [];
  const productByKey = new Map(products.map((item) => [String(item?.key || ""), item]));
  const checks = [];

  checks.push({
    id: "database", label: "База данных и схема", status: databaseReady ? "ready" : "blocked",
    detail: databaseReady
      ? "Соединение и необходимые таблицы инициализированы."
      : !databaseConfigured
        ? "DATABASE_URL не настроен; заявки, заказы и серверная аналитика не будут сохраняться."
        : input.databaseInitFailedAtBoot === true
          ? "Инициализация базы завершилась ошибкой. Посмотрите серверные логи до повторной выкладки."
          : "База данных ещё не подтвердила готовность.",
  });
  checks.push({
    id: "admin-auth", label: "Защита административного API", status: adminTokenConfigured ? "ready" : "blocked",
    detail: adminTokenConfigured
      ? "Запрос прошёл bearer-проверку. Секреты не входят в этот отчёт."
      : "ADMIN_API_TOKEN должен иметь не менее 32 символов и храниться только на сервере.",
  });
  checks.push({
    id: "lead-intake", label: "Заявки на разработку и спонсорство", status: databaseReady ? "ready" : "blocked",
    detail: databaseReady
      ? "API-хранилище заявок доступно; ручной WhatsApp fallback остаётся резервным каналом."
      : "Серверное сохранение заявок заблокировано до готовности базы. Локальный переход не означает, что заявка отправлена.",
  });
  checks.push({
    id: "consented-analytics", label: "Согласуемая аналитика", status: databaseReady ? "ready" : "blocked",
    detail: databaseReady
      ? "API принимает только разрешённые события после явного согласия; агрегаты отражают лишь записанные события."
      : "Серверные события не сохраняются без готового хранилища. Это не число всех посещений.",
  });

  const support = productByKey.get("support-osgard");
  const deposit = productByKey.get("development-deposit");
  const oneTimeProductsReady = Boolean(support?.enabled === true && deposit?.enabled === true);
  let checkoutStatus = "blocked";
  let checkoutDetail = "Не все обязательные компоненты оплаты готовы: проверьте хранилище, webhook и цены Stripe.";
  if (databaseReady && stripeConfigured && webhookConfigured && paymentsRuntimeReady && oneTimeProductsReady) {
    if (stripeMode === "test") {
      checkoutStatus = "test_only";
      checkoutDetail = "Разовый Checkout настроен в тестовом режиме. Это не live-выручка и не подтверждение успешного сквозного платежа на production.";
    } else if (stripeMode === "live" && livePaymentsOptIn) {
      checkoutStatus = "armed";
      checkoutDetail = "Live-режим явно включён на сервере. До рекламного запуска всё равно нужны тест платежа/возврата, налоговые и юридические проверки и ручное подтверждение релиза.";
    }
  } else if (stripeMode === "live" && !livePaymentsOptIn) {
    checkoutDetail = "Live-ключ присутствует, но ENABLE_LIVE_PAYMENTS выключен. Live-платежи остаются заблокированы.";
  } else if (!stripeConfigured) {
    checkoutDetail = "Stripe API key не настроен. Платёжный провайдер не подключён.";
  } else if (!webhookConfigured) {
    checkoutDetail = "Stripe webhook secret не настроен; сервер не может проверять подписанные события провайдера.";
  } else if (!oneTimeProductsReady) {
    checkoutDetail = "Хотя бы одна цена разового продукта не прошла проверку в Stripe.";
  }
  checks.push({ id: "one-time-checkout", label: "Разовые платежи", status: status(checkoutStatus), detail: checkoutDetail });

  for (const key of ["support-osgard", "development-deposit"]) {
    const item = productByKey.get(key);
    if (item) checks.push(productStatus(item, stripeMode, paymentsRuntimeReady));
  }

  checks.push({
    id: "premium-entitlements", label: "OSGARD PREMIUM и права доступа",
    status: premiumEntitlementsImplemented ? "review_required" : "blocked",
    detail: premiumEntitlementsImplemented
      ? "Подтвердите end-to-end выдачу и отзыв доступа, отмену, возвраты и условия подписки до продаж."
      : "Продажи жёстко заблокированы в коде: ещё нет завершённого и проверенного цикла выдачи/отзыва прав подписчикам. Одной переменной окружения недостаточно.",
  });
  checks.push({
    id: "sponsor-inventory", label: "Управление спонсорскими кампаниями",
    status: databaseReady ? "review_required" : "blocked",
    detail: databaseReady
      ? "Серверный инвентарь кампаний и административные маршруты есть. Это не означает, что инвентарь продан или сеть рекламы подключена."
      : "Кампаниями нельзя безопасно управлять, пока серверное хранилище недоступно.",
  });
  checks.push({
    id: "service-attribution", label: "Серверные конверсии экосистемы",
    status: serviceAttributionServiceCount > 0 ? (databaseReady ? "ready" : "blocked") : "not_integrated",
    detail: serviceAttributionServiceCount > 0
      ? databaseReady
        ? "Настроены отдельные серверные токены для " + serviceAttributionServiceCount + " сервиса(ов). Это готовность входного API, а не доказательство, что целевые домены уже отправляют конверсии."
        : "Настроены сервисные токены, но база данных не готова сохранять конверсии."
      : "Мост server-to-server ещё не настроен: добавьте OSGARD_ATTRIBUTION_TOKENS_JSON и установите вызов API в серверной части хотя бы одного целевого сервиса.",
  });
  checks.push({
    id: "ad-network", label: "Сторонняя рекламная сеть",
    status: adNetworkIntegrated ? "review_required" : "not_integrated",
    detail: adNetworkIntegrated
      ? "Провайдер отмечен как подключённый; до запуска требуется проверить consent, географию, размещения, callbacks и отчётность."
      : "SDK/провайдер рекламы не подключён. Рекламные показы или выплаты не заявляются; локальное промо не выдаётся за сетевую рекламу.",
  });
  checks.push({
    id: "ecosystem-domains", label: "Внешние проекты экосистемы", status: "review_required",
    detail: "Перед платными кампаниями вручную подтвердите владение доменом, HTTPS, содержание, контакты, условия и пользовательский путь. Этот отчёт не делает live HTTP-проверку внешних сайтов.",
  });
  checks.push({
    id: "production-release", label: "Публикация и rollback", status: "review_required",
    detail: "Состояние Commerce API не подтверждает публикацию фронтенда. Нужны зелёный CI, production route matrix, ручная проверка на ПК/телефоне и документированный rollback.",
  });

  const blocked = checks.filter((item) => item.status === "blocked").length;
  const review = checks.filter((item) => ["review_required", "not_integrated", "armed"].includes(item.status)).length;
  const ready = checks.filter((item) => ["ready", "test_only"].includes(item.status)).length;
  const overallStatus = blocked > 0 ? "blocked" : review > 0 ? "review_required" : "ready";
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    overallStatus,
    summary: ready + " проверок в рабочем/тестовом состоянии · " + blocked + " заблокировано · " + review + " требуют ручного решения.",
    counts: { ready, blocked, review },
    payments: { stripeMode, databaseReady, webhookConfigured, livePaymentsOptIn, runtimeReady: paymentsRuntimeReady },
    checks,
    safety: [
      "Отчёт read-only и не меняет переменные окружения, платежный режим или кампании.",
      "Секреты, токены, URL базы данных и значения Stripe Price ID не возвращаются.",
      "Нулевые события не доказывают отсутствие посетителей; учитывается только согласованная серверная телеметрия.",
    ],
  };
}
