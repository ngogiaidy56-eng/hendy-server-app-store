import React, { useCallback, useEffect, useState } from "react";
import { Bot, Link2, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

type TelegramStatus = {
  success?: boolean;
  bot?: { username?: string; firstName?: string };
  webhook?: { url?: string; pendingUpdateCount?: number; lastErrorDate?: number | null; lastErrorMessage?: string | null };
};

export function TelegramBotPanel() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [setting, setSetting] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/telegram/status", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Không đọc được trạng thái Telegram.");
      setStatus(body);
    } catch (error) {
      setStatus(null);
      setMessage(error instanceof Error ? error.message : "Telegram Bot chưa được cấu hình.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const registerWebhook = async () => {
    setSetting(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/telegram/set-webhook", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.success !== true) throw new Error(body.message || body.error || "Không thể đăng ký Telegram webhook.");
      setMessage("Đã đăng ký webhook cho @" + String(body.bot?.username || "bot") + ".");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng ký webhook thất bại.");
    } finally {
      setSetting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/10 text-sky-200"><Bot size={21} /></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[.18em] text-sky-300">Telegram integration</div>
            <h2 className="mt-1 text-lg font-extrabold">Hendy App Store Bot</h2>
            <p className="mt-1 text-sm text-slate-400">Token và webhook secret chỉ nằm trong Render Environment.</p>
          </div>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[.12] px-3 py-2 text-xs font-bold hover:bg-white/[.05] disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>
      {message && <p role="status" className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">{message}</p>}
      {status?.bot && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[.07] bg-black/10 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Bot</div>
            <div className="mt-1 text-sm font-bold text-slate-100">@{status.bot.username || "unknown"}</div>
          </div>
          <div className="rounded-xl border border-white/[.07] bg-black/10 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Pending updates</div>
            <div className="mt-1 text-sm font-bold text-slate-100">{status.webhook?.pendingUpdateCount ?? 0}</div>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-white/[.07] bg-black/10 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Webhook URL</div>
            <div className="mt-1 break-all text-xs text-slate-300">{status.webhook?.url || "Chưa đăng ký webhook"}</div>
            {status.webhook?.lastErrorMessage && <p className="mt-2 flex items-start gap-2 text-xs text-amber-300"><TriangleAlert size={13} /> {status.webhook.lastErrorMessage}</p>}
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void registerWebhook()} disabled={setting}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-sky-400 disabled:opacity-50">
          <Link2 size={14} /> {setting ? "Đang đăng ký…" : "Đăng ký webhook"}
        </button>
        <span className="inline-flex items-center gap-2 rounded-xl border border-white/[.08] px-3 py-2 text-[11px] text-slate-400">
          <ShieldCheck size={13} /> Webhook được xác thực bằng secret header
        </span>
      </div>
    </section>
  );
}
