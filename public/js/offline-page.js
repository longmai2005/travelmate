async function renderOffline() {
  const el=document.querySelector("#offline-content");
  if(!TM.user){el.innerHTML='<section class="feature-card"><h2>Chưa có phiên để mở bản ngoại tuyến</h2><p>Hãy kết nối mạng, đăng nhập và chọn “Lưu ngoại tuyến” trong chuyến đi. Bản lưu được xóa khi đăng xuất hoặc hết thời gian không hoạt động.</p><a class="btn" href="/planner">Về lịch trình</a></section>';return;}
  try {
    const userId=TM.user._id, rows=await OfflineTrips.list(userId);if(TM.user?._id!==userId)return;
    el.innerHTML=`<div class="offline-banner">${TM.offlineMode || !navigator.onLine ? "Chưa kết nối được máy chủ · Bạn đang đọc bản ngoại tuyến" : "Đang có kết nối mạng"}. Đây là bản đọc trên thiết bị, có thể khác bản lưu mới nhất. Bản ngoại tuyến và chi tiêu được xóa khi đăng xuất hoặc hết phiên. Ảnh, bản đồ và dự báo mới cần mạng. <button class="btn ghost small" id="offline-reconnect">Kiểm tra kết nối lại</button></div><div id="offline-list">${rows.map(row=>`<article class="feature-card"><h2>${TM.escape(row.trip.title)}</h2><p>${TM.date(row.trip.startDate)} – ${TM.date(row.trip.endDate)}</p><p class="field-help">Lưu lúc ${new Date(row.savedAt).toLocaleString("vi-VN")}</p><div class="offline-toolbar"><button class="btn light small" data-offline-open="${row.key}">Đọc bản đã lưu</button><button class="btn outline small" data-offline-refresh="${row.key}" ${navigator.onLine && !TM.offlineMode ? "" : "disabled"}>Cập nhật bản lưu</button><button class="btn danger small" data-offline-delete="${row.key}">Xóa khỏi thiết bị</button></div></article>`).join("")||'<p class="day-empty">Chưa có bản ngoại tuyến. Mở chuyến đi rồi bấm Lưu ngoại tuyến.</p>'}</div><div id="offline-document"></div>`;
    el.querySelector("#offline-reconnect").onclick = () => location.reload();
    el.onclick=async event=>{
      const b=event.target.closest("button");if(!b||!TM.user||SessionIdle.check())return;
      const key=b.dataset.offlineOpen||b.dataset.offlineRefresh||b.dataset.offlineDelete,row=rows.find(r=>r.key===key);if(!row)return;
      b.disabled=true;
      try{
        if(b.dataset.offlineOpen){el.querySelector("#offline-document").innerHTML=`<article class="trip-document">${TripView.render(row.trip)}</article>`;el.querySelector("#offline-document").scrollIntoView({behavior:"smooth"});}
        if(b.dataset.offlineRefresh){const {itinerary}=await api.request(`/itineraries/${row.trip._id}`);await OfflineTrips.save(itinerary);await renderOffline();TM.toast("Đã cập nhật bản ngoại tuyến.");}
        if(b.dataset.offlineDelete){await OfflineTrips.remove(key);await renderOffline();}
      }catch(e){TM.toast(e.message,true);}finally{b.disabled=false;}
    };
  }catch(e){TM.error(el,e);}
}
TM.ready.then(renderOffline);document.addEventListener("authchange",renderOffline);window.addEventListener("online",renderOffline);window.addEventListener("offline",renderOffline);
