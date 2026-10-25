import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { AutomationSecretsForm } from '../../../apps/web-admin/src/components/AutomationSecretsForm.tsx';
import { CertUploadSecure } from '../../../apps/web-admin/src/components/CertUploadSecure.tsx';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Boxes, Check, CheckCircle2,
  ChevronRight, CircleAlert, CloudUpload, Code2, Cpu, FileArchive, FileCode2,
  FileText, FolderOpen, Gauge, GitBranch, Github, History, LayoutDashboard,
  LoaderCircle, LockKeyhole, Monitor, Package, Rocket, Settings, ShieldCheck,
  Smartphone, Terminal, Trash2, Upload, X, Zap, Store, ExternalLink
} from 'lucide-react';

type ViewKey = 'overview' | 'builder' | 'releases' | 'storefront' | 'settings';
type Platform = 'web' | 'windows' | 'android' | 'ios' | 'macos' | 'linux';
type SourceEntry = { path: string; blob: Blob; size: number };
type PublishedRelease = {
  key: string;
  appName: string;
  appSlug: string;
  version: string;
  platform: Platform | string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  publishedAt: string;
  releaseNotes: string;
  downloadUrl: string;
};
type BuiltBundle = { file: File; sha256: string; manifest: Record<string, unknown> };

const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
const PLATFORM_OPTIONS: { value: Platform; label: string; detail: string; icon: React.ElementType }[] = [
  { value: 'web', label: 'Web / ZIP nguồn', detail: 'Gói nguồn và manifest', icon: Code2 },
  { value: 'windows', label: 'Windows', detail: 'EXE / MSI phải build trên runner Windows', icon: Monitor },
  { value: 'android', label: 'Android', detail: 'APK / AAB cần Android SDK', icon: Smartphone },
  { value: 'ios', label: 'iOS', detail: 'IPA cần Xcode và chứng thư Apple', icon: Smartphone },
  { value: 'macos', label: 'macOS', detail: 'DMG / PKG cần macOS runner', icon: Monitor },
  { value: 'linux', label: 'Linux', detail: 'AppImage / DEB cần Linux toolchain', icon: Terminal }
];

