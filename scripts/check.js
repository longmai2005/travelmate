const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", ".agents", ".codex"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) check(path);
    else if (path.endsWith(".js")) {
      const result = spawnSync(process.execPath, ["--check", path], { stdio: "inherit" });
      if (result.status !== 0) process.exit(1);
    }
  }
}
check(process.cwd());
console.log("Cú pháp JavaScript hợp lệ.");
