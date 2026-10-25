import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, Boxes, ChevronDown, ExternalLink,
  Grid2X2, Monitor, Package, Search, ShieldCheck,
  Smartphone, Sparkles, Store, X
} from 'lucide-react';

type ReleaseItem = {
  id: string; key: string; appName: string; appSlug: string; version: string;
  platform: string; fileName: string; sizeBytes: number | null; sha256: string | null;
  publishedAt: string | null; releaseNotes: string; downloadUrl: string | null; available: boolean;
};
type StorefrontConfig = {
  brandName: string; announcement: string; heroEyebrow: string; heroTitle: string;
  heroAccent: string; heroDescription: string; supportUrl: string;
};
type AppListing = { slug: string; name: string; version: string; platforms: string[]; artifacts: ReleaseItem[]; newestDate: string; notes: string };

const DEFAULT_CONFIG: StorefrontConfig = {
  brandName: 'Hendy Store', announcement: '', heroEyebrow: 'ỨNG DỤNG · CÔNG CỤ · BẢN PHÁT HÀNH',
  heroTitle: 'Tất cả ứng dụng', heroAccent: 'trong một nơi.',
  heroDescription: 'Khám phá ứng dụng và tải xuống các bản phát hành thật, với thông tin phiên bản và mã kiểm tra tệp rõ ràng.',
  supportUrl: ''
};
const PLATFORM_LABELS: Record<string, string> = { windows: 'Windows', android: 'Android', ios: 'iOS', macos: 'macOS', linux: 'Linux', web: 'Web / Source' };
const PLATFORM_ORDER = ['windows', 'macos', 'linux', 'android', 'ios', 'web'];

