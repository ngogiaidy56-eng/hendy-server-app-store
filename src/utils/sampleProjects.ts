/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectTemplate } from '../types/index.ts';

export const SAMPLE_PROJECTS: ProjectTemplate[] = [
  {
    id: 'proj-hendytools',
    name: 'Hendy Tools Pro',
    slug: 'hendytools',
    tagline: 'Bộ Công Cụ Tối Ưu Hệ Thống, Giám Sát Máy Chủ & Bảo Mật Authenticode Đa Nền Tảng',
    description: 'Ứng dụng chính thức của Hendy Tools dành cho Windows 11, Android 15 và iOS. Tích hợp công cụ dọn dẹp NVMe, giám sát tiến trình thời gian thực, quản lý dịch vụ và ký số Authenticode EV.',
    category: 'Hệ Thống & Hiệu Năng Cao',
    framework: 'Rust + Tauri',
    currentVersion: 'v3.1.2',
    bundleIdentifier: 'com.hendytools.pro',
    publisher: 'Hendy Ngo Systems',
    websiteUrl: 'https://hendytools.pages.dev',
    githubRepo: 'https://github.com/hendyngo-servers/HendyToolsPlatform',
    securityLevel: 'Enterprise High',
    storeMeta: {
      rating: 5.0,
      reviewCount: 4920,
      downloadsCount: '200K+',
      badge: 'VerifiedPro',
      badgeLabel: 'Bản Phát Hành Xác Thực',
      ageRating: 'Phù hợp mọi lứa tuổi',
      categoryLabel: 'Công Cụ Tối Ưu & Bảo Mật',
      screenshots: [
        { id: 'ht-ss-1', caption: 'Bảng điều khiển giám sát tài nguyên CPU, RAM, NVMe và cổng mạng theo thời gian thực', mode: 'desktop' },
        { id: 'ht-ss-2', caption: 'Kiểm tra tính toàn vẹn mã băm SHA-256 đối chiếu chứng chỉ Authenticode EV', mode: 'desktop' },
        { id: 'ht-ss-3', caption: 'Giao diện tối ưu hóa Midnight Aerodynamic đa nền tảng Windows, Android, iOS', mode: 'canvas' }
      ],
      dataSafety: {
        collectedData: 'Không thu thập dữ liệu người dùng, không telemetry ẩn danh',
        securityPractice: 'Chứng chỉ EV Code Signing, xác thực mã băm SHA-256 toàn vẹn',
        encryptionStandard: 'AES-256 Hardware Enclave & Authenticode EV'
      },
      systemRequirements: {
        minOs: 'Windows 10/11 64-bit, Android 9.0+, iOS 16.0+, macOS 12.0+',
        recommendedRam: '4 GB RAM (Tối thiểu 1 GB RAM)',
        diskSpace: '60 MB dung lượng trống',
        gpuReq: 'DirectX 11 hoặc Metal tương thích'
      },
      reviews: [
        {
          id: 'ht-rev-1',
          author: 'Lê Hoàng Long (Chuyên gia Bảo mật Hệ thống)',
          rating: 5,
          date: '22 Tháng 10, 2026',
          comment: 'Bản phát hành Windows 3.1.2 ký số Authenticode EV cực kỳ mượt mà, cài đặt hoàn toàn sạch không bị báo SmartScreen.',
          platform: 'Windows 11 x86_64',
          verifiedInstall: true
        },
        {
          id: 'ht-rev-2',
          author: 'Phạm Thanh Sơn (Kỹ sư Quản trị Cloudflare)',
          rating: 5,
          date: '20 Tháng 10, 2026',
          comment: 'Cơ chế đồng bộ R2 và tải nhanh qua Cloudflare CDN rất ấn tượng. Ứng dụng dọn dẹp SSD NVMe nhanh hơn 40%.',
          platform: 'Android 15 arm64',
          verifiedInstall: true
        }
      ]
    },
    files: [
      {
        id: 'ht-tauri-conf',
        name: 'tauri.conf.json',
        path: '/src-tauri/tauri.conf.json',
        language: 'json',
        content: `{\n  "package": { "productName": "HendyToolsPro", "version": "3.1.2" },\n  "tauri": {\n    "bundle": {\n      "identifier": "com.hendytools.pro",\n      "targets": ["msi", "nsis", "deb", "appimage"],\n      "windows": {\n        "certificateThumbprint": "A9F23B817E4C0D6E5A28190B38914F26C9E8A731",\n        "digestAlgorithm": "sha256"\n      }\n    }\n  }\n}`
      },
      {
        id: 'ht-main-rs',
        name: 'main.rs',
        path: '/src-tauri/src/main.rs',
        language: 'rust',
        isEntry: true,
        content: `// Hendy Tools Pro Native Engine\n#[tauri::command]\nfn check_nvme_health() -> Result<String, String> {\n    Ok("NVMe S.M.A.R.T Status: 100% Healthy".into())\n}\n\nfn main() {\n    tauri::Builder::default()\n        .invoke_handler(tauri::generate_handler![check_nvme_health])\n        .run(tauri::generate_context!())\n        .expect("Error running Hendy Tools Pro");\n}`
      }
    ],
    platforms: [
      {
        platform: 'windows',
        displayName: 'Windows (10 / 11 64-bit)',
        iconName: 'windows',
        enabled: true,
        selectedArch: 'x86_64',
        selectedFormat: '.exe',
        signingEnabled: true,
        formats: [
          { format: '.exe', name: 'Gói Cài Đặt Hendy Tools (.exe)', description: 'Ký số Authenticode EV chính thức', defaultSelected: true, architectures: ['x86_64'] }
        ]
      },
      {
        platform: 'android',
        displayName: 'Android (APK 64-bit)',
        iconName: 'android',
        enabled: true,
        selectedArch: 'arm64',
        selectedFormat: '.apk',
        signingEnabled: true,
        formats: [
          { format: '.apk', name: 'Tệp Ứng Dụng Hendy Tools (.apk)', description: 'Tương thích Android 9 đến 15', defaultSelected: true, architectures: ['arm64'] }
        ]
      },
      {
        platform: 'ios',
        displayName: 'iOS (Apple App Store / IPA)',
        iconName: 'apple',
        enabled: true,
        selectedArch: 'arm64',
        selectedFormat: '.ipa',
        signingEnabled: true,
        formats: [
          { format: '.ipa', name: 'Gói Cài Đặt Hendy Tools (.ipa)', description: 'Phân phối qua TestFlight & App Store', defaultSelected: true, architectures: ['arm64'] }
        ]
      }
    ],
    releases: [
      {
        version: 'v3.1.2',
        tag: 'v3.1.2',
        releaseDate: '15 Tháng 10, 2026',
        channel: 'stable',
        title: 'Hendy Tools 3.1.2 — Ký số Authenticode EV & Cloudflare R2 Edge Delivery',
        changelog: [
          'Tích hợp chuẩn chứng chỉ số Authenticode Extended Validation (EV) trên Windows 11.',
          'Tối ưu hóa đa luồng xử lý I/O đĩa cứng NVMe giúp tăng tốc độ dọn dẹp thêm 42%.',
          'Công cụ phân tích tiến trình thời gian thực với cảnh báo rò rỉ bộ nhớ RAM.',
          'Sửa lỗi xung đột khi chạy cùng các phần mềm ảo hóa WSL2 và Hyper-V.'
        ],
        published: true,
        artifacts: [
          {
            id: 'art-ht-win',
            platform: 'windows',
            format: '.exe',
            arch: 'x86_64',
            filename: 'HendyToolsPro-3.1.2-Setup.exe',
            sizeBytes: 49283072,
            sha256: '9f833a69a3b684cb3e0a2944b02927e163533446955a8f57297ff055f10667e8',
            downloadUrl: '/api/v1/releases/download?platform=windows&channel=stable',
            createdAt: '2026-10-15T08:00:00Z',
            verified: true,
            signatureInfo: {
              issuer: 'DigiCert Authenticode Extended Validation EV G4',
              certificateType: 'Authenticode EV Code Signing',
              timestamp: '2026-10-15T08:01:22Z',
              serialNumber: 'A9F2-3B81-7E4C-0D6E-5A28-190B'
            }
          },
          {
            id: 'art-ht-android',
            platform: 'android',
            format: '.apk',
            arch: 'arm64',
            filename: 'HendyTools-3.1.2-arm64.apk',
            sizeBytes: 28419072,
            sha256: '4b29c9a6e11894a457008cf82f672ea34b3e34b92b0a96939e6df74e3da8f991',
            downloadUrl: '/api/v1/releases/download?platform=android&channel=stable',
            createdAt: '2026-10-15T08:30:00Z',
            verified: true,
            signatureInfo: {
              issuer: 'Google Play App Signing v4',
              certificateType: 'Android APK Signature Scheme v3',
              timestamp: '2026-10-15T08:31:00Z',
              serialNumber: 'PLAY-9941-8812-7721'
            }
          },
          {
            id: 'art-ht-ios',
            platform: 'ios',
            format: '.ipa',
            arch: 'arm64',
            filename: 'HendyTools-iOS-3.1.2.ipa',
            sizeBytes: 34182900,
            sha256: '82ab5842813df1db8849b29cb8d95180ce91ebc569f6e6d42da759b4c09d724f',
            downloadUrl: '/api/v1/releases/download?platform=ios&channel=stable',
            createdAt: '2026-10-15T09:00:00Z',
            verified: true,
            signatureInfo: {
              issuer: 'Apple Worldwide Developer Relations Certification Authority',
              certificateType: 'Apple Developer ID / TestFlight',
              timestamp: '2026-10-15T09:02:10Z',
              serialNumber: 'APPL-IPA-2026-3129'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'proj-hyperterminal',
    name: 'HyperTerminal Pro',
    slug: 'hyperterminal',
    tagline: 'Phần Mềm Giám Sát Hệ Thống & Giả Lập Terminal Đa Nền Tảng Tăng Tốc Phần Cứng',
    description: 'Ứng dụng giám sát tài nguyên CPU/GPU, luồng mạng thời gian thực và quản lý dòng lệnh đa phiên bản với độ trễ cực thấp cho mọi hệ điều hành máy tính và web.',
    category: 'Công Cụ Hệ Thống & Quản Trị',
    framework: 'Rust + Tauri',
    currentVersion: 'v2.4.0',
    bundleIdentifier: 'vn.forgeos.hyperterminal',
    publisher: 'ForgeOS Enterprise Việt Nam',
    websiteUrl: 'https://hyperterminal.forgeos.vn',
    githubRepo: 'https://github.com/forgeos-enterprise/hyperterminal-core',
    securityLevel: 'Enterprise High',
    storeMeta: {
      rating: 4.9,
      reviewCount: 3840,
      downloadsCount: '150K+',
      badge: 'EditorChoice',
      badgeLabel: 'Lựa Chọn Của Biên Tập Viên',
      ageRating: 'Phù hợp mọi lứa tuổi',
      categoryLabel: 'Công Cụ Năng Suất & Kỹ Thuật',
      screenshots: [
        { id: 'ss-1', caption: 'Bảng giám sát GPU, CPU và luồng mạng thời gian thực với độ trễ < 1ms', mode: 'desktop' },
        { id: 'ss-2', caption: 'Trình quản lý PTY phiên bản đa luồng hỗ trợ phân chia cửa sổ không giới hạn', mode: 'desktop' },
        { id: 'ss-3', caption: 'Khởi chạy trực tiếp qua WebAssembly không cần quyền quản trị viên', mode: 'canvas' }
      ],
      dataSafety: {
        collectedData: 'Không thu thập bất kỳ dữ liệu cá nhân hay lịch sử dòng lệnh nào',
        securityPractice: 'Mã hóa hoàn toàn tại máy khách, không gửi dữ liệu ra máy chủ bên ngoài',
        encryptionStandard: 'AES-256-GCM Hardware TPM Enclave'
      },
      systemRequirements: {
        minOs: 'Windows 10+, macOS 11.0+, Ubuntu 20.04+, Chrome 90+',
        recommendedRam: '4 GB RAM (Tối thiểu 1 GB RAM)',
        diskSpace: '85 MB dung lượng trống',
        gpuReq: 'Hỗ trợ phần cứng DirectX 11, Metal 2 hoặc Vulkan'
      },
      reviews: [
        {
          id: 'rev-1',
          author: 'Nguyễn Minh Tuấn (Kỹ sư DevOps tại FPT Software)',
          rating: 5,
          date: '20 Tháng 10, 2026',
          comment: 'Ứng dụng mở cực kỳ nhanh trên Apple Silicon M3, chiếm chưa tới 25MB RAM. Tính năng phân chia cửa sổ PTY giúp mình quản lý cụm Kubernetes rất tiện lợi.',
          platform: 'macOS Universal',
          verifiedInstall: true
        },
        {
          id: 'rev-2',
          author: 'Trần Văn Hoàng (Quản trị viên Hệ thống Viettel IDC)',
          rating: 5,
          date: '18 Tháng 10, 2026',
          comment: 'Chứng chỉ EV Code Signing chuẩn chỉ, cài trên Windows 11 Enterprise không hề bị SmartScreen chặn. Rất khuyến nghị cho các nhóm kỹ thuật.',
          platform: 'Windows 11 x86_64',
          verifiedInstall: true
        },
        {
          id: 'rev-3',
          author: 'Lê Thu Trang (Chuyên viên An toàn thông tin)',
          rating: 5,
          date: '15 Tháng 10, 2026',
          comment: 'Thích nhất là có thể chạy thử trực tiếp WebAssembly trên trình duyệt trước khi tải tệp nhị phân về máy. Đánh giá 5 sao!',
          platform: 'Web / Linux AppImage',
          verifiedInstall: true
        }
      ]
    },
    files: [
      {
        id: 'file-tauri-conf',
        name: 'tauri.conf.json',
        path: '/src-tauri/tauri.conf.json',
        language: 'json',
        encrypted: true,
        securityHash: 'sha256-a19e83f2001c9a',
        content: `{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/tooling/cli/schema.json",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "package": {
    "productName": "HyperTerminal",
    "version": "2.4.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["msi", "nsis", "dmg", "deb", "appimage"],
      "identifier": "vn.forgeos.hyperterminal",
      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"],
      "windows": {
        "certificateThumbprint": "EV_COMMERCIAL_CERT_VN_2026",
        "digestAlgorithm": "sha256",
        "wix": { "language": "vi-VN" }
      },
      "macOS": {
        "entitlements": "./entitlements.plist",
        "minimumSystemVersion": "11.0",
        "hardenedRuntime": true
      }
    },
    "windows": [
      {
        "title": "HyperTerminal Pro - Tiêu Chuẩn Thương Mại",
        "width": 1100,
        "height": 720,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}`
      },
      {
        id: 'file-main-rs',
        name: 'main.rs',
        path: '/src-tauri/src/main.rs',
        language: 'rust',
        isEntry: true,
        encrypted: true,
        securityHash: 'sha256-b84719fbc901a',
        content: `// Ngăn chặn cửa sổ console phụ trên Windows trong bản phát hành thương mại
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, State};
use std::sync::Mutex;

struct TerminalState {
    active_sessions: Mutex<u32>,
}

#[command]
fn get_system_telemetry() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "cores": num_cpus::get(),
        "status": "hoạt động ổn định",
        "security": "EV Signature Verified"
    })
}

#[command]
fn spawn_pty_session(shell: String) -> Result<String, String> {
    println!("Khởi tạo phiên PTY với shell bảo mật: {}", shell);
    Ok("session_pty_001_ready".into())
}

fn main() {
    tauri::Builder::default()
        .manage(TerminalState { active_sessions: Mutex::new(0) })
        .invoke_handler(tauri::generate_handler![get_system_telemetry, spawn_pty_session])
        .run(tauri::generate_context!())
        .expect("Lỗi trong quá trình khởi chạy phần mềm HyperTerminal");
}`
      },
      {
        id: 'file-cargo-toml',
        name: 'Cargo.toml',
        path: '/src-tauri/Cargo.toml',
        language: 'toml',
        content: `[package]
name = "hyperterminal"
version = "2.4.0"
description = "Phần mềm terminal đa nền tảng tăng tốc phần cứng"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = ["tray-icon", "notification"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
num_cpus = "1.16"
portable-pty = "0.8"
`
      },
      {
        id: 'file-frontend-app',
        name: 'App.tsx',
        path: '/src/App.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react';

export default function HyperTerminalUI() {
  const [history, setHistory] = useState<string[]>([
    'HyperTerminal Pro v2.4.0 [x86_64/arm64-apple-darwin]',
    'Kết nối máy chủ: pty.local.0 - Trạng thái bảo mật cao',
    'Nhập "help", "sysinfo", "kiem-tra" hoặc "top" để bắt đầu.'
  ]);
  const [command, setCommand] = useState('');

  const executeCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    setHistory(prev => [...prev, \`$ \${command}\`, \`Thực thi lệnh '\${command}' thành công.\`]);
    setCommand('');
  };

  return (
    <div className="bg-slate-950 text-emerald-400 font-mono p-4 rounded-lg h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-1">
        {history.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
      <form onSubmit={executeCommand} className="flex gap-2 pt-2 border-t border-slate-800">
        <span className="text-slate-500">$</span>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Nhập lệnh thực thi..."
          className="bg-transparent border-none outline-none flex-1 text-slate-100"
        />
      </form>
    </div>
  );
}`
      }
    ],
    platforms: [
      {
        platform: 'windows',
        displayName: 'Windows (10 / 11 / Server 64-bit)',
        iconName: 'windows',
        enabled: true,
        selectedArch: 'x86_64',
        selectedFormat: '.exe',
        signingEnabled: true,
        formats: [
          { format: '.exe', name: 'Trình Cài Đặt NSIS Tự Động', description: 'Gói cài đặt độc lập với lối tắt Desktop và Menu Start', defaultSelected: true, architectures: ['x86_64', 'arm64'] },
          { format: '.msi', name: 'Gói Doanh Nghiệp Windows (MSI)', description: 'Triển khai hàng loạt qua Active Directory / GPO', defaultSelected: false, architectures: ['x86_64'] }
        ]
      },
      {
        platform: 'macos',
        displayName: 'macOS (Apple Silicon & Intel Universal)',
        iconName: 'apple',
        enabled: true,
        selectedArch: 'universal',
        selectedFormat: '.dmg',
        signingEnabled: true,
        entitlements: ['com.apple.security.network.client', 'com.apple.security.files.user-selected.read-write'],
        formats: [
          { format: '.dmg', name: 'Đĩa Ảnh Apple Disk Image (DMG)', description: 'Kéo thả ứng dụng với hình nền hướng dẫn chuẩn Apple', defaultSelected: true, architectures: ['universal', 'arm64', 'x86_64'] },
          { format: '.pkg', name: 'Bộ Cài Đặt Hệ Thống (.pkg)', description: 'Cài đặt tự động không cần can thiệp cho quản trị viên MDM', defaultSelected: false, architectures: ['universal'] }
        ]
      },
      {
        platform: 'linux',
        displayName: 'Linux (Ubuntu, Debian, Fedora, Arch)',
        iconName: 'linux',
        enabled: true,
        selectedArch: 'x86_64',
        selectedFormat: '.AppImage',
        signingEnabled: false,
        formats: [
          { format: '.AppImage', name: 'Gói Chạy Mọi Nơi AppImage', description: 'Nhấp đúp chuột để chạy ngay, tích hợp sẵn thư viện độc lập', defaultSelected: true, architectures: ['x86_64', 'arm64'] },
          { format: '.deb', name: 'Gói Cài Đặt Debian / Ubuntu (.deb)', description: 'Tích hợp kho quản trị apt-get và dpkg', defaultSelected: false, architectures: ['x86_64', 'arm64'] },
          { format: '.tar.gz', name: 'Tệp Nén Nhị Phân (.tar.gz)', description: 'Mã nhị phân trực tiếp cho máy chủ và môi trường CLI', defaultSelected: false, architectures: ['x86_64'] }
        ]
      },
      {
        platform: 'android',
        displayName: 'Android (Gói Cài Đặt Di Động)',
        iconName: 'android',
        enabled: true,
        selectedArch: 'arm64',
        selectedFormat: '.apk',
        signingEnabled: true,
        formats: [
          { format: '.apk', name: 'Tệp Ứng Dụng Android APK', description: 'Cài đặt trực tiếp hoặc nạp qua ADB/Google Play', defaultSelected: true, architectures: ['arm64'] }
        ]
      },
      {
        platform: 'web',
        displayName: 'Trình Duyệt Web (WASM & PWA)',
        iconName: 'globe',
        enabled: true,
        selectedArch: 'wasm',
        selectedFormat: '.wasm',
        signingEnabled: false,
        formats: [
          { format: '.wasm', name: 'Môi Trường Trực Tiếp WebAssembly', description: 'Chạy trực tiếp trong hộp cát trình duyệt, không cần cài đặt', defaultSelected: true, architectures: ['wasm'] }
        ]
      }
    ],
    releases: [
      {
        version: 'v2.4.0',
        tag: 'v2.4.0',
        releaseDate: '22 Tháng 10, 2026',
        channel: 'stable',
        title: 'Nâng Cấp Hiệu Năng GPU & Tương Thích Đa Nền Tảng Thương Mại',
        changelog: [
          'Hỗ trợ nhị phân Universal ARM64 cho Apple Silicon M-Series và Intel x86_64.',
          'Nâng cấp nhân PTY Rust 0.8 giảm 60% độ trễ nhập liệu dòng lệnh.',
          'Tích hợp chứng chỉ ký số thương mại EV Code Signing, loại bỏ cảnh báo SmartScreen.',
          'Đối soát mã băm SHA-256 tự động trên mọi tệp cài đặt phân phối.'
        ],
        published: true,
        artifacts: [
          {
            id: 'art-win-1',
            platform: 'windows',
            format: '.exe',
            arch: 'x86_64',
            filename: 'hyperterminal-v2.4.0-x86_64-setup.exe',
            sizeBytes: 42104832,
            sha256: '9f83a4c2810f4438b919a7384a205128dfac90348a274910cf981fcae0471b02',
            downloadUrl: '/api/download/hyperterminal-v2.4.0-x86_64-setup.exe',
            createdAt: '2026-10-22T08:00:00Z',
            verified: true,
            signatureInfo: {
              issuer: 'DigiCert EV Code Signing CA G3',
              certificateType: 'Extended Validation (EV)',
              timestamp: '2026-10-22T08:02:15Z',
              serialNumber: '7A49-8F12-BC34-99DE'
            }
          },
          {
            id: 'art-mac-1',
            platform: 'macos',
            format: '.dmg',
            arch: 'universal',
            filename: 'hyperterminal-v2.4.0-universal.dmg',
            sizeBytes: 51380224,
            sha256: 'a140d34b9213456cb049e29a3fa8d39201948fc20194bc028190283940192841',
            downloadUrl: '/api/download/hyperterminal-v2.4.0-universal.dmg',
            createdAt: '2026-10-22T08:05:00Z',
            verified: true,
            signatureInfo: {
              issuer: 'Apple Developer ID Application: ForgeOS VN',
              certificateType: 'Notarized by Apple Cloud (Ticket Attached)',
              timestamp: '2026-10-22T08:06:40Z',
              serialNumber: 'APPL-9921-X812-4412'
            }
          },
          {
            id: 'art-linux-1',
            platform: 'linux',
            format: '.AppImage',
            arch: 'x86_64',
            filename: 'hyperterminal-v2.4.0-x86_64.AppImage',
            sizeBytes: 47185920,
            sha256: '729b40128374a2b9102849182374918237498127394812374918273941823749',
            downloadUrl: '/api/download/hyperterminal-v2.4.0-x86_64.AppImage',
            createdAt: '2026-10-22T08:10:00Z',
            verified: true
          }
        ]
      }
    ]
  },
  {
    id: 'proj-omnicanvas',
    name: 'OmniCanvas Studio',
    slug: 'omnicanvas',
    tagline: 'Bộ Phần Mềm Thiết Kế Đồ Họa Vector & Dàn Trang Giao Diện Chuẩn Doanh Nghiệp',
    description: 'Công cụ vẽ vector chính xác cao, chỉnh sửa đường cong Bezier và thiết kế hệ thống UI/UX được biên dịch ra nhị phân máy tính và WebAssembly chạy mượt mà 60 FPS.',
    category: 'Đồ Họa & Thiết Kế Giao Diện',
    framework: 'C++ / Wasm',
    currentVersion: 'v1.8.2',
    bundleIdentifier: 'vn.forgeos.omnicanvas',
    publisher: 'Omni Design Systems VN',
    websiteUrl: 'https://omnicanvas.forgeos.vn',
    githubRepo: 'https://github.com/forgeos-enterprise/omnicanvas',
    securityLevel: 'Commercial Standard',
    storeMeta: {
      rating: 4.8,
      reviewCount: 2150,
      downloadsCount: '80K+',
      badge: 'Trending',
      badgeLabel: 'Xu Hướng Sáng Tạo',
      ageRating: 'Phù hợp mọi lứa tuổi',
      categoryLabel: 'Thiết Kế Đồ Họa & Minh Họa',
      screenshots: [
        { id: 'ss-omni-1', caption: 'Chỉnh sửa đường cong Bezier đa điểm với công nghệ rasterization Skia GPU', mode: 'canvas' },
        { id: 'ss-omni-2', caption: 'Xuất tệp SVG chuẩn công nghiệp và nhúng WebAssembly thời gian thực', mode: 'desktop' }
      ],
      dataSafety: {
        collectedData: 'Không thu thập bất kỳ hình ảnh hay bản vẽ thiết kế nào của người dùng',
        securityPractice: 'Lưu trữ cục bộ trực tiếp trên ổ cứng thiết bị',
        encryptionStandard: 'Chuẩn lưu trữ an toàn OS Sandbox'
      },
      systemRequirements: {
        minOs: 'Windows 10, macOS Monterey 12.0+, Linux x86_64',
        recommendedRam: '8 GB RAM (Tối thiểu 2 GB RAM)',
        diskSpace: '140 MB dung lượng trống',
        gpuReq: 'Bộ xử lý đồ họa tích hợp hoặc rời hỗ trợ WebGL 2.0 / Metal'
      },
      reviews: [
        {
          id: 'rev-omni-1',
          author: 'Đặng Thanh Tâm (Trưởng nhóm UI/UX tại VNG Corporation)',
          rating: 5,
          date: '21 Tháng 10, 2026',
          comment: 'Công cụ vẽ vector cực nhẹ và mượt. Đường cong Bezier chuẩn xác từng pixel, xuất tệp SVG sạch không bị rác code.',
          platform: 'macOS Universal',
          verifiedInstall: true
        }
      ]
    },
    files: [
      {
        id: 'file-cmakelists',
        name: 'CMakeLists.txt',
        path: '/CMakeLists.txt',
        language: 'cmake',
        content: `cmake_minimum_required(VERSION 3.22)
project(OmniCanvas VERSION 1.8.2 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(EMSCRIPTEN)
  add_executable(omnicanvas src/core/engine.cpp)
  set_target_properties(omnicanvas PROPERTIES LINK_FLAGS "-s WASM=1 -s USE_SDL=2 -O3")
else()
  add_executable(omnicanvas src/core/engine.cpp)
endif()
`
      },
      {
        id: 'file-engine-cpp',
        name: 'engine.cpp',
        path: '/src/core/engine.cpp',
        language: 'cpp',
        isEntry: true,
        encrypted: true,
        securityHash: 'sha256-c7719283749182',
        content: `#include <iostream>
#include <vector>

struct VectorNode {
    float x, y;
    float control_x1, control_y1;
    float control_x2, control_y2;
};

class CanvasEngine {
public:
    void render_path(const std::vector<VectorNode>& nodes) {
        std::cout << "Rendering Bezier curve with " << nodes.size() << " control points." << std::endl;
    }
};

int main() {
    std::cout << "OmniCanvas Vector Engine v1.8.2 khoi dong thanh cong." << std::endl;
    return 0;
}`
      }
    ],
    platforms: [
      {
        platform: 'windows',
        displayName: 'Windows (.exe / .msi)',
        iconName: 'windows',
        enabled: true,
        selectedArch: 'x86_64',
        selectedFormat: '.exe',
        signingEnabled: true,
        formats: [{ format: '.exe', name: 'Trình Cài Đặt NSIS', description: 'Bộ cài đặt chính thức cho Windows', defaultSelected: true, architectures: ['x86_64'] }]
      },
      {
        platform: 'macos',
        displayName: 'macOS (.dmg Universal)',
        iconName: 'apple',
        enabled: true,
        selectedArch: 'universal',
        selectedFormat: '.dmg',
        signingEnabled: true,
        formats: [{ format: '.dmg', name: 'Đĩa Ảnh DMG', description: 'Universal binary cho Apple Silicon và Intel', defaultSelected: true, architectures: ['universal'] }]
      },
      {
        platform: 'web',
        displayName: 'WebAssembly Trình Duyệt',
        iconName: 'globe',
        enabled: true,
        selectedArch: 'wasm',
        selectedFormat: '.wasm',
        signingEnabled: false,
        formats: [{ format: '.wasm', name: 'Gói WebAssembly', description: 'Chạy trực tiếp không cần cài đặt', defaultSelected: true, architectures: ['wasm'] }]
      }
    ],
    releases: [
      {
        version: 'v1.8.2',
        tag: 'v1.8.2',
        releaseDate: '20 Tháng 10, 2026',
        channel: 'stable',
        title: 'Tăng Tốc Đồ Họa Skia & Xuất Bản WebAssembly',
        changelog: [
          'Tăng tốc phần cứng Skia trên Metal (macOS) và DirectX 12 (Windows).',
          'Mô-đun WebAssembly tối ưu 60 FPS trong môi trường trình duyệt an toàn.'
        ],
        published: true,
        artifacts: [
          {
            id: 'art-omni-win',
            platform: 'windows',
            format: '.exe',
            arch: 'x86_64',
            filename: 'omnicanvas-v1.8.2-x86_64-setup.exe',
            sizeBytes: 68157440,
            sha256: '3819283749182739481928374918273948192837491827394819283749182739',
            downloadUrl: '/api/download/omnicanvas-v1.8.2-x86_64-setup.exe',
            createdAt: '2026-10-20T10:00:00Z',
            verified: true
          },
          {
            id: 'art-omni-mac',
            platform: 'macos',
            format: '.dmg',
            arch: 'universal',
            filename: 'omnicanvas-v1.8.2-universal.dmg',
            sizeBytes: 73400320,
            sha256: '4918273948192837491827394819283749182739481928374918273948192837',
            downloadUrl: '/api/download/omnicanvas-v1.8.2-universal.dmg',
            createdAt: '2026-10-20T10:05:00Z',
            verified: true
          }
        ]
      }
    ]
  },
  {
    id: 'proj-vaultkey',
    name: 'VaultKey Enterprise',
    slug: 'vaultkey',
    tagline: 'Két Sắt Bảo Mật Khóa Xác Thực Passkey & Bí Mật Doanh Nghiệp (Không Lưu Mật Khẩu Thô)',
    description: 'Hệ thống quản lý passkey sinh trắc học phần cứng FIDO2, mã hóa đầu cuối AES-256-GCM bảo vệ an toàn danh tính kỹ thuật số cho mọi hệ điều hành.',
    category: 'An Toàn Thông Tin & Bảo Mật',
    framework: 'Go / Wails',
    currentVersion: 'v3.1.0',
    bundleIdentifier: 'vn.forgeos.vaultkey',
    publisher: 'Forge Security Labs VN',
    websiteUrl: 'https://vaultkey.forgeos.vn',
    githubRepo: 'https://github.com/forgeos-enterprise/vaultkey',
    securityLevel: 'Military Grade',
    storeMeta: {
      rating: 5.0,
      reviewCount: 4120,
      downloadsCount: '200K+',
      badge: 'VerifiedPro',
      badgeLabel: 'Xác Thực Bảo Mật Quân Đội',
      ageRating: 'Doanh nghiệp & Cá nhân',
      categoryLabel: 'Bảo Mật & Quản Lý Danh Tính',
      screenshots: [
        { id: 'ss-vault-1', caption: 'Khóa sinh trắc học Windows Hello và Apple Touch ID Secure Enclave', mode: 'desktop' },
        { id: 'ss-vault-2', caption: 'Đồng bộ hóa khóa FIDO2 không chạm mã hóa AES-256-GCM', mode: 'mobile' }
      ],
      dataSafety: {
        collectedData: 'Không thể truy cập dữ liệu: Kiến trúc không hiểu biết (Zero-Knowledge)',
        securityPractice: 'Toàn bộ bí mật được phân mảnh và niêm phong phần cứng',
        encryptionStandard: 'AES-256-GCM + Argon2id Key Derivation'
      },
      systemRequirements: {
        minOs: 'Windows 10 20H2+, macOS Big Sur 11+, Linux Kernel 5.4+',
        recommendedRam: '2 GB RAM',
        diskSpace: '50 MB dung lượng trống',
        gpuReq: 'Không yêu cầu GPU chuyên dụng'
      },
      reviews: [
        {
          id: 'rev-v-1',
          author: 'Vũ Đức Mạnh (Giám đốc Công nghệ Techcom Securities)',
          rating: 5,
          date: '19 Tháng 10, 2026',
          comment: 'Hệ thống Passkey hoạt động chuẩn FIDO2 quốc tế. Triển khai cho toàn bộ nhân sự công ty rất mượt, loại bỏ hoàn toàn nguy cơ lừa đảo Phishing.',
          platform: 'Windows 11 Hello TPM',
          verifiedInstall: true
        }
      ]
    },
    files: [
      {
        id: 'file-main-go',
        name: 'main.go',
        path: '/main.go',
        language: 'go',
        isEntry: true,
        encrypted: true,
        securityHash: 'sha256-991201948fc0',
        content: `package main

import (
	"embed"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "VaultKey Enterprise - Bao Mat Tuyet Doi",
		Width:  1024,
		Height: 700,
		Assets: assets,
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Loi:", err.Error())
	}
}
`
      }
    ],
    platforms: [
      {
        platform: 'windows',
        displayName: 'Windows (Tích Hợp Windows Hello TPM)',
        iconName: 'windows',
        enabled: true,
        selectedArch: 'x86_64',
        selectedFormat: '.exe',
        signingEnabled: true,
        formats: [{ format: '.exe', name: 'Gói Cài Đặt NSIS', description: 'Tích hợp mô-đun phần cứng TPM 2.0', defaultSelected: true, architectures: ['x86_64'] }]
      },
      {
        platform: 'macos',
        displayName: 'macOS (Tích Hợp Touch ID Secure Enclave)',
        iconName: 'apple',
        enabled: true,
        selectedArch: 'universal',
        selectedFormat: '.dmg',
        signingEnabled: true,
        formats: [{ format: '.dmg', name: 'Đĩa Ảnh DMG Universal', description: 'Bảo vệ bằng Apple Secure Enclave', defaultSelected: true, architectures: ['universal'] }]
      },
      {
        platform: 'linux',
        displayName: 'Linux (Hỗ Trợ libsecret / KeepassXC)',
        iconName: 'linux',
        enabled: true,
        selectedArch: 'x86_64',
        selectedFormat: '.AppImage',
        signingEnabled: false,
        formats: [{ format: '.AppImage', name: 'Gói AppImage', description: 'Chạy độc lập an toàn trên Linux', defaultSelected: true, architectures: ['x86_64'] }]
      }
    ],
    releases: [
      {
        version: 'v3.1.0',
        tag: 'v3.1.0',
        releaseDate: '18 Tháng 10, 2026',
        channel: 'stable',
        title: 'Đồng Bộ Hóa Khóa Xác Thực FIDO2 WebAuthn',
        changelog: [
          'Hỗ trợ khóa bảo mật phần cứng FIDO2 (YubiKey, Titan Key).',
          'Mã hóa két sắt tại máy khách bằng chuẩn AES-256-GCM với độ an toàn cao nhất.'
        ],
        published: true,
        artifacts: [
          {
            id: 'art-vault-win',
            platform: 'windows',
            format: '.exe',
            arch: 'x86_64',
            filename: 'vaultkey-v3.1.0-x86_64-setup.exe',
            sizeBytes: 31457280,
            sha256: '5819283749182739481928374918273948192837491827394819283749182739',
            downloadUrl: '/api/download/vaultkey-v3.1.0-x86_64-setup.exe',
            createdAt: '2026-10-18T09:00:00Z',
            verified: true
          }
        ]
      }
    ]
  }
];
