import "./style.css";

type Release = {
  id: string; name: string; version: string; build?: number; platform: string; channel?: string;
  releaseDate?: string; fileSize?: number; downloadUrl?: string | null; sha256?: string | null;
  releaseNotes?: string; mandatory?: boolean; status?: "draft" | "published" | "archived";
};
type ApiResult = { releases?: Release[]; release?: Release; downloadUrl?: string; fileSize?: number; sha256?: string; key?: string; error?: string; message?: string };
const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "hendy-store-admin-token";
const MAX_UPLOAD = 25 * 1024 * 1024;
let token = "";
let records: Release[] = [];
const $ = <T extends HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing admin element ${selector}`);
  return el;
};
function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function message(text: string, kind: "info" | "error" | "success" = "info") {
  const el = $("#admin-message"); el.textContent = text; el.className = `admin-message ${kind}`;
}
async function request(path: string, init: RequestInit = {}): Promise<ApiResult> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  let data: ApiResult = {};
  try { data = await response.json() as ApiResult; } catch {}
  if (!response.ok) throw new Error(data.error || data.message || `API error (${response.status})`);
  return data;
}
function size(bytes = 0) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"]; let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
function workspace(connected: boolean) {
  $("#admin-workspace").hidden = !connected;
  ($("#admin-token") as HTMLInputElement).disabled = connected;
  ($("#admin-login-form button[type=submit]") as HTMLButtonElement).hidden = connected;
  $("#admin-logout").hidden = !connected;
}
function render() {
  $("#admin-summary").textContent = `${records.length} bản ghi trong kho quản trị`;
  if (!records.length) {
    $("#release-list").innerHTML = '<p class="empty-releases">Chưa có release. Tạo bản phát hành đầu tiên bằng biểu mẫu ở trên.</p>';
    return;
  }
  $("#release-list").innerHTML = [...records].sort((a,b) => String(b.releaseDate || "").localeCompare(String(a.releaseDate || ""))).map(r => {
    const label = r.status === "published" ? "Đã xuất bản" : r.status === "archived" ? "Đã lưu trữ" : "Bản nháp";
    const next = r.status === "published" ? "draft" : "published";
    return `<article class="release-row"><div class="release-row-main"><b>${esc(r.name)} <span class="release-version">v${esc(r.version)}</span></b><span class="release-meta">${esc(r.platform)} · ${esc(r.channel || "stable")} · ${size(r.fileSize)}</span></div><span class="release-status status-${esc(r.status || "draft")}">${label}</span><div class="release-actions"><button class="button button-quiet button-small" data-action="${next}" data-id="${esc(r.id)}">${next === "published" ? "Xuất bản" : "Rút bản phát hành"}</button><button class="button button-danger button-small" data-action="delete" data-id="${esc(r.id)}">Xóa</button></div></article>`;
  }).join("");
}
async function refresh() {
  const data = await request("/api/admin/releases");
  records = Array.isArray(data.releases) ? data.releases : [];
  render();
}
async function login(candidate: string) {
  const data = await requestWithToken(candidate);
  token = candidate;
  sessionStorage.setItem(TOKEN_KEY, candidate);
  records = Array.isArray(data.releases) ? data.releases : [];
  workspace(true); render();
  message("Đã xác thực. Token được lưu trong session của tab hiện tại.", "success");
}
async function requestWithToken(candidate: string) {
  const response = await fetch(`${API_BASE}/api/admin/releases`, { headers: { Accept: "application/json", Authorization: `Bearer ${candidate}` } });
  let data: ApiResult = {};
  try { data = await response.json() as ApiResult; } catch {}
  if (!response.ok) throw new Error(data.error || data.message || `API error (${response.status})`);
  return data;
}
$("#admin-login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const candidate = ($("#admin-token") as HTMLInputElement).value.trim();
  if (!candidate) return;
  message("Đang xác thực…");
  try { await login(candidate); }
  catch (error) { token = ""; sessionStorage.removeItem(TOKEN_KEY); workspace(false); message((error as Error).message, "error"); }
});
$("#admin-logout").addEventListener("click", () => {
  token = ""; records = []; sessionStorage.removeItem(TOKEN_KEY); workspace(false); render();
  ($("#admin-token") as HTMLInputElement).value = ""; message("Đã kết thúc phiên quản trị.");
});
$("#release-file").addEventListener("change", () => {
  const file = ($("#release-file") as HTMLInputElement).files?.[0];
  if (file) ($("#release-form").elements.namedItem("fileSize") as HTMLInputElement).value = String(file.size);
});
$("#release-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const fields = new FormData(form);
  const file = ($("#release-file") as HTMLInputElement).files?.[0];
  const platform = String(fields.get("platform") || "windows");
  const payload: Record<string, unknown> = {
    name: String(fields.get("name") || "").trim(), version: String(fields.get("version") || "").trim(),
    build: Number(fields.get("build") || 0), platform, channel: String(fields.get("channel") || "stable"),
    status: String(fields.get("status") || "draft"), downloadUrl: String(fields.get("downloadUrl") || "").trim() || null,
    sha256: String(fields.get("sha256") || "").trim().toLowerCase() || null, fileSize: Number(fields.get("fileSize") || 0),
    mandatory: fields.get("mandatory") === "on", releaseNotes: String(fields.get("releaseNotes") || "").trim()
  };
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  button.disabled = true; button.textContent = "Đang lưu…";
  try {
    if (file) {
      if (file.size > MAX_UPLOAD) throw new Error("Tệp vượt quá 25 MiB. Tải lên R2 riêng rồi nhập URL HTTPS, SHA-256 và dung lượng.");
      message(`Đang tải ${file.name} lên R2…`);
      const upload = await request("/api/admin/uploads", { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-Filename": file.name, "X-Platform": platform }, body: file });
      payload.downloadUrl = upload.downloadUrl; payload.sha256 = upload.sha256; payload.fileSize = upload.fileSize; payload.r2Key = upload.key;
      (form.elements.namedItem("downloadUrl") as HTMLInputElement).value = String(upload.downloadUrl || "");
      (form.elements.namedItem("sha256") as HTMLInputElement).value = String(upload.sha256 || "");
      (form.elements.namedItem("fileSize") as HTMLInputElement).value = String(upload.fileSize || 0);
    }
    await request("/api/admin/releases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    message("Đã lưu release.", "success"); form.reset();
    (form.elements.namedItem("name") as HTMLInputElement).value = "Hendy Tools";
    (form.elements.namedItem("build") as HTMLInputElement).value = "0";
    (form.elements.namedItem("fileSize") as HTMLInputElement).value = "0";
    await refresh();
  } catch (error) { message((error as Error).message, "error"); }
  finally { button.disabled = false; button.textContent = "Lưu bản phát hành ↗"; }
});
$("#admin-refresh").addEventListener("click", async () => {
  try { await refresh(); message("Đã tải lại danh sách.", "success"); }
  catch (error) { message((error as Error).message, "error"); }
});
$("#release-list").addEventListener("click", async event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
  if (!button) return;
  const id = button.dataset.id || "", action = button.dataset.action;
  const release = records.find(r => r.id === id);
  if (!release) return;
  if (action === "delete" && !confirm(`Xóa ${release.name} v${release.version}? Tệp R2 liên quan có thể cũng bị xóa.`)) return;
  button.disabled = true;
  try {
    if (action === "delete") await request(`/api/admin/releases/${encodeURIComponent(id)}`, { method: "DELETE" });
    else await request(`/api/admin/releases/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action }) });
    message(action === "delete" ? "Đã xóa release." : action === "published" ? "Đã xuất bản." : "Đã rút khỏi cửa hàng.", "success");
    await refresh();
  } catch (error) { message((error as Error).message, "error"); }
  finally { button.disabled = false; }
});
workspace(false);
const saved = sessionStorage.getItem(TOKEN_KEY);
if (saved) void login(saved).catch(() => { sessionStorage.removeItem(TOKEN_KEY); token = ""; workspace(false); });
