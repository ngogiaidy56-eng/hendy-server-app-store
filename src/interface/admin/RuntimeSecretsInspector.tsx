/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin-only diagnostics. The API returns booleans only; secret values are
 * never read into this component or sent back to the browser.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Activity, Check, Copy, Database, KeyRound, RefreshCw, ShieldCheck
} from "lucide-react";
import {
  RuntimeConfig,
  resolveRuntimeConfig,
  generateRenderEnvironmentGuide
} from "../../utils/runtimeEnv.ts";

type RuntimeChecks = {
  hasAdminUsername?: boolean;
  hasAdminPassword?: boolean;
  hasAdminEmail?: boolean;
  hasReleasePublishToken?: boolean;
  hasCertificateEncryptionKey?: boolean;
  hasTelegramBotToken?: boolean;
  hasTelegramWebhookSecret?: boolean;
  hasDatabaseUrl?: boolean;
  hasPostgres?: boolean;
  hasObjectStorage?: boolean;
  hasRateLimiting?: boolean;
};

const CHECKS: Array<{ key: keyof RuntimeChecks; label: string; description: string }> = [
  { key: "hasAdminUsername", label: "Admin username", description: "Thông tin đăng nhập Admin đã được khai báo" },
  { key: "hasAdminPassword", label: "Admin password", description: "Mật khẩu ở Render Environment, không được đọc" },
  { key: "hasAdminEmail", label: "Admin email", description: "Danh tính quản trị dùng trong nhật ký" },
  { key: "hasDatabaseUrl", label: "DATABASE_URL", description: "Kết nối Render PostgreSQL" },
  { key: "hasPostgres", label: "PostgreSQL adapter", description: "Adapter truy vấn metadata và giao dịch" },
  { key: "hasObjectStorage", label: "Artifact storage", description: "Lưu byte artifact và chứng thư đã mã hóa trong PostgreSQL" },
  { key: "hasRateLimiting", label: "Rate limiting", description: "Bộ đếm giới hạn request lưu trong PostgreSQL" },
  { key: "hasReleasePublishToken", label: "Release publisher token", description: "Bearer token cho CI publish" },
  { key: "hasCertificateEncryptionKey", label: "Certificate encryption key", description: "Khóa AES-GCM Base64 32 byte" },
  { key: "hasTelegramBotToken", label: "Telegram Bot token", description: "Tùy chọn: token bot được giữ ở server" },
  { key: "hasTelegramWebhookSecret", label: "Telegram webhook secret", description: "Tùy chọn: secret xác thực webhook" }
];

export const RuntimeSecretsInspector: React.FC = () => {
  const [config, setConfig] = useState<RuntimeConfig>(resolveRuntimeConfig());
  const [checks, setChecks] = useState<RuntimeChecks>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/runtime-config", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Không đọc được trạng thái Render runtime (HTTP " + response.status + ").");
      }
      if (data.config || data.data) setConfig((previous) => ({ ...previous, ...(data.config || data.data) }));
      setChecks(data.secrets || {});
      setLoaded(true);
    } catch (cause) {
      setLoaded(false);
      setError(cause instanceof Error ? cause.message : "Không thể kiểm tra Render runtime.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const guide = generateRenderEnvironmentGuide(config);
  const copyGuide = async () => {
    try {
      await navigator.clipboard.writeText(guide);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Trình duyệt không cho phép sao chép. Hãy chọn và sao chép nội dung hướng dẫn.");
    }
  };

  const configured = CHECKS.filter((item) => checks[item.key] === true).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Render Runtime & Secrets</h3>
              <p className="mt-1 text-xs text-slate-400">Chỉ hiển thị trạng thái cấu hình, không tiết lộ giá trị bí mật.</p>
            </div>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50">
            <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} />
            {loading ? "Đang kiểm tra…" : "Làm mới"}
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] text-slate-500">Provider</div>
            <div className="mt-1 text-sm font-semibold text-emerald-300">{config.deploymentProvider}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] text-slate-500">Runtime</div>
            <div className="mt-1 text-sm font-semibold text-slate-200">Node.js + Express</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] text-slate-500">Database</div>
            <div className="mt-1 text-sm font-semibold text-slate-200">Render PostgreSQL</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] text-slate-500">Runtime checks</div>
            <div className="mt-1 text-sm font-semibold text-slate-200">{loaded ? configured + "/" + CHECKS.length : "Chưa kiểm tra"}</div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-violet-300" />
          <h4 className="text-sm font-semibold text-slate-100">Trạng thái Environment</h4>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">{error}</p>}
        {!loaded && !error && <p className="mt-4 text-xs text-slate-400">Nhấn “Làm mới” để đọc trạng thái từ Render API sau khi xác thực Admin.</p>}
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {CHECKS.map((item) => {
            const ready = loaded && checks[item.key] === true;
            return (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200">{item.label}</div>
                  <p className="mt-1 text-[11px] text-slate-500">{item.description}</p>
                </div>
                <span className={"shrink-0 rounded px-2 py-1 text-[10px] font-bold " + (ready ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-800 text-slate-400")}>
                  {ready ? "Đã cấu hình" : loaded ? "Thiếu" : "Chưa rõ"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-300" />
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Render Environment Guide</h4>
              <p className="mt-1 text-xs text-slate-400">Hướng dẫn chỉ chứa tên biến, không chứa secret values.</p>
            </div>
          </div>
          <button type="button" onClick={() => void copyGuide()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Đã sao chép" : "Sao chép"}
          </button>
        </div>
        <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-emerald-200">{guide}</pre>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">Thay đổi giá trị secrets tại Render Dashboard → Web Service → Environment. Không nhập mật khẩu, token hoặc khóa mã hóa vào form web này.</p>
      </section>

      <p className="flex items-center gap-2 text-[11px] text-slate-500"><Activity className="h-3.5 w-3.5" /> Dữ liệu kiểm tra được trả về từ server; giao diện không tự suy đoán secrets tồn tại.</p>
    </div>
  );
};
