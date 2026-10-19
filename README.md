# Hendy Server App Store · Integrated Workspaces

Nền tảng phân phối phần mềm Hendy với giao diện cửa hàng công khai, giao diện quản trị release và hai workspace riêng cho Control Plane và Studio. Backend vẫn cung cấp API release, kiểm tra cập nhật, PostgreSQL/D1 và Cloudflare R2.

## Giao diện

| Route | Surface | Mục đích |
| --- | --- | --- |
| `/` | Storefront | Danh mục tải Windows, Android, iOS; chỉ hiển thị release công khai |
| `/admin` | Release Admin | Tạo release metadata, upload binary qua API (tối đa 25 MiB), xuất bản/thu hồi |
| `/control-plane/` | Control Plane | Dashboard vận hành, quản lý release qua API và hướng dẫn quy trình phát hành |
| `/studio/` | Studio | Workspace media/timeline/subtitle và tải project manifest JSON |

Các giao diện là các entry point độc lập, được build vào `dist/index.html`, `dist/admin.html`, `dist/control-plane/index.html` và `dist/studio/index.html`. Express định tuyến tới từng entry; Cloudflare Pages dùng `public/_redirects`.

## Chạy local

Yêu cầu Node.js 22+.

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

Mở `http://localhost:5173` cho storefront, `http://localhost:5174/control-plane/` cho Control Plane dev server, `http://localhost:5175/studio/` cho Studio. Server production mặc định lắng nghe cổng 10000; các route giao diện được phục vụ từ thư mục `dist`.

## API release

- `GET /api/health` — health check.
- `GET /api/releases` — release đã xuất bản.
- `GET /api/update-check?platform=windows&channel=stable&clientVersion=1.0.0` — kiểm tra cập nhật.
- `GET /api/admin/releases` — đọc toàn bộ release, cần Bearer token.
- `POST /api/admin/releases` — tạo metadata release, cần Bearer token.
- `PATCH /api/admin/releases/:id` và `DELETE /api/admin/releases/:id` — quản trị release.
- `POST /api/admin/uploads` — upload binary lên R2, raw body `application/octet-stream`, tối đa 25 MiB.

Quản trị ghi cần `ADMIN_API_TOKEN` và `DATABASE_URL` (PostgreSQL) trên Render hoặc binding D1 đúng trên Worker. Upload cần cấu hình R2 và domain HTTPS. Không commit token, credential, D1 database ID chưa xác minh hoặc binary mẫu.

## Deploy Render

Dùng `render.yaml` làm Blueprint, kiểm tra plan/vùng trước khi tạo tài nguyên. Đặt các biến secrets trên Render; health check là `/api/health`. Web Service phục vụ cả UI và API trên cùng origin.

## Deploy Cloudflare

1. Tạo D1 database và R2 bucket; cấu hình bindings trong `wrangler.toml`.
2. Đặt `ADMIN_API_TOKEN` bằng `npx wrangler secret put ADMIN_API_TOKEN`.
3. Trong GitHub Actions, đặt secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, biến `CLOUDFLARE_PAGES_PROJECT`; đặt `VITE_API_BASE_URL` nếu API Worker dùng origin khác.
4. Workflow Pages build toàn bộ entry và upload thư mục `dist`. Workflow Worker deploy API riêng.

## Phạm vi và bảo mật

- Storefront chỉ đọc API công khai; Release Admin và Control Plane gọi endpoint quản trị bằng Bearer token trong session của tab.
- `noindex` không phải kiểm soát truy cập. Trước khi mở quản trị cho nhiều người, hãy bật Cloudflare Access/SSO, giới hạn origin CORS, bổ sung rate limit và audit log.
- Studio hiện quản lý media local, clip/timeline/subtitle metadata và xuất project manifest JSON. Đây không phải file MP4 đã render; cần tích hợp trusted render worker/FFmpeg pipeline để xuất video thật.
- Control Plane hiển thị luồng vận hành và quản lý release metadata; nó không tự tạo binary, ký ứng dụng hoặc triển khai ứng dụng người dùng nếu chưa cấu hình build/sign/release pipeline.
- Bản build CI cần được chạy và kiểm tra trong môi trường có npm registry/runner trước khi coi là production-verified.
