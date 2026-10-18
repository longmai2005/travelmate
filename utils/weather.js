const { todayInVietnam } = require("./adminData");
const caches = new WeakMap();
const DAY = 86400000;
function inForecastRange(date, today = todayInVietnam()) {
  const offset = (Date.parse(date) - Date.parse(today)) / DAY;
  return Number.isInteger(offset) && offset >= 0 && offset < 16;
}
async function cachedJson(url, fetcher) {
  if (!caches.has(fetcher)) caches.set(fetcher, new Map());
  const cache = caches.get(fetcher), key = url.toString(), stored = cache.get(key);
  if (stored && stored.until > Date.now()) return stored.value;
  const value = (async () => {
    const response = await fetcher(key, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Weather service unavailable");
    return { data: await response.json(), fetchedAt: new Date().toISOString() };
  })();
  if (cache.size >= 200) cache.delete(cache.keys().next().value);
  cache.set(key, { until: Date.now() + 10 * 60000, value });
  try { return await value; } catch (error) { cache.delete(key); throw error; }
}
function normalizeLocation(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g,"d").toLowerCase().replace(/^(tp\.?|tinh|thanh pho|province|city)\s+/, "").replace(/\s+(province|city)$/, "").trim();
}
async function weatherForTrip(trip, fetcher = fetch) {
  const days = await Promise.all(trip.days.map(async day => {
    if (!inForecastRange(day.date)) { return { date: day.date, status: "out_of_range" }; }
    const destination = day.items.find(item => item.destinationId)?.destinationId;
    if (!destination) { return { date: day.date, status: "no_location" }; }
    try {
      let latitude = destination.latitude, longitude = destination.longitude, location = destination.name, approximate = false;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        const geocoding = new URL("https://geocoding-api.open-meteo.com/v1/search");
        geocoding.search = new URLSearchParams({ name: destination.province.replace(/^TP\.\s*/, ""), count: "5", language: "vi", format: "json", countryCode: "VN" });
        const province = normalizeLocation(destination.province);
        const found = (await cachedJson(geocoding, fetcher)).data.results?.find(result => result.country_code === "VN" &&
          (normalizeLocation(result.admin1) === province || normalizeLocation(result.name) === province));
        if (!found) throw new Error("No verified weather location");
        latitude = found.latitude; longitude = found.longitude;
        location = `${found.name}${found.admin1 ? `, ${found.admin1}` : ""}`; approximate = true;
      }
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max", timezone: "Asia/Ho_Chi_Minh", forecast_days: "16" });
      const { data: forecast, fetchedAt } = await cachedJson(url, fetcher);
      const index = forecast.daily?.time?.indexOf(day.date) ?? -1;
      if (index < 0) throw new Error("Forecast date unavailable");
      const read = key => Number.isFinite(forecast.daily[key]?.[index]) ? forecast.daily[key][index] : null;
      return { date: day.date, status: "available", location, approximate, destinationName: destination.name,
        code: read("weather_code"), maxC: read("temperature_2m_max"), minC: read("temperature_2m_min"), rainPercent: read("precipitation_probability_max"), windKmh: read("wind_speed_10m_max"), fetchedAt };
    } catch { return { date: day.date, status: "unavailable" }; }
  }));
  return { days, source: "Open-Meteo", sourceUrl: "https://open-meteo.com/", note: "Dự báo cho vị trí đầu tiên có dữ liệu của mỗi ngày; có thể thay đổi. Vị trí khu vực chỉ là tham khảo." };
}
module.exports = { weatherForTrip, inForecastRange };
