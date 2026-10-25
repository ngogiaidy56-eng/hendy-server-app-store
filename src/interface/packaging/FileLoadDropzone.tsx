/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FolderArchive, FileCode, CheckCircle, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { generatePseudoSha256 } from '../../utils/packaging.ts';

export interface LoadedSourceFile {
  name: string;
  size: number;
  language: string;
  content: string;
  sha256?: string;
}

interface FileLoadDropzoneProps {
  files: LoadedSourceFile[];
  onFilesLoaded: (newFiles: LoadedSourceFile[]) => void;
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
}

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'rs':
      return 'rust';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'go':
      return 'go';
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    default:
      return 'plaintext';
  }
}

export const FileLoadDropzone: React.FC<FileLoadDropzoneProps> = ({
  files,
  onFilesLoaded,
  onRemoveFile,
  onClearAll,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileList = async (fileList: FileList | File[]) => {
    setIsProcessing(true);
    setStatusMessage('Đang phân tích và nạp tệp mã nguồn...');
    const resultFiles: LoadedSourceFile[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.name.endsWith('.zip')) {
          setStatusMessage(`Đang giải nén gói lưu trữ ${file.name}...`);
          const zipBuffer = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(zipBuffer);

          const entries = Object.keys(zip.files);
          for (const relativePath of entries) {
            const entry = zip.files[relativePath];
            if (!entry.dir && !relativePath.includes('__MACOSX')) {
              try {
                const text = await entry.async('string');
                const sha = generatePseudoSha256(text);
                resultFiles.push({
                  name: relativePath,
                  size: text.length,
                  language: detectLanguage(relativePath),
                  content: text,
                  sha256: sha,
                });
              } catch {
                // Ignore binary entries in zip
              }
            }
          }
        } else {
          const text = await file.text();
          const sha = generatePseudoSha256(text);
          resultFiles.push({
            name: file.name,
            size: file.size,
            language: detectLanguage(file.name),
            content: text,
            sha256: sha,
          });
        }
      }

      if (resultFiles.length > 0) {
        onFilesLoaded(resultFiles);
        setStatusMessage(`Đã nạp thành công ${resultFiles.length} tệp mã nguồn.`);
      } else {
        setStatusMessage('Không tìm thấy tệp văn bản/mã nguồn hợp lệ trong dữ liệu tải lên.');
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi đọc tệp: ${err.message || 'Không thể giải mã'}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Tải lên tệp mã nguồn hoặc file .ZIP (Load Source Files)</h3>
            <p className="text-xs text-slate-400">
              Kéo thả các tệp mã nguồn đơn lẻ hoặc nguyên kho nén .zip để nạp nhanh vào trình đóng gói ứng dụng.
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa toàn bộ tệp ({files.length})</span>
          </button>
        )}
      </div>

      {/* Drag & Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-950/20 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".rs,.ts,.tsx,.js,.jsx,.py,.go,.cpp,.c,.h,.hpp,.json,.html,.css,.zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFileList(e.target.files);
            }
          }}
        />

        <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-emerald-400">
          <FolderArchive className="w-6 h-6" />
        </div>

        <p className="text-sm font-medium text-slate-200 mb-1">
          Kéo thả tệp mã nguồn hoặc tệp .ZIP vào đây, hoặc <span className="text-emerald-400 underline">duyệt từ máy tính</span>
        </p>
        <p className="text-xs text-slate-500 max-w-md">
          Hỗ trợ: Rust (.rs), TypeScript (.ts, .tsx), Python (.py), Go (.go), C/C++ (.cpp), Web (.js, .html, .css) và các kho lưu trữ nén (.zip).
        </p>

        {isProcessing && (
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-400">
            <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Đang giải nén và xử lý tệp...</span>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 text-xs p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Files List Table */}
      {files.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Danh sách tệp nguồn đã nạp ({files.length} tệp):</span>
            <span className="font-mono text-emerald-400">
              Tổng dung lượng: {(files.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800 rounded-lg bg-slate-950">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="px-3 py-2 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-mono text-slate-200 truncate">{file.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono shrink-0">
                    {file.language}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {file.sha256 && (
                    <span
                      className="font-mono text-[10px] text-slate-500 hidden md:inline truncate max-w-[140px]"
                      title={`SHA-256: ${file.sha256}`}
                    >
                      {file.sha256.substring(0, 12)}...
                    </span>
                  )}
                  <span className="font-mono text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="Xóa tệp khỏi dự án"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-slate-500">
          Chưa có tệp nào được nạp. Hãy dán mã nguồn ở thẻ bên hoặc tải tệp/kho nén .zip vào đây.
        </div>
      )}
    </div>
  );
};
