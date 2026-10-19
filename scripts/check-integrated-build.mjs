import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = process.cwd();
const required = ["dist/index.html","dist/admin.html","dist/studio/index.html","dist/control-plane/index.html"];
for (const item of required) await access(resolve(root,item));
const store = await readFile(resolve(root,"dist/index.html"),"utf8");
if (!store.includes("/src/store.ts") && !store.includes("/assets/")) throw new Error("Store entry script is missing from the production page");
console.log("Integrated build check passed: " + required.join(", "));
