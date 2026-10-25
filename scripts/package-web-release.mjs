import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import JSZip from "jszip";

const version = String(process.env.RELEASE_VERSION || "").trim();
const releaseNotes = String(process.env.RELEASE_NOTES || "").trim().slice(0, 2000);
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("RELEASE_VERSION must be SemVer, for example 1.2.3.");
}
const distDir = resolve("dist");
const indexStat = await stat(join(distDir, "index.html")).catch(() => null);
if (!indexStat?.isFile()) throw new Error('dist/index.html not found. Run "npm run build" first.');

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolute = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Symlinks are not allowed in the release bundle.");
    if (entry.isDirectory()) result.push(...await listFiles(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result.sort();
}
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const zip = new JSZip();
const checksumLines = [];
const manifestFiles = [];
for (const absolute of await listFiles(distDir)) {
  const path = relative(distDir, absolute).split("\\").join("/");
  const bytes = await readFile(absolute);
  const fileHash = hash(bytes);
  zip.file("site/" + path, bytes);
  manifestFiles.push({ path: "site/" + path, sizeBytes: bytes.byteLength, sha256: fileHash });
  checksumLines.push(fileHash + "  site/" + path);
}
const manifest = {
  schemaVersion: "1.0.0",
  app: { name: "Hendy Store Web", slug: "hendy-store-web", version, platform: "web", channel: "stable" },
  package: { type: "web-distribution-zip", compiledFrom: "dist/", nativeBinaryBuilt: false, signatureStatus: "not-signed" },
  generatedAt: new Date().toISOString(),
  releaseNotes,
  fileCount: manifestFiles.length,
  files: manifestFiles,
};
zip.file("release-manifest.json", JSON.stringify(manifest, null, 2));
zip.file("checksums.sha256", checksumLines.join("\n") + "\n");
zip.file("README-RELEASE.txt",
  "Hendy Store Web v" + version + "\n\n" +
  "This ZIP contains the compiled static web distribution under site/.\n" +
  "Manifest: release-manifest.json\nChecksums: checksums.sha256\n" +
  "This is a web distribution bundle, not a native installer.\n"
);
const outDir = resolve(process.env.RELEASE_OUTPUT_DIR || "release-artifacts");
await mkdir(outDir, { recursive: true });
const filename = "hendy-store-web-v" + version + ".zip";
const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 8 } });
if (archive.byteLength > 25 * 1024 * 1024) throw new Error("ZIP exceeds the Worker direct-upload limit of 25 MB.");
const outPath = join(outDir, filename);
await writeFile(outPath, archive);
const archiveHash = hash(archive);
await writeFile(outPath + ".sha256", archiveHash + "  " + filename + "\n", "utf8");
await writeFile(join(outDir, "release-summary.json"), JSON.stringify({
  ...manifest,
  artifact: { filename, sizeBytes: archive.byteLength, sha256: archiveHash },
  artifactPath: outPath,
}, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ success: true, filename, artifactPath: outPath, sizeBytes: archive.byteLength, sha256: archiveHash, sourceFiles: manifestFiles.length }, null, 2));
