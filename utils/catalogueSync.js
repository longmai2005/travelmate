const { isDeepStrictEqual: same } = require("node:util");
const legacy = require("../data/legacy-destinations");
const normalize = require("./destinationSearch");
const photoFields = ["imageUrl", "imageCredit", "imageSourceUrl", "imageLicense", "imageLicenseUrl", "imageKind"];
module.exports = function cataloguePlan(existing, catalogue) {
  const inserts = [], updates = [], protectedFields = [];
  for (const next of catalogue) {
    const current = existing.find(d => d.slug === next.slug);
    if (!current) { inserts.push(next); continue; }
    const previous = legacy.find(d => d.slug === current.slug);
    const patch = {};
    const customSource = current.sourceUrl && current.sourceUrl !== next.sourceUrl && current.sourceUrl !== previous?.sourceUrl;
    for (const key of ["shortDescription", "description", "recommendedDurationHours", "address", "openingHours", "priceNote", "sourceUrl", "verifiedOn"]) {
      if (key === "verifiedOn" && customSource) continue;
      if (same(current[key], next[key])) continue;
      if (current[key] == null || current[key] === "" || (previous && same(current[key], previous[key]))) patch[key] = next[key];
      else if (previous) protectedFields.push({ slug: current.slug, field: key });
    }
    if ((current.latitude == null && current.longitude == null) || (previous && same(current.latitude, previous.latitude) && same(current.longitude, previous.longitude))) {
      for (const key of ["latitude", "longitude"]) if (!same(current[key], next[key])) patch[key] = next[key];
    }
    if (!current.imageUrl || current.imageUrl === previous?.imageUrl)
      for (const key of photoFields) if (!same(current[key], next[key])) patch[key] = next[key];
    else if (current.imageUrl === next.imageUrl) {
      for (const key of photoFields) if ((current[key] == null || current[key] === "") && !same(current[key], next[key])) patch[key] = next[key];
    }
    else protectedFields.push({ slug: current.slug, field: "imageUrl" });
    const tags = [...new Set([...(current.tags || []), ...next.tags])].filter(t => t.length <= 60).slice(0, 15);
    if (!same(current.tags, tags)) patch.tags = tags;
    const searchText = normalize([current.name, current.province, patch.shortDescription ?? current.shortDescription, ...tags].join(" "));
    if (current.searchText !== searchText) patch.searchText = searchText;
    if (Object.keys(patch).length) updates.push({ slug: current.slug, filter: { slug: current.slug, ...(current.updatedAt ? { updatedAt: current.updatedAt } : {}) }, patch });
  }
  return { inserts, updates, protectedFields };
};
