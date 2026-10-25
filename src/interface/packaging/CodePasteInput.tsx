/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Clipboard, Code2, Sparkles, Check, FileText } from 'lucide-react';

interface CodePasteInputProps {
  onAddOrUpdateFile: (file: { name: string; language: string; content: string }) => void;
  existingFilesCount: number;
}

const TEMPLATES: Record<string, { filename: string; language: string; code: string }> = {
  tauri: {
    filename: 'main.rs',
    language: 'rust',
    code: `// Hendy Tools High-Performance Native Core
// Cross-platform engine for Windows, macOS, and Linux
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("[SYSTEM] Khởi động lõi xử lý Hendy Core Native...");
    let config = hendy_runtime::Config::default()
        .with_concurrency(16)
        .with_memory_cap_mb(512);

    println!("[SECURITY] Đã nạp chứng chỉ Authenticode EV & mã hóa AES-256.");
    hendy_runtime::bootstrap(config).await?;
    Ok(())
}`,
  },
  typescript: {
    filename: 'server.ts',
    language: 'typescript',
    code: `import express from 'express';
import { createServer } from 'http';

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Hendy Server Plus Edge',
  });
});

const PORT = process.env.PORT || 3000;
createServer(app).listen(PORT, () => {
  console.log(\`[SERVER] Đang lắng nghe trên cổng \${PORT}\`);
});`,
  },
  python: {
    filename: 'app.py',
    language: 'python',
    code: `# Hendy Tools Python Fast Automation Engine
import os
import sys
import json

def run_pipeline():
    print("[HENDY] Khoi tao pipeline xu ly du lieu...")
    payload = {"status": "ready", "version": "3.1.2"}
    print(f"[OK] Payload khoi tao: {json.dumps(payload)}")

if __name__ == "__main__":
    run_pipeline()`,
  },
  wasm: {
    filename: 'core.cpp',
    language: 'cpp',
    code: `#include <iostream>
#include <vector>

extern "C" {
    int compute_checksum(const char* data, int length) {
        int hash = 5381;
        for (int i = 0; i < length; ++i) {
            hash = ((hash << 5) + hash) + data[i];
        }
        return hash;
    }
}`,
  },
};

export const CodePasteInput: React.FC<CodePasteInputProps> = ({
  onAddOrUpdateFile,
  existingFilesCount,
}) => {
  const [filename, setFilename] = useState('main.rs');
  const [language, setLanguage] = useState('rust');
  const [code, setCode] = useState(TEMPLATES.tauri.code);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setCode(text);
          // Simple auto-detect extension based on keywords
          if (text.includes('fn main()') || text.includes('use std::')) {
            setFilename('main.rs');
            setLanguage('rust');
          } else if (text.includes('import React') || text.includes('interface ')) {
            setFilename('App.tsx');
            setLanguage('typescript');
          } else if (text.includes('def ') || text.includes('import sys')) {
            setFilename('app.py');
            setLanguage('python');
          } else if (text.includes('#include <')) {
            setFilename('main.cpp');
            setLanguage('cpp');
          } else if (text.includes('package main')) {
            setFilename('main.go');
            setLanguage('go');
          }
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 2000);
        }
      }
    } catch {
      // Clipboard access denied, user can paste directly in textarea
    }
  };

  const loadTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (t) {
      setFilename(t.filename);
      setLanguage(t.language);
      setCode(t.code);
    }
  };

  const handleSaveCode = () => {
    if (!code.trim()) return;
    onAddOrUpdateFile({
      name: filename.trim() || 'source_code.txt',
      language,
      content: code,
    });
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  const lineCount = code.split('\n').length;
  const charCount = code.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Dán mã nguồn trực tiếp (Paste Source Code)</h3>
            <p className="text-xs text-slate-400">
              Dán bất kỳ đoạn mã Rust, C++, Go, TypeScript, Python để đóng gói thành ứng dụng nhị phân.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
            <span>{copiedSuccess ? 'Đã dán từ bộ nhớ tạm' : 'Dán từ clipboard'}</span>
          </button>
        </div>
      </div>

      {/* Preset templates selector */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Mẫu sẵn có:
        </span>
        <button
          type="button"
          onClick={() => loadTemplate('tauri')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
        >
          Rust Desktop (Tauri)
        </button>
        <button
          type="button"
          onClick={() => loadTemplate('typescript')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
        >
          TypeScript Backend
        </button>
        <button
          type="button"
          onClick={() => loadTemplate('python')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
        >
          Python Fast Engine
        </button>
        <button
          type="button"
          onClick={() => loadTemplate('wasm')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
        >
          C++ WebAssembly
        </button>
      </div>

      {/* File metadata input */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Tên file nguồn:</label>
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="bg-transparent text-slate-200 outline-none w-full font-mono"
              placeholder="e.g. main.rs, index.ts, app.py"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Ngôn ngữ lập trình:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
          >
            <option value="rust">Rust (.rs)</option>
            <option value="cpp">C / C++ (.c, .cpp)</option>
            <option value="go">Go (.go)</option>
            <option value="typescript">TypeScript (.ts, .tsx)</option>
            <option value="javascript">JavaScript (.js)</option>
            <option value="python">Python (.py)</option>
            <option value="json">JSON / Config (.json)</option>
          </select>
        </div>
      </div>

      {/* Code Textarea */}
      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={12}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 leading-relaxed outline-none focus:border-blue-500/60 resize-y"
          placeholder="// Dán toàn bộ mã nguồn của bạn vào đây..."
          spellCheck={false}
        />
        <div className="absolute bottom-3 right-3 text-[11px] text-slate-500 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 font-mono">
          {lineCount} dòng · {charCount} ký tự
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="text-xs text-slate-400">
          Hiện có: <span className="text-slate-200 font-semibold">{existingFilesCount}</span> file trong dự án
        </div>

        <button
          type="button"
          onClick={handleSaveCode}
          disabled={!code.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {addedSuccess ? <Check className="w-4 h-4 text-white" /> : <FileText className="w-4 h-4" />}
          <span>{addedSuccess ? 'Đã nạp file vào dự án!' : 'Nạp file này vào dự án đóng gói'}</span>
        </button>
      </div>
    </div>
  );
};
