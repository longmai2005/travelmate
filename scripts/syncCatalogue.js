require("dotenv").config({ quiet: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");
const connect = require("../config/database");
const Destination = require("../models/Destination");
const catalogue = require("../data/destinations");
const planChanges = require("../utils/catalogueSync");
async function main() {
  await connect();
  const existing = await Destination.find().select("+searchText").lean();
  const plan = planChanges(existing, catalogue);
  const apply = process.argv.includes("--apply");
  console.log(JSON.stringify({ mode: apply ? "apply" : "preview", host: mongoose.connection.host, database: mongoose.connection.name, insert: plan.inserts.length, update: plan.updates.length, protectedFields: plan.protectedFields.length }));
  if (!apply) return;
  await fs.mkdir(path.resolve(__dirname, "../.data"), { recursive: true });
  const backup = path.resolve(__dirname, `../.data/catalogue-backup-${Date.now()}.json`);
  await fs.writeFile(backup, JSON.stringify(existing, null, 2), { mode: 0o600 });
  for (const destination of plan.inserts) await Destination.updateOne({ slug: destination.slug }, { $setOnInsert: destination }, { upsert: true, runValidators: true });
  let modified = 0;
  for (const operation of plan.updates) {
    const result = await Destination.updateOne(operation.filter, { $set: operation.patch }, { runValidators: true });
    if (!result.matchedCount) throw new Error(`Địa điểm ${operation.slug} vừa được chỉnh sửa. Chạy lại chế độ xem trước, không ghi đè.`);
    modified += result.modifiedCount;
  }
  console.log(JSON.stringify({ insertedCandidates: plan.inserts.length, modified, backup, total: await Destination.countDocuments() }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
