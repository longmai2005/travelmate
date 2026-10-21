// Chỉ chạy khi biên tập dữ liệu; website không gọi Wikipedia/Commons lúc người dùng xem.
const fs = require("node:fs/promises");
const path = require("node:path");
const groups = require("../data/catalogue-source");
const overrides = require("../data/catalogue-photo-overrides.json");
const rows = groups.flatMap(([province, region, items]) => items.map(item => ({ province, region, name: item[0], title: item[1] })));
const root = path.resolve(__dirname, "..");
const headers = { "User-Agent": "TravelMate-Catalogue/1.0 (educational project; https://github.com/longmai2005/travelmate)" };
const plain = value => (value || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
async function json(base, params) {
  const res = await fetch(`${base}?${new URLSearchParams({ format: "json", ...params })}`, { headers, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Source returned ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.info);
  return data;
}
async function main() {
  const research = [];
  for (let i = 0; i < rows.length; i += 25) {
    const batch = rows.slice(i, i + 25);
    const data = await json("https://vi.wikipedia.org/w/api.php", { action: "query", prop: "pageimages|images|coordinates|extracts|info", imlimit: "50", inprop: "url", exintro: "1", explaintext: "1", exsentences: "2", piprop: "name", redirects: "1", titles: batch.map(r => r.title).join("|") });
    const aliases = [...(data.query.normalized || []), ...(data.query.redirects || [])];
    for (const row of batch) {
      let title = row.title;
      for (let n = 0; n < 5; n++) title = aliases.find(a => a.from === title)?.to || title;
      const page = Object.values(data.query.pages).find(p => p.title === title);
      const photo = name => /\.(jpe?g|png|webp)$/i.test(name) && !/map|logo|location|Flag_of|coat.of.arms/i.test(name);
      // Danh sách images có thể chứa ảnh từ hộp điều hướng của bài khác.
      // Chỉ nhận ảnh đại diện hoặc lựa chọn thủ công, rồi kiểm tra bằng mắt.
      const image = page?.pageimage && photo(page.pageimage) ? page.pageimage : null;
      research.push({ ...row, articleTitle: page?.title, sourceUrl: page?.missing !== undefined ? "" : page?.fullurl, missing: page?.missing !== undefined, image: overrides[row.name] || image || null, coordinates: page?.coordinates?.[0] || null, extract: page?.extract || "" });
    }
  }
  await fs.writeFile("/private/tmp/travelmate-catalogue-research.json", JSON.stringify(research, null, 2));
  console.log(JSON.stringify({ total: research.length, missingArticles: research.filter(r => r.missing).map(r => [r.name, r.title]), missingImages: research.filter(r => !r.image).map(r => [r.name, r.articleTitle]) }));
  const files = [...new Set(research.map(r => r.image).filter(Boolean))];
  const media = {};
  for (let i = 0; i < files.length; i += 25) {
    const data = await json("https://commons.wikimedia.org/w/api.php", { action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "800", titles: files.slice(i, i + 25).map(f => `File:${f}`).join("|") });
    for (const page of Object.values(data.query.pages)) {
      const info = page.imageinfo?.[0], meta = info?.extmetadata;
      if (!info || !meta || !/^(CC BY|CC0|Public domain)/i.test(meta.LicenseShortName?.value || "") || /NC|ND/.test(meta.LicenseShortName?.value || "")) continue;
      media[page.title.slice(5).replaceAll("_", " ").normalize("NFC")] = { imageUrl: info.thumburl || info.url, imageSourceUrl: info.descriptionurl, imageCredit: plain(meta.Artist?.value).slice(0, 500), imageLicense: plain(meta.LicenseShortName?.value), imageLicenseUrl: meta.LicenseUrl?.value || "https://creativecommons.org/publicdomain/mark/1.0/", imageDescription: plain(meta.ImageDescription?.value).slice(0, 400) };
    }
  }
  const output = research.map(row => ({ name: row.name, articleTitle: row.articleTitle, sourceUrl: row.sourceUrl || "", coordinates: row.coordinates, ...(media[row.image?.replaceAll("_", " ").normalize("NFC")] || {}) }));
  await fs.writeFile(path.join(root, "data/catalogue-media.json"), JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({ licensedPhotos: output.filter(r => r.imageUrl).length, noCommonsPhoto: output.filter(r => !r.imageUrl).map(r => [r.name, research.find(x => x.name === r.name).image]) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
