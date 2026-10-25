import React, { useCallback, useEffect, useState } from "react";

type AuthStatus = {
  success?: boolean;
  user?: { email?: string; authenticated?: boolean };
  bindings?: Record<string, boolean>;
  error?: string;
  message?: string;
};

const REQUIRED_BINDINGS = [
  ["CF_ACCESS_TEAM_DOMAIN", "Cloudflare Access team"],
  ["CF_ACCESS_AUD", "Access application audiences"],
  ["CF_ACCESS_ADMIN_EMAILS", "Admin allow-list"],
  ["RELEASE_PUBLISH_TOKEN", "Release publisher token"],
  ["CERTIFICATE_ENCRYPTION_KEY", "Certificate encryption key"],
  ["DB", "Cloudflare D1"],
  ["RELEASES", "Private release R2 bucket"],
  ["RATE_LIMITS", "Cloudflare KV rate limiting"],
] as const;

export function AutomationSecretsForm() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth", { credentials: "same-origin", headers: { Accept: "application/json" } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Không đọc được trạng thái xác thực.");
      setStatus(body);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : "Không đọc được trạng thái secrets.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const bindings = status?.bindings || {};
  const readyCount = REQUIRED_BINDINGS.filter(([key]) => bindings[key] === true).length;

  return <section className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">Automation & secrets</div>
        <h2 className="mt-2 text-lg font-extrabold">Cấu hình runtime và quyền truy cập</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Bảng này chỉ kiểm tra trạng thái binding và tên biến. Giá trị secret không được đọc hoặc hiển thị trong trình duyệt.</p>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-xl border border-white/[.12] px-4 py-2 text-xs font-bold hover:bg-white/[.05] disabled:opacity-50">{loading ? "Đang kiểm tra…" : "Làm mới trạng thái"}</button>
    </div>
    {status?.user?.email && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] p-3 text-xs text-emerald-200">Đã xác thực qua Cloudflare Access: {status.user.email}</p>}
    {error && <p role="status" className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">{error}</p>}
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      {REQUIRED_BINDINGS.map(([key, label]) => {
        const ready = bindings[key] === true;
        return <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-black/10 px-3 py-3">
          <div className="min-w-0"><div className="text-xs font-semibold text-slate-200">{label}</div><code className="mt-1 block break-all text-[10px] text-slate-500">{key}</code></div>
          <span className={"shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold " + (ready ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200")}>{ready ? "Sẵn sàng" : "Chưa cấu hình"}</span>
        </div>;
      })}
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[.07] pt-4 text-xs">
      <span className="text-slate-400">Trạng thái runtime: {readyCount}/{REQUIRED_BINDINGS.length} bindings sẵn sàng</span>
      <a href="https://github.com/ngogiaidy56-eng/hendy-server-app-store/settings/secrets/actions" target="_blank" rel="noreferrer" className="font-bold text-violet-300 hover:text-violet-200">Mở GitHub Actions secrets ↗</a>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-slate-500">Thay đổi secret phải thực hiện trong GitHub Actions hoặc Cloudflare Dashboard/Wrangler. Không gửi API token hay private key qua form này.</p>
  </section>;
}
