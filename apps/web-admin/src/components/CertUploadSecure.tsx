import React, { useCallback, useEffect, useState } from "react";

type CertificateRecord = {
  id: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
};

export function CertUploadSecure() {
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<CertificateRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/certificates", { credentials: "same-origin", headers: { Accept: "application/json" } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Không tải được danh sách chứng thư.");
      setRecords(Array.isArray(body.certificates) ? body.certificates : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được danh sách chứng thư.");
    }
  }, []);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const upload = async () => {
    if (!file) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const response = await fetch("/api/v1/admin/certificates", {
        method: "POST", credentials: "same-origin", body: form
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || ("Upload thất bại: HTTP " + response.status));
      setMessage("Đã lưu chứng thư ở dạng mã hóa. Tệp gốc không được cung cấp đường dẫn tải công khai.");
      setFile(null);
      await loadRecords();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải chứng thư lên.");
    } finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6">
    <div className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">Certificate vault</div>
    <h2 className="mt-2 text-lg font-extrabold">Nạp chứng thư và hồ sơ ký số</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">Hỗ trợ .p12, .pfx, .cer, .crt và .mobileprovision. Mã hóa AES-GCM phía server trước khi ghi vào R2 riêng tư; không có API tải tệp chứng thư gốc.</p>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
      <input type="file" accept=".p12,.pfx,.cer,.crt,.mobileprovision" onChange={(event) => setFile(event.target.files?.[0] || null)} className="min-w-0 flex-1 rounded-xl border border-white/[.1] bg-[#0b0c12] px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"/>
      <button type="button" onClick={() => void upload()} disabled={!file || busy || (file?.size ?? 0) < 1 || (file?.size ?? 0) > 20 * 1024 * 1024} className="rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-violet-400 disabled:opacity-40">{busy ? "Đang mã hóa và tải…" : "Tải chứng thư an toàn"}</button>
    </div>
    {file && <p className="mt-2 text-[11px] text-slate-500">Đã chọn: {file.name} · {(file.size / 1024).toFixed(1)} KB · tối đa 20 MB</p>}
    {message && <p role="status" className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[.05] p-3 text-xs text-emerald-200">{message}</p>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{error}</p>}
    <div className="mt-5 border-t border-white/[.07] pt-4">
      <div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-300">Danh mục chứng thư (metadata)</span><button type="button" onClick={() => void loadRecords()} className="text-[10px] font-bold text-violet-300">Làm mới</button></div>
      {records.length ? <div className="space-y-2">{records.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[.06] px-3 py-3"><div className="min-w-0"><div className="break-all text-xs font-semibold text-slate-200">{item.fileName}</div><div className="mt-1 text-[10px] text-slate-500">{new Date(item.uploadedAt).toLocaleString("vi-VN")} · {(item.sizeBytes / 1024).toFixed(1)} KB</div></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300">Mã hóa · Không công khai</span></div>)}</div>
        : <p className="text-xs text-slate-500">Chưa có metadata chứng thư hoặc API chưa cấu hình.</p>}
    </div>
  </section>;
}
