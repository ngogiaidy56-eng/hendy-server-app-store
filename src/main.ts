import "./style.css";

type Platform = "windows" | "android" | "ios";
type ReleaseStatus = "draft" | "published" | "archived";
type Release = {
  id: string; name: string; version: string; build?: number; platform: Platform; channel?: string;
  releaseDate?: string; fileSize?: number; downloadUrl?: string | null; sha256?: string | null;
  releaseNotes?: string; mandatory?: boolean; status?: ReleaseStatus; r2Key?: string | null;
};
type ReleaseResponse = { success?: boolean; total?: number; releases?: Release[]; error?: string; message?: string; release?: Release; downloadUrl?: string; fileSize?: number; sha256?: string; key?: string; };
const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const ADMIN_TOKEN_KEY = "hendy-store-admin-token";
const MAX_DIRECT_UPLOAD = 25 * 1024 * 1024;
const apps: { id: Platform; name: string; subtitle: string; icon: string; detail: string }[] = [
  { id: "windows", name: "Hendy Tools for Windows", subtitle: "DESKTOP · X64", icon: "▣", detail: "Bộ công cụ tối ưu và quản lý cho máy tính Windows." },
  { id: "android", name: "Hendy Tools Mobile", subtitle: "ANDROID · APK", icon: "◉", detail: "Trải nghiệm công cụ Hendy trên thiết bị Android." },
  { id: "ios", name: "Hendy Tools for iOS", subtitle: "IOS · TESTFLIGHT", icon: "◇", detail: "Thông tin kênh thử nghiệm iOS khi có bản phát hành hợp lệ." }
];
let releases: Release[] = [];
let adminReleases: Release[] = [];
let activeFilter = "all";
let adminToken = "";
const $ = <T extends HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
};
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function apiUrl(path: string) { return `${API_BASE}${path}`; }
async function responseJson(response: Response): Promise<ReleaseResponse> {
  let payload: ReleaseResponse = {};
  try { payload = await response.json() as ReleaseResponse; } catch { /* response may be a proxy error page */ }
  if (!response.ok) throw new Error(payload.error || payload.message || `API error (${response.status})`);
  return payload;
}
async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = adminToken || sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}
function formatSize(bytes?: number): string {
  if (!bytes || bytes < 1) return "Chưa có gói tải";
  const units = ["B", "KB", "MB", "GB"]; let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
function isHttpsUrl(value?: string | null) {
  try { return new URL(String(value || "")).protocol === "https:"; } catch { return false; }
}
function newestFirst(list: Release[]) {
  return [...list].sort((a, b) => Number(b.build || 0) - Number(a.build || 0) || String(b.releaseDate || "").localeCompare(String(a.releaseDate || "")));
}
function renderApps() {
  const filtered = apps.filter(app => activeFilter === "all" || app.id === activeFilter);
  $("#app-grid").innerHTML = filtered.map(app => {
    const release = newestFirst(releases.filter(r => r.platform === app.id && (r.status === undefined || r.status === "published")))[0];
    const available = Boolean(release?.downloadUrl && isHttpsUrl(release.downloadUrl));
    const fileSize = release?.fileSize ? formatSize(release.fileSize) : "Chưa có gói tải";
    return `<article class="app-card">
      <div class="app-card-top"><span class="app-icon">${app.icon}</span><span class="platform-tag">${app.subtitle}</span></div>
      <h3>${app.name}</h3><p>${app.detail}</p>
      <div class="app-version"><span>Phiên bản</span><b>${release ? escapeHtml(release.version) : "Chưa phát hành"}</b></div>
      <div class="app-card-bottom"><span class="file-size">${escapeHtml(fileSize)}</span>
      ${available ? `<a class="button button-small button-primary" href="${escapeHtml(release!.downloadUrl)}" target="_blank" rel="noopener noreferrer">Tải xuống ↗</a>` : `<button class="button button-small button-disabled" disabled>Chưa có tệp</button>`}</div>
      ${release?.sha256 ? `<details class="hash-details"><summary>SHA-256</summary><code>${escapeHtml(release.sha256)}</code></details>` : ""}
      ${release?.releaseNotes ? `<p class="release-notes">${escapeHtml(release.releaseNotes)}</p>` : ""}
    </article>`;
  }).join("");
}
async function loadData() {
  const status = $("#api-status");
  status.textContent = "Đang kiểm tra…";
  status.classList.remove("healthy");
  try {
    const [health, releaseResponse] = await Promise.all([
      fetch(apiUrl("/api/health"), { headers: { accept: "application/json" } }),
      fetch(apiUrl("/api/releases"), { headers: { accept: "application/json" } })
    ]);
    if (!health.ok || !releaseResponse.ok) throw new Error("API response error");
    const releaseData = await releaseResponse.json() as ReleaseResponse;
    releases = Array.isArray(releaseData.releases) ? releaseData.releases.filter(r => r.status === undefined || r.status === "published") : [];
    status.textContent = "Đang hoạt động"; status.classList.add("healthy");
    $("#admin-summary").textContent = `${releases.length} bản phát hành công khai · ${new Set(releases.map(r => r.platform)).size} nền tảng`;
  } catch {
    releases = []; status.textContent = "Chưa kết nối API";
    $("#admin-summary").textContent = "Không lấy được dữ liệu API. Kiểm tra VITE_API_BASE_URL và endpoint /api/health.";
  }
  renderApps();
}
function showAdminMessage(message: string, type: "error" | "success" | "info" = "info") {
  const element = $("#admin-message");
  element.textContent = message;
  element.className = `admin-message ${type}`;
}
function setAdminWorkspace(connected: boolean) {
  $("#admin-workspace").hidden = !connected;
  $("#admin-logout").hidden = !connected;
  ($("#admin-token") as HTMLInputElement).disabled = connected;
  const connectButton = $("#admin-login-form button[type='submit']") as HTMLButtonElement;
  connectButton.hidden = connected;
}
function renderAdminReleases() {
  const list = $("#release-list");
  if (!adminReleases.length) {
    list.innerHTML = '<p class="empty-releases">Chưa có bản phát hành nào. Tạo bản đầu tiên bằng biểu mẫu ở trên.</p>';
    return;
  }
  list.innerHTML = adminReleases.map(release => {
    const statusLabel = release.status === "published" ? "Đã xuất bản" : release.status === "archived" ? "Đã lưu trữ" : "Bản nháp";
    const action = release.status === "published" ? "draft" : "published";
    const actionLabel = release.status === "published" ? "Rút bản phát hành" : "Xuất bản";
    return `<article class="release-row">
      <div class="release-row-main"><b>${escapeHtml(release.name)} <span class="release-version">v${escapeHtml(release.version)}</span></b>
      <span class="release-meta">${escapeHtml(release.platform)} · ${escapeHtml(release.channel || "stable")} · ${escapeHtml(formatSize(release.fileSize))}</span></div>
      <span class="release-status status-${escapeHtml(release.status || "draft")}">${statusLabel}</span>
      <div class="release-actions"><button class="button button-quiet button-small" data-release-action="${action}" data-release-id="${escapeHtml(release.id)}">${actionLabel}</button>
      <button class="button button-danger button-small" data-release-action="delete" data-release-id="${escapeHtml(release.id)}">Xóa</button></div>
    </article>`;
  }).join("");
}
async function loadAdminReleases() {
  const response = await apiFetch("/api/admin/releases");
  const data = await responseJson(response);
  adminReleases = Array.isArray(data.releases) ? data.releases : [];
  renderAdminReleases();
  $("#admin-summary").textContent = `${releases.length} bản công khai · ${adminReleases.length} tổng bản ghi trong kho quản trị`;
}
async function connectAdmin(candidate: string) {
  const response = await fetch(apiUrl("/api/admin/releases"), { headers: { Accept: "application/json", Authorization: `Bearer ${candidate}` } });
  const data = await responseJson(response);
  adminToken = candidate;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, candidate);
  adminReleases = Array.isArray(data.releases) ? data.releases : [];
  setAdminWorkspace(true);
  renderAdminReleases();
  showAdminMessage("Đã xác thực quản trị. Token chỉ được lưu trong session hiện tại của trình duyệt.", "success");
  await loadData();
}
document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
  button.classList.add("active"); activeFilter = button.dataset.filter || "all"; renderApps();
}));
$("#refresh-status").addEventListener("click", () => void loadData());
$("#admin-toggle").addEventListener("click", () => { $("#admin-panel").hidden = false; $("#admin-panel").scrollIntoView({ behavior: "smooth" }); });
$("#close-admin").addEventListener("click", () => { $("#admin-panel").hidden = true; });
$("#admin-login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const candidate = ($("#admin-token") as HTMLInputElement).value.trim();
  if (!candidate) return;
  showAdminMessage("Đang xác thực token…");
  try { await connectAdmin(candidate); }
  catch (error) { adminToken = ""; sessionStorage.removeItem(ADMIN_TOKEN_KEY); setAdminWorkspace(false); showAdminMessage((error as Error).message, "error"); }
});
$("#admin-logout").addEventListener("click", () => {
  adminToken = ""; sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  adminReleases = []; renderAdminReleases(); setAdminWorkspace(false); showAdminMessage("Đã thoát khỏi bảng quản trị.");
  ($("#admin-token") as HTMLInputElement).value = "";
});
$("#release-file").addEventListener("change", () => {
  const file = ($("#release-file") as HTMLInputElement).files?.[0];
  const form = $("#release-form") as HTMLFormElement;
  const size = form.elements.namedItem("fileSize") as HTMLInputElement;
  if (file) size.value = String(file.size);
});
$("#release-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const fields = new FormData(form);
  const file = ($("#release-file") as HTMLInputElement).files?.[0];
  const platform = String(fields.get("platform") || "windows");
  const payload: Record<string, unknown> = {
    name: String(fields.get("name") || "").trim(),
    version: String(fields.get("version") || "").trim(),
    build: Number(fields.get("build") || 0),
    platform,
    channel: String(fields.get("channel") || "stable"),
    status: String(fields.get("status") || "draft"),
    downloadUrl: String(fields.get("downloadUrl") || "").trim() || null,
    sha256: String(fields.get("sha256") || "").trim().toLowerCase() || null,
    fileSize: Number(fields.get("fileSize") || 0),
    mandatory: fields.get("mandatory") === "on",
    releaseNotes: String(fields.get("releaseNotes") || "").trim()
  };
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  submitButton.disabled = true; submitButton.textContent = "Đang lưu…";
  try {
    if (file) {
      if (file.size > MAX_DIRECT_UPLOAD) throw new Error("Tệp vượt quá 25 MiB. Hãy tải gói lớn lên R2 riêng rồi nhập URL HTTPS, SHA-256 và dung lượng byte.");
      showAdminMessage(`Đang tải ${file.name} lên R2 và tính SHA-256…`);
      const uploadResponse = await apiFetch("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "X-Filename": file.name, "X-Platform": platform },
        body: file
      });
      const upload = await responseJson(uploadResponse);
      payload.downloadUrl = upload.downloadUrl;
      payload.sha256 = upload.sha256;
      payload.fileSize = upload.fileSize;
      payload.r2Key = upload.key;
      (form.elements.namedItem("downloadUrl") as HTMLInputElement).value = String(upload.downloadUrl || "");
      (form.elements.namedItem("sha256") as HTMLInputElement).value = String(upload.sha256 || "");
      (form.elements.namedItem("fileSize") as HTMLInputElement).value = String(upload.fileSize || 0);
    }
    const response = await apiFetch("/api/admin/releases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await responseJson(response);
    showAdminMessage("Đã lưu bản phát hành.", "success");
    form.reset();
    (form.elements.namedItem("name") as HTMLInputElement).value = "Hendy Tools";
    (form.elements.namedItem("build") as HTMLInputElement).value = "0";
    (form.elements.namedItem("fileSize") as HTMLInputElement).value = "0";
    await Promise.all([loadAdminReleases(), loadData()]);
  } catch (error) { showAdminMessage((error as Error).message, "error"); }
  finally { submitButton.disabled = false; submitButton.textContent = "Lưu bản phát hành ↗"; }
});
$("#admin-refresh").addEventListener("click", async () => {
  try { await loadAdminReleases(); showAdminMessage("Đã tải lại danh sách quản trị.", "success"); }
  catch (error) { showAdminMessage((error as Error).message, "error"); }
});
$("#release-list").addEventListener("click", async event => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>("[data-release-action]");
  if (!button) return;
  const id = button.dataset.releaseId || "";
  const action = button.dataset.releaseAction;
  const release = adminReleases.find(item => item.id === id);
  if (!release) return;
  if (action === "delete" && !window.confirm(`Xóa bản phát hành ${release.name} v${release.version}? Nếu tệp nằm trong R2, hệ thống cũng sẽ thử xóa tệp.`)) return;
  button.disabled = true;
  try {
    if (action === "delete") await responseJson(await apiFetch(`/api/admin/releases/${encodeURIComponent(id)}`, { method: "DELETE" }));
    else await responseJson(await apiFetch(`/api/admin/releases/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action }) }));
    showAdminMessage(action === "delete" ? "Đã xóa bản phát hành." : action === "published" ? "Đã xuất bản release." : "Đã rút release khỏi danh mục công khai.", "success");
    await Promise.all([loadAdminReleases(), loadData()]);
  } catch (error) { showAdminMessage((error as Error).message, "error"); }
  finally { button.disabled = false; }
});
$("#year").textContent = String(new Date().getFullYear());
setAdminWorkspace(false);
const existingToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
if (existingToken) {
  void connectAdmin(existingToken).catch(() => { sessionStorage.removeItem(ADMIN_TOKEN_KEY); adminToken = ""; setAdminWorkspace(false); });
}
renderApps();
void loadData();
