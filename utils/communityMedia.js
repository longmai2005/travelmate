const mongoose = require("mongoose"), sharp = require("sharp");
const { fail } = require("./validation");
sharp.cache({ memory: 8, files: 0, items: 16 });
sharp.concurrency(1);
let processing = 0;
const Quota = mongoose.models.MediaQuota || mongoose.model("MediaQuota", new mongoose.Schema({ _id: String, bytes: { type: Number, default: 0 } }));
const Media = require("../models/CommunityMedia");
const limits = { global: 32 * 1024 * 1024, user: 3 * 1024 * 1024 };
async function adjust(key, bytes, max) {
  await Quota.updateOne({ _id: key }, { $setOnInsert: { bytes: 0 } }, { upsert: true }).catch(e => { if (e.code !== 11000) throw e; });
  const row = await Quota.findOneAndUpdate({ _id: key, bytes: { $lte: max - bytes } }, { $inc: { bytes } });
  if (!row) fail("Kho ảnh đã đạt hạn mức. Gửi đánh giá không kèm ảnh hoặc bỏ ảnh cũ trước.", 413);
}
async function upload(encoded, userId) {
  if (typeof encoded !== "string" || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(encoded) || encoded.length > 2800000) fail("Chọn ảnh JPEG, PNG hoặc WebP dưới 2 MB.");
  if (processing >= 2) fail("Máy chủ đang xử lý ảnh. Vui lòng thử lại sau ít giây.", 429);
  processing++;
  let data;
  try {
    const input = Buffer.from(encoded.slice(encoded.indexOf(",") + 1), "base64");
    if (input.length > 2 * 1024 * 1024) fail("Ảnh vượt 2 MB.");
    const image = sharp(input, { limitInputPixels: 20000000, failOn: "warning", animated: false });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages || 1) !== 1) fail("Chỉ nhận ảnh tĩnh JPEG, PNG hoặc WebP.");
    data = await image.rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
  } catch { fail("Không đọc được ảnh hoặc ảnh quá lớn. Hãy chọn một ảnh tĩnh khác."); }
  finally { processing--; }
  if (data.length > 300 * 1024) fail("Ảnh còn quá lớn sau khi nén. Hãy chọn ảnh nhỏ hơn.");
  await adjust("global", data.length, limits.global);
  try { await adjust(`user:${userId}`, data.length, limits.user); }
  catch (error) { await Quota.updateOne({ _id: "global" }, { $inc: { bytes: -data.length } }); throw error; }
  try { return await Media.create({ userId, data, bytes: data.length }); }
  catch (error) { await releaseQuota(userId, data.length); throw error; }
}
async function releaseQuota(userId, bytes) {
  await Promise.all(["global", `user:${userId}`].map(_id => Quota.updateOne({ _id }, { $inc: { bytes: -bytes } })));
}
async function remove(id) {
  if (!id) return;
  const media = await Media.findOneAndDelete({ _id: id });
  if (media) await releaseQuota(media.userId, media.bytes);
}
module.exports = { upload, remove };
