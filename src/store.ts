import "./style.css";

type Platform = "windows" | "android" | "ios";
type Release = {
  id: string; name: string; version: string; build?: number; platform: Platform;
  channel?: string; releaseDate?: string; fileSize?: number; downloadUrl?: string | null;
  sha256?: string | null; releaseNotes?: string; status?: string; mandatory?: boolean;
};
type ReleaseResponse = { releases?: Release[]; error?: string; message?: string };
const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const apps: { id: Platform; name: string; subtitle: string; icon: string; detail: string }[] = [
  { id:"windows", name:"Hendy Tools for Windows", subtitle:"DESKTOP · X64", icon:"▣", detail:"Bộ công cụ Hendy cho máy tính Windows." },
  { id:"android", name:"Hendy Tools Mobile", subtitle:"ANDROID · APK", icon:"◉", detail:"Trải nghiệm các tiện ích Hendy trên Android." },
  { id:"ios", name:"Hendy Tools for iOS", subtitle:"IOS · MOBILE", icon:"◇", detail:"Thông tin phát hành iOS khi có gói hợp lệ." }
];
let releases: Release[] = [];
let activeFilter = "all";
const $ = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error("Missing UI element: " + selector);
  return element;
};
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
}
function validDownloadUrl(value?: string | null): boolean {
  try { return new URL(String(value || "")).protocol === "https:"; } catch { return false; }
}
function formatSize(bytes?: number): string {
  if (!bytes || bytes < 1) return "Chưa có gói tải";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(i ? 1 : 0) + " " + units[i];
}
function renderApps(): void {
  const filtered = apps.filter(app => activeFilter === "all" || app.id === activeFilter);
  $("#app-grid").innerHTML = filtered.map(app => {
    const candidates = releases.filter(r => r.platform === app.id && (r.status === undefined || r.status === "published"));
    candidates.sort((a,b) => Number(b.build || 0) - Number(a.build || 0) || String(b.releaseDate || "").localeCompare(String(a.releaseDate || "")));
    const release = candidates[0];
    const available = Boolean(release && validDownloadUrl(release.downloadUrl));
    const version = release ? "v" + escapeHtml(release.version) : "Chưa phát hành";
    const link = available ? '<a class="button button-small button-primary" href="' + escapeHtml(release!.downloadUrl) + '" target="_blank" rel="noopener noreferrer">Tải xuống ↗</a>' : '<button class="button button-small button-disabled" disabled>Chưa có tệp</button>';
    const hash = release && release.sha256 ? '<details class="hash-details"><summary>SHA-256</summary><code>' + escapeHtml(release.sha256) + '</code></details>' : "";
    const notes = release && release.releaseNotes ? '<p class="release-notes">' + escapeHtml(release.releaseNotes) + '</p>' : "";
    return '<article class="app-card"><div class="app-card-top"><span class="app-icon">' + app.icon + '</span><span class="platform-tag">' + app.subtitle + '</span></div><h3>' + app.name + '</h3><p>' + app.detail + '</p><div class="app-version"><span>Phiên bản</span><b>' + version + '</b></div><div class="app-card-bottom"><span class="file-size">' + escapeHtml(formatSize(release?.fileSize)) + '</span>' + link + '</div>' + hash + notes + '</article>';
  }).join("");
}
async function loadData(): Promise<void> {
  const status = $("#api-status");
  status.textContent = "Đang kiểm tra…";
  status.classList.remove("healthy");
  try {
    const [health, catalog] = await Promise.all([
      fetch(API_BASE + "/api/health", { headers: { Accept:"application/json" } }),
      fetch(API_BASE + "/api/releases", { headers: { Accept:"application/json" } })
    ]);
    if (!health.ok || !catalog.ok) throw new Error("API response error");
    const payload = await catalog.json() as ReleaseResponse;
    releases = Array.isArray(payload.releases) ? payload.releases.filter(r => r.status === undefined || r.status === "published") : [];
    status.textContent = "Đang hoạt động";
    status.classList.add("healthy");
  } catch {
    releases = [];
    status.textContent = "Chưa kết nối API";
  }
  renderApps();
}
document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  activeFilter = button.dataset.filter || "all";
  renderApps();
}));
$("#refresh-status").addEventListener("click", () => void loadData());
$("#year").textContent = String(new Date().getFullYear());
renderApps();
void loadData();
