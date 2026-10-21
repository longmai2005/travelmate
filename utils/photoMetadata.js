// Commons DateTimeOriginal describes capture/creation. Upload timestamps must
// never be substituted for missing capture dates.
function plain(value) {
  return String(value || "").replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}
function captureDate(value, today = new Date().toISOString().slice(0, 10)) {
  const text = plain(value);
  if (!text || /upload|before|after|circa|between|unknown/i.test(text)) return "";
  if (/^(19|20)\d{2}$/.test(text)) return text <= today.slice(0, 4) ? text : "";
  let date = text.match(/^((?:19|20)\d{2}-\d{2}-\d{2})(?:\s|T|$)/)?.[1];
  if (!date) {
    const match = text.match(/^(?:Taken on )?(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) ((?:19|20)\d{2})(?:\b)/i);
    if (!match) return "";
    const months = "january february march april may june july august september october november december".split(" ");
    date = `${match[3]}-${String(months.indexOf(match[2].toLowerCase()) + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && date <= today ? date : "";
}
module.exports = { plain, captureDate };
