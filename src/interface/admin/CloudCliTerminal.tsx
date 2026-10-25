/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2 } from 'lucide-react';

export const CloudCliTerminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ cmd: string; out: string; time: string }>>([
    {
      cmd: 'hendyctl system status',
      out: `Hendy Server Plus Edge Core v3.1.2\nStatus: ONLINE [OK]\nServices: 4/4 active (Cloudflare Pages, Hendy Gateway, Binary Packager, SAST)\nMemory: 1,420 MB / 8,192 MB (17.3%)\nIP Allowlist: ACTIVE (3 trusted IP nodes enforced)`,
      time: '00:25:10',
    },
    {
      cmd: 'hendyctl package list --all',
      out: `Available Artifacts:\n- Windows x64: HendyTools-v3.1.2-x64-Setup.exe (15.4 MB, Authenticode EV)\n- Android ARM64: HendyTools-v3.1.2-release.apk (24.2 MB, Signed V3)\n- iOS Enterprise: HendyTools-v3.1.2-enterprise.ipa (31.5 MB, Enterprise)`,
      time: '00:27:44',
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    const time = new Date().toLocaleTimeString('vi-VN');
    let out = '';

    if (cmd === 'help') {
      out = `Các lệnh khả dụng:\n- hendyctl status: Kiểm tra trạng thái máy chủ Server Plus\n- hendyctl services: Danh sách dịch vụ hệ thống\n- hendyctl package build: Kích hoạt pipeline đóng gói\n- hendyctl ip list: Liệt kê các địa chỉ IP được cấp phép\n- clear: Xóa màn hình terminal`;
    } else if (cmd === 'clear') {
      setHistory([]);
      setInput('');
      return;
    } else if (cmd.includes('status')) {
      out = `Toàn bộ dịch vụ đang hoạt động bình thường trên cụm máy chủ Cloudflare Edge.`;
    } else if (cmd.includes('services')) {
      out = `1. Cloudflare Pages Functions - Cổng 3000 [ONLINE]\n2. Hendy Download Gateway - Cổng 8080 [ONLINE]\n3. Binary Packaging Studio - Cổng 9000 [ONLINE]\n4. SAST Security Engine - Cổng 9443 [ONLINE]`;
    } else if (cmd.includes('ip')) {
      out = `Danh sách IP được phép truy cập Admin Console:\n- 103.149.28.4 (Hendy Primary Ops - Super Admin)\n- 127.0.0.1 (Localhost Loopback)\n- 14.162.140.89 (VNPT Enterprise Node)`;
    } else {
      out = `Lệnh thực thi thành công: '${cmd}' (Mã trả về: 0)`;
    }

    setHistory((prev) => [...prev, { cmd, out, time }]);
    setInput('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Giao diện Dòng lệnh Quản trị (Cloud Shell CLI)</h3>
            <p className="text-xs text-slate-400">
              Nhập các lệnh điều khiển hendyctl hoặc xem trạng thái máy chủ. Gõ <strong>help</strong> để xem trợ giúp.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHistory([])}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded transition-colors"
          title="Xóa lịch sử terminal"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 h-64 overflow-y-auto flex flex-col gap-2">
        {history.map((h, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400">root@hendy-server-plus:~$</span>
              <span className="text-slate-100">{h.cmd}</span>
              <span className="text-[10px] text-slate-600 ml-auto">{h.time}</span>
            </div>
            <pre className="text-slate-300 text-[11px] whitespace-pre-wrap pl-4 leading-relaxed">
              {h.out}
            </pre>
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      <form onSubmit={handleCommand} className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono">
          <span className="text-emerald-400 font-bold">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập lệnh (vd: help, hendyctl status, hendyctl services)..."
            className="bg-transparent text-slate-100 outline-none w-full"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi</span>
        </button>
      </form>
    </div>
  );
};
