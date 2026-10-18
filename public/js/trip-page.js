(async () => {
  const container = document.querySelector("#trip-document");
  const shared = location.pathname.startsWith("/share/");
  const id = location.pathname.split("/").pop();
  try {
    if (!shared) await TM.ready;
    const generation = SessionIdle.state?.generation;
    const response = await fetch(`/api/${shared ? "shared-itineraries" : "itineraries"}/${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Chưa tải được lịch trình.");
    if (!shared && (!TM.user || generation !== SessionIdle.state?.generation)) throw new Error("Vui lòng đăng nhập lại để xem bản in.");
    document.title = `${data.itinerary.title} · TravelMate`;
    container.innerHTML = `${shared ? '<p class="status-note share-notice">Bạn đang xem lịch trình qua liên kết chia sẻ. Nội dung có thể được chủ lịch trình cập nhật hoặc thu hồi.</p>' : ""}${TripView.render(data.itinerary)}`;
    const button = document.querySelector("#print-trip");
    button.disabled = false;
    button.addEventListener("click", () => window.print());
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h1>Chưa mở được lịch trình</h1><p>${TM.escape(error.message)}</p><a class="btn" href="/">Về trang chủ</a></div>`;
  }
})();

document.addEventListener("authchange", () => {
  if (!location.pathname.startsWith("/share/") && !TM.user) {
    document.querySelector("#trip-document").innerHTML = '<section class="empty-state"><h2>Phiên đã kết thúc</h2><p>Đăng nhập lại để mở bản in của chuyến đi.</p><a class="btn" href="/planner">Về lịch trình</a></section>';
    document.querySelector("#print-trip").disabled = true;
  }
});
