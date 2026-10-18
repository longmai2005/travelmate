const favoritesGrid = document.querySelector("#favorites-grid");
let favoritesItems = [];
function renderFavorites() {
  const query = document
    .querySelector("#favorite-search")
    .value.toLocaleLowerCase("vi");
  const items = favoritesItems.filter((d) =>
    `${d.name} ${d.province}`.toLocaleLowerCase("vi").includes(query),
  );
  document.querySelector("#favorite-count").textContent = favoritesItems.length;
  if (items.length) TM.renderCards(favoritesGrid, items);
  else
    TM.empty(
      favoritesGrid,
      "heart",
      query ? "Chưa có điểm đến phù hợp" : "Bộ sưu tập đang đợi bạn",
      query
        ? "Thử tìm một tên khác trong danh sách."
        : "Chạm vào trái tim ở điểm đến bạn thích. Những cảm hứng nhỏ sẽ ở lại đây.",
      '<a class="btn" href="/explore">Tìm cảm hứng mới <i data-lucide="arrow-up-right"></i></a>',
    );
}
async function loadFavoritesPage() {
  if (!TM.user) {
    document.querySelector("#favorite-count").textContent = "0";
    TM.empty(
      favoritesGrid,
      "heart-handshake",
      "Giữ lại những nơi bạn yêu",
      "Đăng nhập để tạo bộ sưu tập điểm đến của riêng mình.",
      '<button class="btn" id="favorites-login">Đăng nhập để bắt đầu</button>',
    );
    document
      .querySelector("#favorites-login")
      .addEventListener("click", () => TM.openAuth());
    return;
  }
  try {
    favoritesItems = await TM.loadFavorites();
    renderFavorites();
  } catch (error) {
    TM.error(favoritesGrid, error);
  }
}
document
  .querySelector("#favorite-search")
  .addEventListener("input", renderFavorites);
document.addEventListener("authchange", loadFavoritesPage);
document.addEventListener("favoriteschange", loadFavoritesPage);
TM.ready.then(loadFavoritesPage);
