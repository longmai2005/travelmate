const Activity = require("../models/Activity");
module.exports = async function recordActivity(actor, action, target, detail = "") {
  try {
    await Activity.create({ actorId: actor._id, actorName: actor.fullName, action,
      targetId: target._id, targetLabel: target.title || target.name || target.fullName, detail });
  } catch {
    // The primary write has already succeeded; do not invite duplicate submissions.
    console.error("Không ghi được nhật ký hoạt động.");
  }
};
