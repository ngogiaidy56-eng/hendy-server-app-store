import { access, stat } from "node:fs/promises";
const required = ["dist/index.html", "dist/admin.html", "dist/control-plane/index.html", "dist/studio/index.html"];
for (const file of required) { await access(file); const info = await stat(file); if (!info.isFile() || info.size < 100) throw new Error("Build output is missing or too small: " + file); }
console.log("Integrated build verified: storefront, release admin, control plane and studio.");