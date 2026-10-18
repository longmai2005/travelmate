const featuredGrid = document.querySelector("#featured-grid");
let homeRequest = 0;
async function loadFeatured(category = "") {
  const request = ++homeRequest;
  try {
    const { items } = await api.request(
      `/destinations?limit=6&sort=featured${category ? `&category=${category}` : "&featured=true"}`,
    );
    if (request !== homeRequest) return;
    if (items.length) TM.renderCards(featuredGrid, items);
    else
      TM.empty(
        featuredGrid,
        "compass",
        "Một trải nghiệm mới đang chờ",
        "Chưa có điểm đến trong danh mục này.",
        '<a class="btn" href="/explore">Khám phá tất cả</a>',
      );
  } catch (error) {
    TM.error(featuredGrid, error);
  }
}
TM.ready.then(() => loadFeatured());
document.querySelector("#home-search").addEventListener("submit", (event) => {
  event.preventDefault();
  const params = new URLSearchParams();
  for (const [key, value] of new FormData(event.currentTarget))
    if (value.trim()) params.set(key, value.trim());
  location.assign(`/explore?${params}`);
});
document
  .querySelector("#home-categories")
  .addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    document
      .querySelectorAll("#home-categories .chip")
      .forEach((chip) => chip.classList.toggle("active", chip === button));
    loadFeatured(button.dataset.category);
  });
