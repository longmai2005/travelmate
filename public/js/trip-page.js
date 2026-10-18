(async () => {
  const container = document.querySelector("#trip-document");
  const shared = location.pathname.startsWith("/share/");
  const id = location.pathname.split("/").pop();
  try {
    const response = await fetch(`/api/${shared ? "shared-itineraries" : "itineraries"}/${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Chưa tải được lịch trình.");
    document.title = `${data.itinerary.title} · TravelMate`;
    container.innerHTML = `${shared ? '<p class="status-note share-notice">Bạn đang xem lịch trình qua liên kết chia sẻ. Nội dung có thể được chủ lịch trình cập nhật hoặc thu hồi.</p>' : ""}${TripView.render(data.itinerary)}`;
    const button = document.querySelector("#print-trip");
    button.disabled = false;
    button.addEventListener("click", () => window.print());
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h1>Chưa mở được lịch trình</h1><p>${TM.escape(error.message)}</p><a class="btn" href="/">Về trang chủ</a></div>`;
  }
})();
