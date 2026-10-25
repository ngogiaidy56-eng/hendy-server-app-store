import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const builtDirectory = resolve(root, "dist");
const workerDirectory = resolve(root, ".worker-dist");
const builtIndex = resolve(builtDirectory, "index.html");

if (!existsSync(builtIndex)) {
  throw new Error('Missing dist/index.html. Run "npm run build" before deploying the Worker.');
}

// Keep the Pages build output intact. The Cloudflare Pages _redirects file
// contains a catch-all rewrite that Cloudflare Workers asset validation treats
// as a loop, while the Worker already uses not_found_handling="single-page-application".
rmSync(workerDirectory, { recursive: true, force: true });
cpSync(builtDirectory, workerDirectory, { recursive: true });

const workerRedirects = resolve(workerDirectory, "_redirects");
if (existsSync(workerRedirects)) {
  rmSync(workerRedirects);
  console.log("Removed Pages-only _redirects from Worker asset output.");
}

console.log("Prepared Worker static assets in .worker-dist.");
