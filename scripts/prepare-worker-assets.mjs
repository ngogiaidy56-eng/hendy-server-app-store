import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const builtDirectory = resolve(root, "dist");
const workerDirectory = resolve(root, ".worker-dist");
const builtIndex = resolve(builtDirectory, "index.html");
const builtAdmin = resolve(builtDirectory, "admin.html");

if (!existsSync(builtIndex) || !existsSync(builtAdmin)) {
  throw new Error('Missing dist/index.html or dist/admin.html. Run "npm run build" before deploying the Worker.');
}

rmSync(workerDirectory, { recursive: true, force: true });
cpSync(builtDirectory, workerDirectory, { recursive: true });

// Workers Static Assets uses Wrangler's SPA fallback and Worker response headers;
// Pages-only routing/header manifest files are not required in the Worker bundle.
for (const name of ["_redirects", "_headers"]) {
  const generatedManifest = resolve(workerDirectory, name);
  if (existsSync(generatedManifest)) rmSync(generatedManifest);
}

console.log("Prepared Worker Static Assets in .worker-dist (Store and Admin entrypoints verified).");
