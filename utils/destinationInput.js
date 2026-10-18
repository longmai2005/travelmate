const { fail, text, integer } = require("./validation");
const { categories } = require("../models/Destination");
function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
module.exports = (body) => {
  const name = text(body.name, "Tên địa điểm", 160);
  const province = text(body.province, "Tỉnh / thành phố", 100);
  if (!categories.includes(body.category)) fail("Danh mục không hợp lệ.");
  if (!["north", "central", "south"].includes(body.region))
    fail("Vùng miền không hợp lệ.");
  const imageUrl = text(body.imageUrl, "URL ảnh", 2000);
  if (
    !/^https?:\/\//i.test(imageUrl) &&
    !/^\/images\/[a-zA-Z0-9._/-]+$/.test(imageUrl)
  )
    fail("Ảnh phải dùng URL http/https hoặc /images/.");
  const coordinate = (value, limit) => {
    if (value == null || value === "") return null;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      Math.abs(value) > limit
    )
      fail("Tọa độ không hợp lệ.");
    return value;
  };
  const latitude = coordinate(body.latitude, 90),
    longitude = coordinate(body.longitude, 180);
  if ((latitude === null) !== (longitude === null))
    fail("Vui lòng nhập cả vĩ độ và kinh độ hoặc để trống cả hai.");
  if (
    typeof body.recommendedDurationHours !== "number" ||
    !Number.isFinite(body.recommendedDurationHours) ||
    body.recommendedDurationHours < 0.25 ||
    body.recommendedDurationHours > 168
  )
    fail("Thời lượng cần từ 0,25 đến 168 giờ.");
  if (
    !Array.isArray(body.tags) ||
    body.tags.length > 15 ||
    body.tags.some((t) => typeof t !== "string" || t.length > 60)
  )
    fail("Tags không hợp lệ.");
  if (
    typeof body.isFeatured !== "boolean" ||
    typeof body.isActive !== "boolean"
  )
    fail("Trạng thái không hợp lệ.");
  return {
    name,
    slug: slugify(name),
    province,
    region: body.region,
    category: body.category,
    imageUrl,
    latitude,
    longitude,
    shortDescription: text(body.shortDescription, "Mô tả ngắn", 300),
    description: text(body.description, "Mô tả chi tiết", 5000),
    estimatedCostPerPersonVnd:
      body.estimatedCostPerPersonVnd == null
        ? null
        : integer(body.estimatedCostPerPersonVnd, "Chi phí", 0, 1e9),
    recommendedDurationHours: body.recommendedDurationHours,
    tags: body.tags.map((t) => t.trim()),
    isFeatured: body.isFeatured,
    isActive: body.isActive,
  };
};
module.exports.slugify = slugify;