function toSlug(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
function safePath(value: string): string | null {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return null;
  if (normalized.split('/').some((part) => part === '..' || part === '')) return null;
  return normalized;
}
async function digestSha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function byteLabel(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
function safeDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

export default function StudioWorkspace({ onReturnToStore }: { onReturnToStore: () => void }) {
  const [view, setView] = useState<ViewKey>('overview');
  const [appName, setAppName] = useState('Hendy Tools');
  const [appSlug, setAppSlug] = useState('hendy-tools');
  const [version, setVersion] = useState('1.0.0');
  const [platform, setPlatform] = useState<Platform>('web');
  const [releaseNotes, setReleaseNotes] = useState('Bản phát hành mới.');
  const [sourceEntries, setSourceEntries] = useState<SourceEntry[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [bundle, setBundle] = useState<BuiltBundle | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const defaultStoreConfig = { brandName: 'Hendy Store', announcement: '', heroEyebrow: 'ỨNG DỤNG · CÔNG CỤ · BẢN PHÁT HÀNH', heroTitle: 'Tất cả ứng dụng', heroAccent: 'trong một nơi.', heroDescription: 'Khám phá ứng dụng và tải xuống các bản phát hành thật, với thông tin phiên bản và mã kiểm tra tệp rõ ràng.', supportUrl: '', repositoryUrl: 'https://github.com/ngogiaidy56-eng/hendy-server-app-store' };
  const [storeConfig, setStoreConfig] = useState(defaultStoreConfig);
  const [storeConfigDirty, setStoreConfigDirty] = useState(false);
  const [releases, setReleases] = useState<PublishedRelease[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [adminStatus, setAdminStatus] = useState<any>(null);
  const [search, setSearch] = useState('');

  const sourceBytes = sourceEntries.reduce((sum, item) => sum + item.size, 0);
  const latestReleases = useMemo(() => releases.filter((item) =>
    (item.appName + ' ' + item.fileName + ' ' + item.version).toLowerCase().includes(search.toLowerCase())
  ), [releases, search]);

  const loadReleases = async () => {
    setLoadingReleases(true);
    try {
      const response = await fetch('/api/v1/published-releases', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('API kho phát hành trả về HTTP ' + response.status);
      const body = await response.json();
      setReleases(Array.isArray(body.releases) ? body.releases : []);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Không thể tải kho phát hành.' });
    } finally {
      setLoadingReleases(false);
    }
  };

  const loadStoreConfig = async () => {
    try {
      const response = await fetch('/api/v1/store-config', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      if (!response.ok) throw new Error('Không tải được cấu hình giao diện cửa hàng.');
      const body = await response.json();
      if (body.config) setStoreConfig({ ...defaultStoreConfig, ...body.config });
      setStoreConfigDirty(false);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Không tải được cấu hình cửa hàng.' });
    }
  };

  const saveStoreConfig = async () => {
    setBusy(true);
    setProgressMessage('Đang lưu cấu hình giao diện vào R2…');
    try {
      const response = await fetch('/api/v1/admin/store-config', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ config: storeConfig })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || ('Lưu giao diện thất bại: HTTP ' + response.status));
      setStoreConfig({ ...defaultStoreConfig, ...body.config });
      setStoreConfigDirty(false);
      setNotice({ type: 'success', text: 'Đã lưu nội dung cửa hàng vào R2. Tải lại cửa hàng để kiểm tra.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Không lưu được cấu hình cửa hàng.' });
    } finally {
      setProgressMessage('');
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadReleases();
    void loadStoreConfig();
  }, []);

  const appendFiles = async (inputFiles: FileList | File[]) => {
    const candidates = Array.from(inputFiles);
    if (!candidates.length) return;
    setLoadingSources(true);
    setNotice(null);
    try {
      const additions: SourceEntry[] = [];
      let incomingBytes = sourceBytes;
      for (const file of candidates) {
        if (file.size > MAX_SOURCE_BYTES) throw new Error(file.name + ' vượt giới hạn 50 MB cho mỗi tệp.');
        if (file.name.toLowerCase().endsWith('.zip')) {
          const archive = await JSZip.loadAsync(file);
          const entries = Object.values(archive.files).filter((entry) => !entry.dir);
          if (entries.length > 1000) throw new Error('ZIP có hơn 1.000 mục. Hãy chia thành các gói nhỏ hơn.');
          for (const entry of entries) {
            const path = safePath(entry.name);
            if (!path) continue;
            const blob = await entry.async('blob');
            incomingBytes += blob.size;
            if (incomingBytes > MAX_SOURCE_BYTES) throw new Error('Tổng mã nguồn vượt giới hạn 50 MB.');
            additions.push({ path, blob, size: blob.size });
          }
        } else {
          const path = safePath(file.webkitRelativePath || file.name);
          if (!path) continue;
          incomingBytes += file.size;
          if (incomingBytes > MAX_SOURCE_BYTES) throw new Error('Tổng mã nguồn vượt giới hạn 50 MB.');
          additions.push({ path, blob: file, size: file.size });
        }
      }
      setSourceEntries((current) => {
        const map = new Map(current.map((entry) => [entry.path, entry]));
        additions.forEach((entry) => map.set(entry.path, entry));
        return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
      });
      setNotice({ type: 'success', text: 'Đã nạp ' + additions.length + ' tệp. Tổng dung lượng: ' + byteLabel(incomingBytes) + '.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Không đọc được tệp nguồn.' });
    } finally {
      setLoadingSources(false);
    }
  };

  const createBundle = async () => {
    if (!sourceEntries.length) {
      setNotice({ type: 'error', text: 'Hãy thêm tệp nguồn hoặc tải tệp ZIP lên trước.' });
      return;
    }
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(version.trim())) {
      setNotice({ type: 'error', text: 'Phiên bản phải theo dạng SemVer, ví dụ 1.2.3 hoặc 1.2.3-beta.1.' });
      return;
    }
    const slug = toSlug(appSlug || appName);
    if (!slug) {
      setNotice({ type: 'error', text: 'Tên định danh ứng dụng không hợp lệ.' });
      return;
    }
    setBusy(true);
    setProgressMessage('Đang tính SHA-256 cho từng tệp nguồn…');
    setNotice({ type: 'info', text: 'Đang tạo gói nguồn và manifest phát hành.' });
    try {
      const zip = new JSZip();
      const checksums: string[] = [];
      const fileEntries: Array<{ path: string; sizeBytes: number; sha256: string }> = [];
      for (let index = 0; index < sourceEntries.length; index++) {
        const entry = sourceEntries[index];
        setProgressMessage('Đang đối soát ' + (index + 1) + '/' + sourceEntries.length + ': ' + entry.path);
        const hash = await digestSha256(entry.blob);
        zip.file('source/' + entry.path, entry.blob);
        fileEntries.push({ path: entry.path, sizeBytes: entry.size, sha256: hash });
        checksums.push(hash + '  source/' + entry.path);
      }
      const manifest: Record<string, unknown> = {
        schemaVersion: '1.0.0',
        app: { name: appName.trim(), slug, version: version.trim(), platform, channel: 'stable' },
        package: { type: 'source-bundle', nativeBinaryBuilt: false, signatureStatus: 'not-signed' },
        createdAt: new Date().toISOString(),
        releaseNotes: releaseNotes.trim(),
        sourceFileCount: fileEntries.length,
        sourceBytes: sourceBytes,
        files: fileEntries
      };
      zip.file('release-manifest.json', JSON.stringify(manifest, null, 2));
      zip.file('checksums.sha256', checksums.join('\n') + '\n');
      zip.file('README-RELEASE.txt',
        appName + ' v' + version + '\n\n' +
        'Loai goi: source-bundle.zip\n' +
        'Nen tang muc tieu: ' + platform + '\n' +
        'Ma nguon duoc dong goi trong thu muc source/.\n' +
        'Manifest: release-manifest.json\n' +
        'Checksum cac tep nguon: checksums.sha256\n\n' +
        'Luu y: day la goi ma nguon, khong phai binary native EXE/APK/IPA da bien dich hoac ky so.\n'
      );
      setProgressMessage('Đang nén gói phát hành…');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const sha256 = await digestSha256(blob);
      const fileName = slug + '-v' + version.trim() + '-source.zip';
      const file = new File([blob], fileName, { type: 'application/zip', lastModified: Date.now() });
      setBundle({ file, sha256, manifest });
      setUploadFile(file);
      setProgressMessage('');
      setNotice({ type: 'success', text: 'Đã tạo gói ZIP nguồn ' + fileName + ' (' + byteLabel(file.size) + '). SHA-256 đã được tính từ dữ liệu ZIP thật.' });
    } catch (error) {
      setProgressMessage('');
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Tạo gói phát hành không thành công.' });
    } finally {
      setBusy(false);
    }
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const publishArtifact = async () => {
    if (!uploadFile) {
      setNotice({ type: 'error', text: 'Hãy tạo ZIP hoặc chọn artifact đã build sẵn.' });
      return;
    }
    const cleanSlug = toSlug(appSlug || appName);
    if (!cleanSlug) {
      setNotice({ type: 'error', text: 'Tên định danh ứng dụng không hợp lệ.' });
      return;
    }
    setBusy(true);
    setProgressMessage('Đang tải artifact lên API Worker…');
    setNotice(null);
    try {
      const form = new FormData();
      form.append('appName', appName.trim());
      form.append('appSlug', cleanSlug);
      form.append('version', version.trim());
      form.append('platform', platform);
      form.append('releaseNotes', releaseNotes.trim());
      form.append('file', uploadFile, uploadFile.name);
      const response = await fetch('/api/v1/admin/publish', {
        method: 'POST',
        credentials: 'same-origin',
        body: form
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || body.error || ('Xuất bản thất bại: HTTP ' + response.status));
      }
      setProgressMessage('');
      setNotice({ type: 'success', text: 'Đã tải artifact lên R2. SHA-256: ' + body.sha256 + '. Bản phát hành có thể tải qua kho ứng dụng.' });
      setView('releases');
      await loadReleases();
    } catch (error) {
      setProgressMessage('');
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Không thể xuất bản artifact.' });
    } finally {
      setBusy(false);
    }
  };

  const navItems: { key: ViewKey; label: string; sub: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Tổng quan', sub: 'Workspace', icon: LayoutDashboard },
    { key: 'builder', label: 'Đóng gói ứng dụng', sub: 'Build workspace', icon: Package },
    { key: 'releases', label: 'Bản phát hành', sub: 'Release manager', icon: Rocket },
    { key: 'storefront', label: 'Giao diện cửa hàng', sub: 'Storefront control', icon: Store },
    { key: 'settings', label: 'Cấu hình nền tảng', sub: 'Platform settings', icon: Settings }
  ];

  return (
    <div className="studio-shell min-h-screen bg-[#0b0c12] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[.08] bg-[#101119] lg:flex">
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/30"><Boxes size={22}/></div>
            <div><div className="font-extrabold tracking-tight">HENDY <span className="text-violet-400">STUDIO</span></div><div className="mt-0.5 text-[10px] uppercase tracking-[.2em] text-slate-500">Release engineering</div></div>
          </div>
          <div className="mx-4 rounded-xl border border-white/[.07] bg-white/[.025] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-400"/><span>Workspace local</span></div>
            <div className="mt-2 truncate text-[11px] text-slate-500">{appName}</div>
          </div>
          <div className="px-4 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Workspace</div>
          <nav className="mt-2 space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return <button key={item.key} onClick={() => setView(item.key)} className={'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ' + (view === item.key ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20' : 'text-slate-400 hover:bg-white/[.04] hover:text-white')}>
                <Icon size={18} className={view === item.key ? 'text-violet-300' : 'text-slate-500'}/>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-[10px] text-slate-600">{item.sub}</span></span>
                {view === item.key && <ChevronRight size={15}/>}
              </button>;
            })}
          </nav>
          <div className="mt-auto p-4">
            <div className="rounded-xl border border-amber-400/15 bg-amber-300/[.04] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200"><LockKeyhole size={14}/> Bảo vệ API publish</div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">Quản lý ứng dụng, bản phát hành và nội dung cửa hàng trong một không gian làm việc.</p>
            </div>
            <button onClick={onReturnToStore} className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-white/[.05] hover:text-white"><ArrowLeft size={16}/> Về cửa hàng</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/[.08] bg-[#0b0c12]/90 px-5 py-4 backdrop-blur-xl lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 lg:hidden"><Boxes size={19}/></div>
              <div className="min-w-0"><div className="truncate text-sm font-bold sm:text-base">{navItems.find((item) => item.key === view)?.label}</div><div className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">Hendy App Distribution Platform <span className="px-1.5 text-slate-700">/</span> {navItems.find((item) => item.key === view)?.sub}</div></div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2 text-[11px] text-slate-400 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/><span>Cloudflare Pages Functions API</span></div>
              <a href="https://github.com/ngogiaidy56-eng/hendy-server-app-store" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-lg border border-white/[.1] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[.05] sm:inline-flex"><Github size={14}/> Source</a>
              <button onClick={onReturnToStore} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 transition hover:bg-violet-100"><ArrowLeft size={14}/> <span className="hidden sm:inline">Cửa hàng</span></button>
            </div>
          </header>

          <div className="border-b border-white/[.07] bg-[#101119] px-3 py-2 lg:hidden">
            <div className="flex gap-1 overflow-x-auto">{navItems.map((item) => {
              const Icon = item.icon;
              return <button key={item.key} onClick={() => setView(item.key)} className={'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ' + (view === item.key ? 'bg-violet-500/20 text-violet-200' : 'text-slate-500')}><Icon size={14}/>{item.label}</button>;
            })}</div>
          </div>

          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-9 lg:py-9">
            {notice && <div role="status" className={'mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ' + (notice.type === 'success' ? 'border-emerald-400/20 bg-emerald-400/[.07] text-emerald-200' : notice.type === 'error' ? 'border-rose-400/20 bg-rose-400/[.07] text-rose-200' : 'border-violet-400/20 bg-violet-400/[.07] text-violet-200')}>
              {notice.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0"/> : notice.type === 'error' ? <CircleAlert size={18} className="mt-0.5 shrink-0"/> : <Activity size={18} className="mt-0.5 shrink-0"/>}
              <p className="min-w-0 flex-1 leading-6">{notice.text}</p><button onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={16}/></button>
            </div>}

            {view === 'overview' && (
              <section className="space-y-7">
                <div className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/15 bg-gradient-to-br from-[#201a37] via-[#17192a] to-[#10121c] p-6 sm:p-9">
                  <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"/>
                  <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
                    <div className="max-w-3xl"><div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-violet-200"><Zap size={13}/> Release engineering workspace</div>
                      <h1 className="text-3xl font-black leading-tight tracking-[-.035em] sm:text-5xl">Từ mã nguồn đến <span className="text-violet-300">bản phát hành.</span></h1>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Nạp mã nguồn, đóng gói ZIP có manifest/checksum thật, chọn artifact đã build và xuất bản vào kho R2 để cửa hàng phân phối.</p>
                    </div>
                    <button onClick={() => setView('builder')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400">Mở xưởng đóng gói <ArrowRight size={17}/></button>
                  </div>
                  <div className="relative mt-9 grid gap-3 border-t border-white/[.08] pt-5 sm:grid-cols-3">
                    <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.05] text-violet-200"><FileArchive size={19}/></div><div><div className="text-xs text-slate-500">Nguồn đã nạp</div><div className="mt-1 font-bold">{sourceEntries.length} tệp · {byteLabel(sourceBytes)}</div></div></div>
                    <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.05] text-emerald-200"><Rocket size={19}/></div><div><div className="text-xs text-slate-500">Đã phát hành lên R2</div><div className="mt-1 font-bold">{releases.length} artifact</div></div></div>
                    <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.05] text-sky-200"><ShieldCheck size={19}/></div><div><div className="text-xs text-slate-500">Integrity</div><div className="mt-1 font-bold">SHA-256 có kiểm tra</div></div></div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { n: '01', title: 'Nạp dự án', text: 'Tải ZIP hoặc các tệp nguồn. Đường dẫn nguy hiểm và tệp quá lớn bị loại bỏ.', icon: FolderOpen, action: 'builder', button: 'Chọn mã nguồn' },
                    { n: '02', title: 'Tạo package', text: 'Tạo source bundle ZIP, manifest JSON và checksum SHA-256 tính từ bytes thật.', icon: Package, action: 'builder', button: 'Đóng gói' },
                    { n: '03', title: 'Xuất bản', text: 'Gửi gói phát hành lên kho thông qua API.', icon: CloudUpload, action: 'releases', button: 'Quản lý phát hành' }
                  ].map((item) => {
                    const Icon = item.icon;
                    return <div key={item.n} className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 transition hover:border-violet-400/25"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Icon size={19}/></div><span className="font-mono text-xs text-slate-600">{item.n}</span></div><h3 className="mt-5 font-extrabold">{item.title}</h3><p className="mt-2 min-h-[64px] text-sm leading-6 text-slate-500">{item.text}</p><button onClick={() => setView(item.action as ViewKey)} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-300 hover:text-violet-200">{item.button}<ArrowRight size={14}/></button></div>;
                  })}
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
                  <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3"><div><h2 className="font-extrabold">Bản phát hành gần đây</h2><p className="mt-1 text-xs text-slate-500">Dữ liệu đọc từ Cloudflare Pages Functions API, không phải dữ liệu mẫu trên giao diện.</p></div><button onClick={() => { setView('releases'); void loadReleases(); }} className="text-xs font-bold text-violet-300">Xem tất cả →</button></div>
                    {releases.length ? <div className="mt-5 divide-y divide-white/[.06]">{releases.slice(0, 4).map((item) => <div key={item.key} className="flex items-center gap-3 py-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[.04] text-slate-300"><Package size={17}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{item.appName}</div><div className="mt-1 truncate text-[11px] text-slate-500">{item.fileName} · v{item.version}</div></div><span className="text-[10px] text-emerald-300">R2</span></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 p-7 text-center"><Package size={24} className="mx-auto text-slate-600"/><p className="mt-3 text-sm font-semibold text-slate-400">Chưa có bản phát hành từ Studio</p><p className="mt-1 text-xs text-slate-600">Tạo gói nguồn, sau đó xuất bản để hiển thị tại cửa hàng.</p></div>}
                  </div>
                  <div className="rounded-2xl border border-amber-400/15 bg-amber-300/[.035] p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-amber-200"><CircleAlert size={18}/><h2 className="font-extrabold">Giới hạn build cần biết</h2></div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">Trình duyệt tạo gói ZIP nguồn và checksum. Nó không biên dịch chéo thành EXE, APK, IPA hoặc ký số native. Các gói đó cần Windows, Android SDK, Xcode hoặc Linux runner trong CI/CD.</p>
                    <a href="https://github.com/ngogiaidy56-eng/hendy-server-app-store/actions/workflows/build-and-publish-release.yml" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-amber-200 hover:text-amber-100"><GitBranch size={15}/> Build & Publish Web <ArrowRight size={14}/></a>
                  </div>
                </div>
              </section>
            )}

            {view === 'builder' && (
              <section className="space-y-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">Build workspace</div><h1 className="mt-2 text-3xl font-black tracking-tight">Xưởng đóng gói</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Nạp mã nguồn, gán phiên bản, xuất gói ZIP cùng manifest và SHA-256. Tệp native đã build có thể được chọn riêng để xuất bản.</p></div><div className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.03] px-3 py-2 text-xs text-slate-400"><Cpu size={15} className="text-violet-300"/> Browser packaging engine</div></div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(310px,.8fr)]">
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6">
                      <div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><FileText size={18}/></div><div><h2 className="font-extrabold">Thông tin ứng dụng</h2><p className="mt-1 text-xs text-slate-500">Dùng để sinh tên gói và manifest.</p></div></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Tên ứng dụng</span><input value={appName} onChange={(event) => { setAppName(event.target.value); if (!appSlug || appSlug === toSlug(appName)) setAppSlug(toSlug(event.target.value)); }} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none transition focus:border-violet-400/50" placeholder="Tên ứng dụng"/></label>
                        <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Slug / định danh</span><input value={appSlug} onChange={(event) => setAppSlug(toSlug(event.target.value))} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 font-mono text-sm outline-none focus:border-violet-400/50" placeholder="my-app"/></label>
                        <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Phiên bản (SemVer)</span><input value={version} onChange={(event) => setVersion(event.target.value)} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 font-mono text-sm outline-none focus:border-violet-400/50" placeholder="1.0.0"/></label>
                        <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Nền tảng mục tiêu</span><select value={platform} onChange={(event) => setPlatform(event.target.value as Platform)} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none focus:border-violet-400/50">{PLATFORM_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                        <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-semibold text-slate-400">Ghi chú phát hành</span><textarea rows={3} value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} className="w-full resize-y rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm leading-6 outline-none focus:border-violet-400/50" placeholder="Điểm thay đổi trong bản phát hành…"/></label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300"><FolderOpen size={18}/></div><div><h2 className="font-extrabold">Tệp nguồn</h2><p className="mt-1 text-xs text-slate-500">ZIP hoặc tệp rời · tối đa 50 MB tổng cộng</p></div></div><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[.1] bg-white/[.04] px-4 py-2.5 text-xs font-bold transition hover:bg-white/[.08]"><Upload size={15}/>{loadingSources ? 'Đang đọc…' : 'Thêm tệp'}<input type="file" multiple accept=".zip,.js,.jsx,.ts,.tsx,.json,.html,.css,.md,.txt,.py,.go,.rs,.java,.kt,.swift,.c,.cpp,.h,.yml,.yaml,.toml,.sh,.bat,.ps1" onChange={(event) => { if (event.target.files) void appendFiles(event.target.files); event.currentTarget.value = ''; }} className="hidden"/></label></div>
                      <div onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files.length) void appendFiles(event.dataTransfer.files); }} className="mt-5 rounded-2xl border border-dashed border-white/[.12] bg-[#0b0c12]/70 px-4 py-5 text-center transition hover:border-violet-400/40"><FileArchive size={25} className="mx-auto text-slate-600"/><p className="mt-2 text-sm font-semibold text-slate-300">Kéo dự án từ máy tính vào workspace</p><p className="mt-1 text-xs text-slate-600">Có thể chọn nhiều tệp hoặc file .zip. Các tệp có cùng đường dẫn sẽ được ghi đè khi nạp lần sau.</p><div className="mt-3 text-xs text-slate-500">{sourceEntries.length} tệp · {byteLabel(sourceBytes)}</div></div>
                      {sourceEntries.length > 0 && <div className="mt-4 max-h-[330px] overflow-auto rounded-xl border border-white/[.07]"><div className="flex items-center justify-between border-b border-white/[.06] px-3 py-2 text-[11px] text-slate-500"><span>Đường dẫn</span><button onClick={() => { setSourceEntries([]); setBundle(null); setUploadFile(null); }} className="flex items-center gap-1 font-semibold text-rose-300 hover:text-rose-200"><Trash2 size={12}/> Xóa tất cả</button></div>{sourceEntries.map((item) => <div key={item.path} className="flex items-center gap-3 border-b border-white/[.04] px-3 py-2.5 last:border-0"><FileCode2 size={15} className="shrink-0 text-violet-300"/><span className="min-w-0 flex-1 truncate text-xs text-slate-300">{item.path}</span><span className="shrink-0 font-mono text-[10px] text-slate-600">{byteLabel(item.size)}</span><button onClick={() => setSourceEntries((entries) => entries.filter((entry) => entry.path !== item.path))} aria-label={'Xóa ' + item.path} className="text-slate-600 hover:text-rose-300"><X size={14}/></button></div>)}</div>}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] leading-5 text-slate-500">Định dạng kết quả: ZIP nguồn, JSON manifest và checksums.sha256.</span><button onClick={() => void createBundle()} disabled={busy || loadingSources || !sourceEntries.length} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"><Package size={16}/>{busy ? 'Đang xử lý…' : 'Tạo gói phát hành'}</button></div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6">
                      <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300"><Gauge size={18}/></div><div><h2 className="font-extrabold">Artifact output</h2><p className="mt-1 text-xs text-slate-500">Kết quả được tạo trong trình duyệt</p></div></div>
                      {busy && <div className="mt-5 flex items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-400/[.05] p-3 text-xs text-violet-200"><LoaderCircle size={16} className="animate-spin"/>{progressMessage || 'Đang làm việc…'}</div>}
                      {bundle ? <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.04] p-4"><div className="flex items-center gap-2 text-emerald-200"><CheckCircle2 size={17}/><span className="text-sm font-bold">Gói nguồn đã tạo</span></div><div className="mt-3 break-all font-mono text-xs text-slate-200">{bundle.file.name}</div><div className="mt-1 text-xs text-slate-500">{byteLabel(bundle.file.size)} · ZIP</div><div className="mt-4 text-[10px] font-bold uppercase tracking-[.15em] text-slate-500">SHA-256</div><div className="mt-2 break-all rounded-lg bg-black/20 p-3 font-mono text-[10px] leading-5 text-slate-400">{bundle.sha256}</div><button onClick={() => downloadFile(bundle.file)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-400"><ArrowDownToLine size={15}/> Tải ZIP về máy</button></div> : <div className="mt-5 rounded-2xl border border-dashed border-white/[.1] px-4 py-10 text-center"><Package size={25} className="mx-auto text-slate-600"/><p className="mt-3 text-sm font-semibold text-slate-400">Chưa tạo artifact</p><p className="mt-1 text-xs leading-5 text-slate-600">Nạp tệp nguồn và chọn “Tạo gói phát hành”.</p></div>}
                      <div className="mt-5 space-y-3">{['Kiểm tra đường dẫn file', 'Tính SHA-256 theo bytes thực', 'Xuất manifest JSON', 'Nén release ZIP'].map((item) => <div key={item} className="flex items-center gap-2 text-xs text-slate-500"><Check size={14} className={bundle ? 'text-emerald-400' : 'text-slate-700'}/>{item}</div>)}</div>
                    </div>

                    <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6">
                      <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300"><CloudUpload size={18}/></div><div><h2 className="font-extrabold">Đăng bản phát hành</h2><p className="mt-1 text-xs text-slate-500">Tải artifact lên R2 qua API</p></div></div>
                      <div className="mt-4 rounded-xl border border-white/[.07] bg-[#0b0c12] p-3"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-600">Artifact tải lên</div><div className="mt-1 break-all text-xs font-semibold text-slate-300">{uploadFile ? uploadFile.name : 'Chưa chọn tệp'}</div><div className="mt-1 text-[11px] text-slate-600">{uploadFile ? byteLabel(uploadFile.size) : 'Tạo ZIP hoặc chọn gói đã build trên máy'}</div></div>
                      <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[.1] px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/[.04]"><Upload size={14}/> Chọn artifact đã build sẵn<input type="file" accept=".exe,.msi,.apk,.aab,.ipa,.dmg,.pkg,.appimage,.deb,.zip,.tar,.gz" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setUploadFile(file); setNotice({ type: 'info', text: 'Đã chọn artifact ' + file.name + '. Xác nhận phiên bản và nền tảng trước khi xuất bản.' }); } event.currentTarget.value = ''; }} className="hidden"/></label>
                      <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><LockKeyhole size={13} className="mt-0.5 shrink-0 text-violet-300"/> Quản lý và theo dõi các bản phát hành đã xuất bản.</div>
                      <button onClick={() => void publishArtifact()} disabled={busy || !uploadFile} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-xs font-extrabold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"><Rocket size={15}/>{busy ? 'Đang xuất bản…' : 'Xuất bản lên R2'}</button>
                      <p className="mt-3 text-[10px] leading-5 text-slate-600">Nút này gọi API thật. Giới hạn upload trực tiếp là 25 MB mỗi tệp; artifact lớn hơn cần dịch vụ multipart/presigned upload. Nếu kho phát hành chưa sẵn sàng, giao diện sẽ hiển thị lỗi từ API.</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {view === 'releases' && (
              <section>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">Release manager</div><h1 className="mt-2 text-3xl font-black tracking-tight">Kho bản phát hành</h1><p className="mt-2 text-sm text-slate-500">Các tệp trả về từ R2, có checksum thực và URL tải do Worker cung cấp.</p></div><div className="flex gap-2"><button onClick={() => void loadReleases()} className="inline-flex items-center gap-2 rounded-xl border border-white/[.1] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[.05]"><Activity size={14}/> Làm mới</button><button onClick={() => setView('builder')} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-400"><Package size={14}/> Tạo bản mới</button></div></div>
                <div className="mt-6 rounded-2xl border border-white/[.08] bg-[#11131d]">
                  <div className="flex flex-col justify-between gap-3 border-b border-white/[.07] p-4 sm:flex-row sm:items-center sm:px-5"><div className="flex items-center gap-2 text-xs text-slate-400"><History size={15}/>{releases.length} artifact đã được publish</div><label className="flex items-center gap-2 rounded-lg border border-white/[.08] bg-[#0b0c12] px-3 py-2"><Code2 size={14} className="text-slate-600"/><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-xs outline-none sm:w-56" placeholder="Lọc bản phát hành"/></label></div>
                  {loadingReleases ? <div className="p-10 text-center text-sm text-slate-500"><LoaderCircle className="mx-auto mb-3 animate-spin"/>Đang tải API…</div> : latestReleases.length ? <div className="divide-y divide-white/[.06]">{latestReleases.map((item) => <div key={item.key} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Package size={19}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.appName}</h3><span className="rounded bg-white/[.06] px-2 py-0.5 font-mono text-[10px] text-slate-400">v{item.version}</span><span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">PUBLISHED</span></div><p className="mt-1 truncate text-xs text-slate-500">{item.fileName} · {byteLabel(item.sizeBytes)} · {item.platform}</p><p className="mt-1 text-[10px] text-slate-600">Phát hành: {safeDate(item.publishedAt)}</p><p className="mt-2 break-all font-mono text-[10px] leading-5 text-slate-600">SHA-256: {item.sha256}</p></div><a href={item.downloadUrl} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[.1] px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/[.05]"><ArrowDownToLine size={14}/> Tải / Kiểm tra</a></div>)}</div> : <div className="p-12 text-center"><Package size={27} className="mx-auto text-slate-600"/><h3 className="mt-4 font-bold">Chưa có artifact nào trong R2</h3><p className="mt-2 text-sm text-slate-500">Tạo gói phát hành và gửi lên kho.</p><button onClick={() => setView('builder')} className="mt-5 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold hover:bg-violet-400">Bắt đầu đóng gói</button></div>}
                </div>
              </section>
            )}

            {view === 'storefront' && (
              <section className="max-w-5xl space-y-6">
                <div><div className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">Storefront control</div><h1 className="mt-2 text-3xl font-black tracking-tight">Điều khiển giao diện người dùng</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Cập nhật thương hiệu, banner, nội dung trang chủ và liên kết cửa hàng. Cấu hình được lưu vào R2 và đọc lại qua API công khai.</p></div>
                <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Tên cửa hàng</span><input value={storeConfig.brandName} onChange={(event) => { setStoreConfig((old) => ({ ...old, brandName: event.target.value })); setStoreConfigDirty(true); }} maxLength={70} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none focus:border-violet-400/50"/></label>
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Thông báo đầu trang</span><input value={storeConfig.announcement} onChange={(event) => { setStoreConfig((old) => ({ ...old, announcement: event.target.value })); setStoreConfigDirty(true); }} maxLength={240} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none focus:border-violet-400/50" placeholder="Thông báo tùy chọn"/></label>
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Nhãn banner</span><input value={storeConfig.heroEyebrow} onChange={(event) => { setStoreConfig((old) => ({ ...old, heroEyebrow: event.target.value })); setStoreConfigDirty(true); }} maxLength={100} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none focus:border-violet-400/50"/></label>
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Tiêu đề banner</span><input value={storeConfig.heroTitle} onChange={(event) => { setStoreConfig((old) => ({ ...old, heroTitle: event.target.value })); setStoreConfigDirty(true); }} maxLength={100} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none focus:border-violet-400/50"/></label>
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Dòng nhấn mạnh</span><input value={storeConfig.heroAccent} onChange={(event) => { setStoreConfig((old) => ({ ...old, heroAccent: event.target.value })); setStoreConfigDirty(true); }} maxLength={100} className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none focus:border-violet-400/50"/></label>
                  <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-400">Liên kết hỗ trợ HTTPS</span><input value={storeConfig.supportUrl} onChange={(event) => { setStoreConfig((old) => ({ ...old, supportUrl: event.target.value })); setStoreConfigDirty(true); }} type="url" className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none focus:border-violet-400/50" placeholder="https://..."/></label>
                  <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-semibold text-slate-400">Mô tả trang chủ</span><textarea rows={4} value={storeConfig.heroDescription} onChange={(event) => { setStoreConfig((old) => ({ ...old, heroDescription: event.target.value })); setStoreConfigDirty(true); }} maxLength={500} className="w-full resize-y rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm leading-6 outline-none focus:border-violet-400/50"/></label>
                  <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-semibold text-slate-400">Repository công khai</span><input value={storeConfig.repositoryUrl} onChange={(event) => { setStoreConfig((old) => ({ ...old, repositoryUrl: event.target.value })); setStoreConfigDirty(true); }} type="url" className="w-full rounded-xl border border-white/[.1] bg-[#0b0c12] px-3.5 py-3 text-sm outline-none focus:border-violet-400/50"/></label>
                </div><div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-5"><span className="text-xs text-slate-500">{storeConfigDirty ? 'Có thay đổi chưa lưu' : 'Đang dùng nội dung đã tải từ API'}</span><div className="flex gap-2"><button onClick={() => void loadStoreConfig()} className="rounded-xl border border-white/[.1] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[.04]">Tải lại</button><button onClick={() => void saveStoreConfig()} disabled={busy || !storeConfigDirty} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-violet-400 disabled:opacity-40"><CloudUpload size={14}/> Lưu lên R2</button></div></div></div>
                <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[.035] p-5"><div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-sky-200"/><div><h2 className="font-extrabold text-sky-100">Dữ liệu cửa hàng</h2><p className="mt-2 text-sm leading-6 text-slate-400">Danh mục, phiên bản, link tải và checksum tự lấy từ artifact đã xuất bản. Màn hình này quản lý nội dung và thương hiệu; không chèn dữ liệu phát hành giả.</p></div></div></div>
              </section>
            )}

            {view === 'settings' && (
              <section className="max-w-5xl space-y-6">
                <div><div className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">Platform settings</div><h1 className="mt-2 text-3xl font-black tracking-tight">Cấu hình nền tảng</h1><p className="mt-2 text-sm leading-6 text-slate-500">Quản lý thông tin nền tảng và quy trình phát hành. Các tùy chọn bảo mật không được cấu hình trong giao diện này.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200"><Package size={20}/></div><h2 className="mt-4 font-extrabold">Kho bản phát hành</h2><p className="mt-2 text-sm leading-6 text-slate-400">Các gói đã xuất bản được lưu trong R2 và xuất hiện trên Storefront. Có thể xem trạng thái gói, phiên bản, kích thước và SHA-256 tại mục Bản phát hành.</p><button onClick={() => setView('releases')} className="mt-4 rounded-xl border border-white/[.1] px-4 py-2.5 text-xs font-bold hover:bg-white/[.05]">Mở bản phát hành</button></div>
                  <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/10 text-sky-200"><Store size={20}/></div><h2 className="mt-4 font-extrabold">Nội dung cửa hàng</h2><p className="mt-2 text-sm leading-6 text-slate-400">Thay đổi tên thương hiệu, thông báo, nội dung giới thiệu và liên kết hỗ trợ tại mục Giao diện cửa hàng.</p><button onClick={() => setView('storefront')} className="mt-4 rounded-xl border border-white/[.1] px-4 py-2.5 text-xs font-bold hover:bg-white/[.05]">Chỉnh sửa Storefront</button></div>
                </div>
                <div className="rounded-2xl border border-white/[.08] bg-[#11131d] p-5 sm:p-6"><div className="flex items-center gap-3"><Github size={19} className="text-slate-300"/><div><h2 className="font-extrabold">Source và CI/CD</h2><p className="mt-1 text-xs text-slate-500">Truy cập mã nguồn và quy trình build/release.</p></div></div><div className="mt-4 flex flex-wrap gap-2"><a href="https://github.com/ngogiaidy56-eng/hendy-server-app-store" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/[.1] px-4 py-2.5 text-xs font-bold hover:bg-white/[.05]"><Github size={14}/> Repository <ExternalLink size={12}/></a><a href="https://github.com/ngogiaidy56-eng/hendy-server-app-store/actions/workflows/build-and-publish-release.yml" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/[.1] px-4 py-2.5 text-xs font-bold hover:bg-white/[.05]"><GitBranch size={14}/> GitHub Actions <ExternalLink size={12}/></a></div></div>
                <AutomationSecretsForm />
                <CertUploadSecure />
              </section>
            )}
          </div>
          {progressMessage && <div aria-live="polite" className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-violet-400/20 bg-[#171827] px-4 py-3 text-xs text-violet-100 shadow-2xl"><LoaderCircle size={15} className="shrink-0 animate-spin"/><span>{progressMessage}</span></div>}
        </main>
      </div>
    </div>
  );
}
