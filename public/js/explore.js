const form = document.querySelector("#explore-filters");
const grid = document.querySelector("#destination-grid");
const sort = document.querySelector("#sort-filter");
const params = new URLSearchParams(location.search);
let page = Math.max(1, Number(params.get("page")) || 1),
  pages = 1,
  currentItems = [],
  mapController,
  requestNumber = 0;
form.elements.category.innerHTML = TM.categoryOptions();
["q", "category", "budget"].forEach(
  (key) => (form.elements[key].value = params.get(key) || ""),
);
sort.value = params.get("sort") || "featured";
let selectedProvince = params.get("province") || "";
async function loadDestinations() {
  const request = ++requestNumber;
  const query = new URLSearchParams(new FormData(form));
  query.set("sort", sort.value);
  query.set("page", page);
  query.set("limit", "9");
  if (selectedProvince) query.set("province", selectedProvince);
  history.replaceState(null, "", `/explore?${query}`);
  grid.innerHTML =
    '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  try {
    const result = await api.request(`/destinations?${query}`);
    if (request !== requestNumber) return;
    pages = result.pages;
    currentItems = result.items;
    form.elements.province.innerHTML =
      '<option value="">Tất cả tỉnh thành</option>' +
      result.provinces
        .map((p) => `<option value="${TM.escape(p)}">${TM.escape(p)}</option>`)
        .join("");
    form.elements.province.value = selectedProvince;
    document.querySelector("#result-count").textContent =
      `${result.total} điểm đến dành cho bạn`;
    if (currentItems.length) TM.renderCards(grid, currentItems);
    else
      TM.empty(
        grid,
        "search-x",
        "Chưa tìm thấy điểm đến",
        "Thử một từ khóa khác hoặc bỏ bớt bộ lọc để khám phá thêm.",
      );
    document.querySelector("#page-label").textContent =
      `Trang ${page} / ${pages || 1}`;
    document.querySelector("#prev-page").disabled = page <= 1;
    document.querySelector("#next-page").disabled = page >= pages;
    updateMap();
  } catch (error) {
    if (request === requestNumber) TM.error(grid, error);
  }
}
function updateMap() {
  if (document.querySelector("#map-panel").hidden) return;
  if (!mapController)
    mapController = TM.createMap(
      document.querySelector("#explore-map"),
      currentItems,
      document.querySelector("#map-note"),
    );
  if (mapController) {
    const count = mapController.update(currentItems);
    document.querySelector("#marker-count").textContent = `${count} vị trí`;
  }
}
form.addEventListener("submit", (event) => event.preventDefault());
form.elements.q.addEventListener(
  "input",
  TM.debounce(() => {
    page = 1;
    loadDestinations();
  }),
);
form.addEventListener("change", () => {
  selectedProvince = form.elements.province.value;
  page = 1;
  loadDestinations();
});
sort.addEventListener("change", () => {
  page = 1;
  loadDestinations();
});
document.querySelector("#reset-filters").addEventListener("click", () => {
  form.reset();
  selectedProvince = "";
  sort.value = "featured";
  page = 1;
  loadDestinations();
});
document.querySelector("#prev-page").addEventListener("click", () => {
  if (page > 1) {
    page--;
    loadDestinations();
  }
});
document.querySelector("#next-page").addEventListener("click", () => {
  if (page < pages) {
    page++;
    loadDestinations();
  }
});
function toggleMap(show) {
  document.querySelector("#map-panel").hidden = !show;
  document.querySelector("#explore-layout").classList.toggle("with-map", show);
  document.querySelector("#map-view").classList.toggle("active", show);
  document.querySelector("#list-view").classList.toggle("active", !show);
  updateMap();
}
document
  .querySelector("#map-view")
  .addEventListener("click", () => toggleMap(true));
document
  .querySelector("#list-view")
  .addEventListener("click", () => toggleMap(false));
grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-detail]");
  if (button) mapController?.focus(button.dataset.detail);
});
TM.ready.then(loadDestinations);
