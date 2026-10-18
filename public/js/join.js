async function renderInvitation() {
  const el = document.querySelector("#join-content");
  if (!TM.user) { el.innerHTML = '<section class="feature-card"><p>Đăng nhập đúng email được chủ chuyến đi mời.</p><button class="btn" id="join-login">Đăng nhập</button></section>'; el.querySelector("button").onclick = () => { TM.pendingAction = renderInvitation; TM.openAuth(); }; return; }
  const token = location.pathname.split("/").pop();
  try {
    const { invitation: i } = await api.request(`/itineraries/invitations/${encodeURIComponent(token)}`);
    el.innerHTML = `<section class="feature-card"><h2>${TM.escape(i.title)}</h2><p>Người mời: ${TM.escape(i.ownerName || "Chủ chuyến đi")} · Quyền ${i.role === "editor" ? "chỉnh sửa" : "chỉ xem"}</p><p>Đang đăng nhập: ${TM.escape(TM.user.email)} · Hết hạn ${TM.date(i.expiresAt.slice(0,10))}</p><p class="form-error" role="alert"></p><button class="btn" id="accept-invitation">Tham gia chuyến đi</button></section>`;
    el.querySelector("button").onclick = async event => {
      event.target.disabled = true;
      try { const result = await api.request(`/itineraries/invitations/${token}/accept`, { method: "POST" }); location.assign(`/planner?trip=${result.itineraryId}`); }
      catch(e) { el.querySelector(".form-error").textContent = e.message; event.target.disabled = false; }
    };
  } catch (e) { el.innerHTML = `<section class="feature-card"><h2>Chưa thể nhận lời mời</h2><p>${TM.escape(e.message)}</p><a class="btn outline" href="/planner">Về lịch trình</a></section>`; }
}
TM.ready.then(renderInvitation); document.addEventListener("authchange",renderInvitation);
