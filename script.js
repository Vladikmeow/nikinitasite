// === Google Analytics 4 ===
// 1. Создайте ресурс GA4 и веб-поток.
// 2. Замените значение ниже на Measurement ID вида G-XXXXXXXXXX.
// 3. Для демонстрации аналитика запускается только после согласия пользователя.
const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

let analyticsInitialized = false;
const consentBanner = document.getElementById("consentBanner");
const acceptAnalyticsButton = document.getElementById("acceptAnalytics");
const rejectAnalyticsButton = document.getElementById("rejectAnalytics");
const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3600);
}

function sendAnalyticsEvent(eventName, parameters = {}) {
  // Не отправляем адреса, имена, телефоны или иные персональные данные в GA4.
  if (!analyticsInitialized || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, parameters);
}

function initializeAnalytics() {
  if (analyticsInitialized) return;

  if (!/^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) || GA_MEASUREMENT_ID === "G-XXXXXXXXXX") {
    showToast("Сайт работает, но GA4 пока не подключён. В script.js укажите свой Measurement ID.");
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });

  const googleScript = document.createElement("script");
  googleScript.async = true;
  googleScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  googleScript.onload = () => {
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: true });
    analyticsInitialized = true;
    showToast("Google Analytics 4 подключён. Можно проверять события в отчёте реального времени.");
  };
  googleScript.onerror = () => showToast("Не удалось загрузить Google Analytics. Проверьте интернет и Measurement ID.");
  document.head.appendChild(googleScript);
}

function saveAnalyticsChoice(allowed) {
  // Демонстрационное сохранение выбора в текущей вкладке; отказ не запускает GA.
  sessionStorage.setItem("taxigo_analytics_consent", allowed ? "granted" : "denied");
  consentBanner.hidden = true;
  if (allowed) initializeAnalytics();
  else showToast("Аналитика отключена для этой демонстрационной сессии.");
}

acceptAnalyticsButton.addEventListener("click", () => saveAnalyticsChoice(true));
rejectAnalyticsButton.addEventListener("click", () => saveAnalyticsChoice(false));

const savedConsent = sessionStorage.getItem("taxigo_analytics_consent");
if (savedConsent === "granted") {
  initializeAnalytics();
} else if (savedConsent !== "denied") {
  consentBanner.hidden = false;
}

// Калькулятор демонстрационной стоимости.
const tariffSelect = document.getElementById("tariff");
const distanceInput = document.getElementById("distance");
const rideForm = document.getElementById("rideForm");
const priceLabel = document.getElementById("price");
const estimateHint = document.getElementById("estimateHint");
const orderButton = document.getElementById("orderButton");
let calculatedPrice = null;
let lastCalculation = null;

function getTariffData() {
  const option = tariffSelect.selectedOptions[0];
  return {
    name: option.value,
    rate: Number(option.dataset.rate),
    base: Number(option.dataset.base)
  };
}

function setSelectedTariff(name) {
  tariffSelect.value = name;
  document.querySelectorAll(".tariff-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.tariff === name);
  });
  calculatedPrice = null;
  orderButton.disabled = true;
  priceLabel.textContent = "— ₽";
  estimateHint.textContent = "Тариф изменён. Рассчитайте стоимость заново.";
}

tariffSelect.addEventListener("change", () => {
  setSelectedTariff(tariffSelect.value);
  sendAnalyticsEvent("select_tariff", { tariff_name: tariffSelect.value });
});

document.querySelectorAll(".tariff-card").forEach(card => {
  card.addEventListener("click", () => {
    setSelectedTariff(card.dataset.tariff);
    sendAnalyticsEvent("select_tariff", { tariff_name: card.dataset.tariff });
    document.getElementById("order").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.getElementById("heroOrderButton").addEventListener("click", () => {
  sendAnalyticsEvent("click_order_cta", { button_location: "hero" });
});

rideForm.addEventListener("submit", event => {
  event.preventDefault();

  const fromAddress = document.getElementById("fromAddress").value.trim();
  const toAddress = document.getElementById("toAddress").value.trim();
  const distance = Number(distanceInput.value);
  if (!fromAddress || !toAddress || !Number.isFinite(distance) || distance < 1 || distance > 100) {
    showToast("Заполните оба адреса и укажите расстояние от 1 до 100 км.");
    return;
  }

  const tariff = getTariffData();
  calculatedPrice = Math.round(tariff.base + tariff.rate * distance);
  lastCalculation = { tariffName: tariff.name, distanceKm: distance, price: calculatedPrice };
  priceLabel.textContent = `${calculatedPrice.toLocaleString("ru-RU")} ₽`;
  estimateHint.textContent = `Тариф «${tariff.name}» · ${distance} км · учебный расчёт`;
  orderButton.disabled = false;

  // Намеренно не передаём fromAddress/toAddress в параметры GA4.
  sendAnalyticsEvent("calculate_price", {
    tariff_name: tariff.name,
    distance_km: distance,
    estimated_price: calculatedPrice,
    currency: "RUB"
  });
});

orderButton.addEventListener("click", () => {
  if (!lastCalculation) return;

  sendAnalyticsEvent("order_submit", {
    tariff_name: lastCalculation.tariffName,
    distance_km: lastCalculation.distanceKm,
    estimated_price: lastCalculation.price,
    currency: "RUB",
    demo_order: true
  });

  showToast(`Демо-заказ оформлен! Тариф «${lastCalculation.tariffName}», ${lastCalculation.price.toLocaleString("ru-RU")} ₽. Реальный автомобиль не вызывается.`);
  orderButton.textContent = "Демо-заказ оформлен ✓";
  orderButton.disabled = true;
});
