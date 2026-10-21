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
  const sourceUrl = text(body.sourceUrl ?? "", "Nguồn thông tin", 2000, false);
  if (sourceUrl) {
    let url;
    try { url = new URL(sourceUrl); } catch { fail("URL nguồn thông tin không hợp lệ."); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
      fail("Nguồn thông tin phải là URL http/https công khai.");
  }
  const imageMeta = {};
  for (const field of ["imageSourceUrl", "imageLicenseUrl"]) {
    const value = text(body[field] ?? "", "Nguồn ảnh", 2000, false);
    if (value) {
      let url;
      try { url = new URL(value); } catch { fail("URL nguồn ảnh không hợp lệ."); }
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) fail("Nguồn ảnh phải là URL http/https công khai.");
    }
    imageMeta[field] = value;
  }
  imageMeta.imageCredit = text(body.imageCredit ?? "", "Tác giả ảnh", 500, false);
  imageMeta.imageLicense = text(body.imageLicense ?? "", "Giấy phép ảnh", 100, false);
  imageMeta.imageKind = body.imageKind || "illustration";
  if (!["place", "area", "illustration"].includes(imageMeta.imageKind)) fail("Loại ảnh không hợp lệ.");
  const verifiedOn = text(body.verifiedOn ?? "", "Ngày kiểm tra", 10, false);
  if (verifiedOn) {
    const { dateFilter, todayInVietnam } = require("./adminData");
    dateFilter(verifiedOn, "Ngày kiểm tra");
    if (verifiedOn > todayInVietnam()) fail("Ngày kiểm tra không được ở tương lai.");
    if (!sourceUrl) fail("Cần có nguồn thông tin khi ghi ngày kiểm tra.");
  }
  return {
    name,
    slug: slugify(name),
    province,
    region: body.region,
    category: body.category,
    imageUrl,
    ...imageMeta,
    searchText: require("./destinationSearch")([name, province, body.shortDescription, ...body.tags].join(" ")),
    latitude,
    longitude,
    address: text(body.address ?? "", "Địa chỉ", 300, false),
    openingHours: text(body.openingHours ?? "", "Giờ mở cửa", 300, false),
    priceNote: text(body.priceNote ?? "", "Lưu ý giá", 500, false),
    sourceUrl,
    verifiedOn,
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
