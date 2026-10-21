const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { slugify } = require("../utils/destinationInput");
const metadataPath = path.resolve(__dirname, "../data/catalogue-media.json");
const directory = path.resolve(__dirname, "../public/images/destinations");
async function main() {
  const rows = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  await fs.mkdir(directory, { recursive: true });
  let saved = 0;
  for (const row of rows) {
    if (!row.imageUrl || !row.imageSourceUrl || !row.imageLicense) continue;
    const remote = new URL(row.imageUrl);
    if (!["upload.wikimedia.org", "thumb.wikimedia.org"].includes(remote.hostname)) throw new Error("Unapproved image host");
    if (row.localImageUrl && row.imageAssetSourceUrl === row.imageSourceUrl) {
      try { await fs.access(path.resolve(__dirname, "../public", `.${row.localImageUrl}`)); saved++; continue; } catch {}
    }
    try {
      const response = await fetch(remote, { headers: { "User-Agent": "TravelMate-Catalogue/1.0 (https://github.com/longmai2005/travelmate)" }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Image returned ${response.status}`);
      const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[response.headers.get("content-type")?.split(";")[0]];
      if (!extension) throw new Error("Image is not a supported photo");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1000 || bytes.length > 5000000) throw new Error("Unexpected image size");
      const revision = createHash("sha256").update(row.imageSourceUrl).digest("hex").slice(0, 10);
      const file = `${slugify(row.name)}-${revision}.${extension}`;
      await fs.writeFile(path.join(directory, file), bytes);
      row.localImageUrl = `/images/destinations/${file}`;
      row.imageAssetSourceUrl = row.imageSourceUrl;
      saved++;
      if (saved % 10 === 0) console.log(`Đã lưu ${saved} ảnh có giấy phép.`);
    } catch (error) { console.log(JSON.stringify({ name: row.name, error: error.message })); }
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  await fs.writeFile(metadataPath, JSON.stringify(rows, null, 2) + "\n");
  console.log(JSON.stringify({ saved, withoutPhoto: rows.filter(r => !r.localImageUrl).map(r => r.name) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
