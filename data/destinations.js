const { slugify } = require("../utils/destinationInput");
const normalize = require("../utils/destinationSearch");
const legacy = require("./legacy-destinations");
const media = require("./catalogue-media.json");
const groups = require("./catalogue-source");
const primarySources = {
  "Eo Gió": "https://vietnam.travel/node/1453",
  "Chợ đêm Phú Quốc": "https://vietnam.travel/vi/things-to-do/phu-quoc-island-laid-back-leisure-getaway",
  "Chùa Hộ Quốc": "https://www.vietnam.travel/vi/node/1317",
  "Làng chài Hàm Ninh": "https://vietnam.travel/places-to-go/southern-vietnam/phu-quoc",
  "Cồn Sơn": "https://canthotourism.vn/vi/dulichconson",
  "Vườn cò Bằng Lăng": "https://canthotourism.vn/vi/detailtravelplace/?id=534",
  "Ruộng bậc thang Sa Pa": "https://vietnam.travel/things-to-do/3-august-destinations-vietnam-great-weather-and-thrilling-experiences",
  "Núi Hàm Rồng": "https://vietnam.travel/places-to-go/northern-midlands-mountains/sapa",
  "Biển Nha Trang": "https://vietnam.travel/places-to-go/south-central-coast-central-highlands/nha-trang",
  "Chùa Long Sơn": "https://vi.wikipedia.org/wiki/Ch%C3%B9a_Long_S%C6%A1n_(Nha_Trang)",
};
const areaPhotos = new Set(["Ruộng bậc thang Sa Pa", "Bản Tả Van", "Vườn quốc gia Phú Quốc", "Làng chài Hàm Ninh"]);
const records = groups.flatMap(([province, region, rows]) => rows.map(([name, title, category, hours, shortDescription, experience]) => {
  const old = legacy.find(d => d.name === name);
  const photo = media.find(d => d.name === name) || {};
  const tags = [...new Set([name, province, ...(old?.tags || []), normalize(name), ...(name.includes("Phú Quốc") || province === "An Giang" ? ["Phú Quốc"] : province === "Lâm Đồng" ? ["Đà Lạt"] : province === "Gia Lai" ? [/Pleiku/.test(name) ? "Pleiku" : "Quy Nhơn"] : [])])].filter(t => t.length <= 60).slice(0, 15);
  return {
    name, slug: slugify(name), province, region, category,
    shortDescription, description: `${shortDescription}\n\n${experience}`,
    imageUrl: photo.localImageUrl || "/images/placeholder.svg",
    imageCredit: photo.localImageUrl ? photo.imageCredit : "",
    imageSourceUrl: photo.localImageUrl ? photo.imageSourceUrl : "",
    imageLicense: photo.localImageUrl ? photo.imageLicense : "",
    imageLicenseUrl: photo.localImageUrl ? photo.imageLicenseUrl : "",
    imageTakenOn: photo.localImageUrl ? photo.imageTakenOn || "" : "",
    imageKind: !photo.localImageUrl ? "illustration" : areaPhotos.has(name) ? "area" : "place",
    latitude: old?.latitude ?? (areaPhotos.has(name) ? null : photo.coordinates?.lat ?? null),
    longitude: old?.longitude ?? (areaPhotos.has(name) ? null : photo.coordinates?.lon ?? null),
    address: `${name}, ${province}, Việt Nam`, openingHours: "",
    sourceUrl: primarySources[name] || photo.sourceUrl || "",
    verifiedOn: "2026-10-21",
    priceNote: old?.estimatedCostPerPersonVnd != null ? "Ước tính minh họa cho hoạt động mỗi người từ danh mục ban đầu, chưa phải giá vé niêm yết; chưa gồm lưu trú, di chuyển và ăn uống. Nguồn giới thiệu không xác nhận mức giá này." : "Chưa xác minh mức chi phí. Hỏi đơn vị vận hành về vé, dịch vụ bao gồm và điều kiện áp dụng; không mặc định hoạt động miễn phí.",
    estimatedCostPerPersonVnd: old?.estimatedCostPerPersonVnd ?? null,
    recommendedDurationHours: hours, tags,
    searchText: normalize([name, province, shortDescription, ...tags].join(" ")),
    isFeatured: old?.isFeatured || false, isActive: true,
  };
}));
// Giữ thứ tự và slug của danh mục cũ để dữ liệu tham chiếu ổn định.
module.exports = [...legacy.map(old => records.find(d => d.slug === old.slug)).filter(Boolean), ...records.filter(d => !legacy.some(old => old.slug === d.slug))];