function prettySize(size: number | null): string {
  if (size === null || !Number.isFinite(size)) return 'Chưa có tệp';
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(2) + ' MB';
}
function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'AP';
}
function formatDate(value: string): string {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN') : '—';
}
function versionCompare(left: string, right: string): number {
  const a = left.replace(/^v/, '').split(/[.-]/).map((part) => Number(part) || 0);
  const b = right.replace(/^v/, '').split(/[.-]/).map((part) => Number(part) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff) return diff;
  }
  return 0;
}
function safeHttps(value: string, fallback: string): string {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : fallback; }
  catch { return fallback; }
}
function groupReleases(releases: ReleaseItem[]): AppListing[] {
  const groups = new Map<string, ReleaseItem[]>();
  for (const item of releases) {
    const slug = item.appSlug || item.appName.toLowerCase();
    groups.set(slug, [...(groups.get(slug) || []), item]);
  }
  return Array.from(groups.entries()).map(([slug, items]) => {
    const versions = items.map((item) => item.version).sort(versionCompare);
    const latestVersion = versions[versions.length - 1] || '0.0.0';
    const newest = items.filter((item) => item.version === latestVersion);
    const platforms = Array.from(new Set(items.map((item) => item.platform))).sort((a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b));
    return {
      slug, name: items[0]?.appName || slug, version: latestVersion, platforms,
      artifacts: newest.sort((a, b) => Number(b.available) - Number(a.available)),
      newestDate: items.map((item) => item.publishedAt || '').sort().reverse()[0] || '',
      notes: newest.find((item) => item.releaseNotes)?.releaseNotes || 'Không có ghi chú phát hành.'
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export default function StorefrontV2() {
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULT_CONFIG);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');
  const [category, setCategory] = useState<'all' | 'desktop' | 'mobile' | 'web'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AppListing | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [catalogResponse, configResponse] = await Promise.all([
          fetch('/api/v1/published-releases', { headers: { Accept: 'application/json' }, credentials: 'same-origin' }),
          fetch('/api/v1/store-config', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
        ]);
        if (!catalogResponse.ok) throw new Error('Kho phát hành trả về HTTP ' + catalogResponse.status);
        const catalogBody = await catalogResponse.json();
        const configBody = configResponse.ok ? await configResponse.json() : null;
        const items: ReleaseItem[] = (catalogBody.releases || []).map((item: any) => ({
          id: String(item.key || item.fileName || ''), key: String(item.key || ''),
          appName: String(item.appName || item.appSlug || 'Ứng dụng'), appSlug: String(item.appSlug || 'application'),
          version: String(item.version || '0.0.0'), platform: String(item.platform || 'web'),
          fileName: String(item.fileName || 'artifact'), sizeBytes: typeof item.sizeBytes === 'number' ? item.sizeBytes : null,
          sha256: typeof item.sha256 === 'string' ? item.sha256 : null, publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : null,
          releaseNotes: String(item.releaseNotes || ''), downloadUrl: typeof item.downloadUrl === 'string' ? item.downloadUrl : null,
          available: Boolean(item.downloadUrl)
        }));
        if (active) {
          setReleases(items);
          if (configBody?.config) setConfig({ ...DEFAULT_CONFIG, ...configBody.config });
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải danh mục phát hành.');
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  const apps = useMemo(() => groupReleases(releases), [releases]);
  const filtered = useMemo(() => apps.filter((app) => {
    const text = (app.name + ' ' + app.slug + ' ' + app.notes + ' ' + app.version + ' ' + app.platforms.join(' ')).toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesPlatform = platform === 'all' || app.platforms.includes(platform);
    const matchesCategory = category === 'all' ||
      (category === 'desktop' && app.platforms.some((p) => ['windows', 'macos', 'linux'].includes(p))) ||
      (category === 'mobile' && app.platforms.some((p) => ['android', 'ios'].includes(p))) ||
      (category === 'web' && app.platforms.includes('web'));
    return matchesQuery && matchesPlatform && matchesCategory;
  }), [apps, query, platform, category]);
  const availableCount = releases.filter((item) => item.available && item.downloadUrl).length;

  return (
    <div className="store-shell min-h-screen bg-[#f6f7fb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        {config.announcement && <div className="bg-[#162a66] px-4 py-2 text-center text-xs font-semibold text-white">{config.announcement}</div>}
        <div className="mx-auto flex max-w-[1600px] items-center gap-5 px-4 py-3.5 sm:px-7 lg:px-10">
          <a href="/" className="flex shrink-0 items-center gap-3 no-underline" aria-label="Trang chủ Hendy Store">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200"><Boxes size={23}/></span>
            <span><span className="block text-lg font-extrabold tracking-tight">{config.brandName || 'Hendy Store'}</span><span className="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[.16em] text-slate-400 sm:block">APP DISCOVERY PLATFORM</span></span>
          </a>
          <nav className="hidden items-center gap-2 lg:flex">
            <a href="#discover" className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">Khám phá</a>
            <a href="#catalog" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Ứng dụng</a>
            <a href="#security" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">An toàn tải xuống</a>
          </nav>
          <div className="ml-auto hidden min-w-0 max-w-xl flex-1 md:block">
            <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
              <Search size={18} className="shrink-0 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Tìm tên ứng dụng, công cụ hoặc nền tảng…"/>
            </label>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 px-4 py-6 sm:px-7 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-10 lg:py-9">
        <aside className="hidden lg:block">
          <div className="sticky top-[100px] space-y-8">
            <div><div className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">Duyệt cửa hàng</div>
              {[
                { key: 'all', label: 'Tất cả ứng dụng', icon: Grid2X2 },
                { key: 'desktop', label: 'Máy tính', icon: Monitor },
                { key: 'mobile', label: 'Di động', icon: Smartphone },
                { key: 'web', label: 'Ứng dụng web', icon: Store }
              ].map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => setCategory(item.key as typeof category)} className={'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ' + (category === item.key ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-white hover:text-slate-900')}><Icon size={17}/>{item.label}</button>; })}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-extrabold"><ShieldCheck size={16} className="text-emerald-600"/> Tệp phát hành xác thực</div><p className="mt-2 text-xs leading-5 text-slate-500">Nút tải chỉ hoạt động khi API xác nhận artifact tồn tại trong kho lưu trữ.</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[11px] text-slate-400">Tệp sẵn sàng</span><strong className="text-sm text-emerald-700">{availableCount}</strong></div></div>
            {config.supportUrl && <div className="space-y-2 px-3 text-xs text-slate-400"><a href={safeHttps(config.supportUrl, '#')} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-indigo-700"><ShieldCheck size={14}/> Hỗ trợ người dùng <ExternalLink size={11}/></a></div>}
          </div>
        </aside>

        <main id="discover" className="min-w-0">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#111a48] via-[#28378a] to-[#6655d9] p-6 text-white shadow-xl shadow-indigo-100 sm:p-9 lg:p-11">
            <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full border-[45px] border-white/[.06]"/><div className="absolute -bottom-36 right-[20%] h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl"/>
            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_250px] xl:items-center">
              <div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-100"><Sparkles size={13}/>{config.heroEyebrow}</div><h1 className="mt-5 text-4xl font-black leading-[1.04] tracking-[-.045em] sm:text-5xl xl:text-6xl">{config.heroTitle}<span className="mt-1 block text-cyan-200">{config.heroAccent}</span></h1><p className="mt-5 max-w-2xl text-sm leading-7 text-indigo-100 sm:text-base">{config.heroDescription}</p><div className="mt-7 flex flex-wrap gap-3"><a href="#catalog" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-indigo-800 transition hover:bg-cyan-50">Khám phá kho ứng dụng <ArrowRight size={16}/></a></div></div>
              <div className="hidden rounded-3xl border border-white/15 bg-slate-950/20 p-5 backdrop-blur-sm xl:block"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.15em] text-indigo-100"><span>Release center</span><span className="h-2 w-2 rounded-full bg-emerald-300"/></div><div className="mt-7 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Package size={23}/></div><div><div className="text-sm font-extrabold">Verified artifacts</div><div className="mt-1 text-xs text-indigo-100">Metadata from Worker API</div></div></div><div className="mt-6 space-y-3 text-xs"><div className="flex justify-between border-b border-white/10 pb-3"><span className="text-indigo-100">Ứng dụng</span><strong>{apps.length}</strong></div><div className="flex justify-between border-b border-white/10 pb-3"><span className="text-indigo-100">Tệp tải thật</span><strong>{availableCount}</strong></div><div className="flex justify-between"><span className="text-indigo-100">Kiểm tra</span><strong>SHA-256</strong></div></div></div>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">Explore apps</div><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Ứng dụng trong kho</h2><p className="mt-2 text-sm text-slate-500">Thông tin lấy từ các bản phát hành đã đăng lên R2.</p></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 md:hidden"><Search size={16} className="text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Tìm ứng dụng…"/></label></div>
          <div id="catalog" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4"><div className="flex flex-wrap gap-2">{[{key:'all',label:'Tất cả'},{key:'desktop',label:'Desktop'},{key:'mobile',label:'Mobile'},{key:'web',label:'Web'}].map((item) => <button key={item.key} onClick={() => setCategory(item.key as typeof category)} className={'rounded-full px-4 py-2 text-xs font-bold transition ' + (category === item.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-700')}>{item.label}</button>)}</div><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><ChevronDown size={14} className="text-slate-400"/><select value={platform} onChange={(event) => setPlatform(event.target.value)} className="bg-transparent text-xs font-semibold outline-none"><option value="all">Mọi nền tảng</option>{PLATFORM_ORDER.map((value) => <option key={value} value={value}>{PLATFORM_LABELS[value]}</option>)}</select></label></div>
          {error && <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
          {loading ? <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl bg-white ring-1 ring-slate-200"/>)}</div>
            : filtered.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((app, index) => {
              const available = app.artifacts.filter((item) => item.available && item.downloadUrl);
              const colors = ['bg-gradient-to-br from-indigo-500 to-violet-700','bg-gradient-to-br from-cyan-500 to-blue-700','bg-gradient-to-br from-emerald-500 to-teal-700','bg-gradient-to-br from-rose-500 to-orange-600'];
              return <article key={app.slug} className="group flex min-h-[252px] cursor-pointer flex-col rounded-[1.6rem] border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/60" onClick={() => setSelected(app)}><div className="flex items-start gap-4"><div className={'flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[1.35rem] text-xl font-black text-white shadow-lg ' + colors[index % colors.length]}>{initials(app.name)}</div><div className="min-w-0 flex-1 pt-1"><h3 className="line-clamp-2 text-base font-extrabold leading-5 tracking-tight transition group-hover:text-indigo-700">{app.name}</h3><div className="mt-2 text-xs font-semibold text-slate-400">Phiên bản {app.version}</div><div className="mt-2 flex flex-wrap gap-1">{app.platforms.map((p) => <span key={p} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{PLATFORM_LABELS[p] || p}</span>)}</div></div></div><p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500">{app.notes}</p><div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><ShieldCheck size={14} className="text-emerald-600"/>{available.length} tệp có thể tải</span><button onClick={(event) => { event.stopPropagation(); setSelected(app); }} className="rounded-full bg-indigo-50 px-4 py-2 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-600 hover:text-white">Chi tiết</button></div></article>;
            })}</div> : <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Package size={24}/></div><h3 className="mt-4 text-lg font-extrabold">Chưa có ứng dụng đã phát hành</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Kho chỉ hiển thị bản phát hành thật. Nhà phát triển có thể nạp mã nguồn, tạo gói hoặc tải artifact đã build từ CI lên R2.</p></div>}

          <section id="security" className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={21}/></div><div><h2 className="font-extrabold">Tải xuống minh bạch</h2><p className="mt-1 text-xs text-slate-500">Thông tin bản phát hành đọc trực tiếp từ backend.</p></div></div><div className="mt-6 grid gap-5 sm:grid-cols-3">{[{title:'Chỉ hiện artifact thật',text:'Nút tải dựa vào object tồn tại trong R2, không tạo link tải giả.'},{title:'Thông tin tệp rõ ràng',text:'Phiên bản, nền tảng, dung lượng và checksum hiển thị khi API có dữ liệu.'},{title:'Quy trình phát hành',text:'Nguồn, build, kiểm thử và ký số được quản lý từ Studio hoặc CI.'}].map((item) => <div key={item.title}><div className="text-sm font-extrabold">{item.title}</div><p className="mt-2 text-xs leading-5 text-slate-500">{item.text}</p></div>)}</div></section>
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-3 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:items-center lg:px-10"><div>© 2026 {config.brandName || 'Hendy Store'} · App discovery & software releases</div></div></footer>

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="app-details-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 sm:p-8"><div className="flex min-w-0 items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-xl font-black text-white">{initials(selected.name)}</div><div className="min-w-0"><h2 id="app-details-title" className="text-2xl font-black tracking-tight">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">Phiên bản {selected.version} · {selected.platforms.map((p) => PLATFORM_LABELS[p] || p).join(' · ')}</p><p className="mt-2 text-xs text-slate-400">Cập nhật {formatDate(selected.newestDate)}</p></div></div><button onClick={() => setSelected(null)} aria-label="Đóng chi tiết" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X size={20}/></button></div>
        <div className="max-h-[calc(92vh-110px)] overflow-y-auto p-6 sm:p-8"><h3 className="text-sm font-extrabold">Giới thiệu bản phát hành</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.notes}</p><h3 className="mt-8 text-sm font-extrabold">Gói tải xuống</h3><div className="mt-3 space-y-3">{selected.artifacts.map((artifact) => <div key={artifact.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">{['android','ios'].includes(artifact.platform) ? <Smartphone size={19}/> : <Monitor size={19}/>}</div><div className="min-w-0 flex-1"><div className="text-sm font-extrabold">{PLATFORM_LABELS[artifact.platform] || artifact.platform}</div><div className="mt-1 truncate text-xs text-slate-500">{artifact.fileName}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400"><span>{prettySize(artifact.sizeBytes)}</span><span>{artifact.sha256 ? 'SHA-256: ' + artifact.sha256.slice(0, 16) + '…' : 'Chưa có checksum'}</span></div></div>{artifact.available && artifact.downloadUrl ? <a href={artifact.downloadUrl} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700"><ArrowDownToLine size={15}/> Tải xuống</a> : <span className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-400">Chưa có tệp</span>}</div>)}</div><div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={14} className="text-emerald-600"/> Đối chiếu checksum của tệp đã tải trước khi sử dụng.</div></div>
      </div></div>}
    </div>
  );
}
