# Hendy Server App Store 2.0

Kiến trúc mới hợp nhất nguồn dữ liệu phát hành: Render chạy API Express, PostgreSQL lưu metadata, Cloudflare R2 lưu gói nhị phân; Cloudflare Worker chỉ proxy API, Pages phục vụ frontend.

## Các bề mặt ứng dụng

- / — Storefront, lọc Windows/Android/iOS, phiên bản, ghi chú, SHA-256 và liên kết tải qua API.
- /admin — Release Admin, token theo session tab, tạo release, upload R2, xuất bản/thu hồi/xóa.
- /control-plane/ — dashboard kiểm tra health, uptime, dữ liệu và truy cập nhanh.
- /studio/ — media bin cục bộ, preview, video/audio/subtitle tracks, chỉnh metadata, xuất SRT và project JSON.
- API công khai: /api/health, /api/meta, /api/releases, /api/releases/:id, /api/update-check, /api/download/:id, /api/telemetry.
- API quản trị: /api/admin/releases, /api/admin/overview và /api/admin/uploads.

## Phát triển local

Yêu cầu Node.js 22.x.

    npm install --include=dev
    npm run typecheck
    npm test
    npm run build
    npm start

API mặc định nghe ở http://localhost:10000. Vite storefront ở cổng 5173, Control Plane ở 5174 và Studio ở 5175. Nếu chưa có DATABASE_URL, backend chạy catalogue read-only từ RELEASES_JSON; API quản trị sẽ khóa có chủ đích.

## Triển khai Render

Tạo Blueprint từ:
https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fngogiaidy56-eng%2Fhendy-server-app-store

render.yaml tạo web service và PostgreSQL, chạy typecheck/test/build trước khi start, dùng /api/health làm health check và sinh ADMIN_API_TOKEN riêng. Sau khi tạo bucket R2 và public HTTPS domain, nhập:

- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- R2_PUBLIC_BASE_URL
- CORS_ALLOWED_ORIGINS nếu frontend gọi trực tiếp Render cross-origin.

DATABASE_URL được liên kết từ PostgreSQL. Không đưa secrets vào Git.

## Triển khai Cloudflare

GitHub Actions Secrets:
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
- RENDER_DEPLOY_HOOK (tùy chọn).

GitHub Actions Variables:
- RENDER_API_ORIGIN — HTTPS origin của Render Web Service, không kèm path.
- ALLOWED_ORIGIN — origin chính xác của storefront, không có path.
- VITE_API_BASE_URL — origin Worker để Pages gọi API.
- CLOUDFLARE_PAGES_PROJECT — tên project Pages.

Workflow Worker cần Render origin, allowed origin và Cloudflare credentials. Workflow Pages cần project name, API origin và Cloudflare credentials. Khi biến public chưa cấu hình, workflow bỏ qua deploy; khi cấu hình đã bật nhưng secret còn thiếu, workflow sẽ báo lỗi.

## Quy tắc an toàn dữ liệu

- PostgreSQL là nguồn dữ liệu chuẩn; Worker không duy trì một kho D1 độc lập.
- API quản trị yêu cầu Authorization: Bearer token, so sánh token constant-time và cần PostgreSQL.
- Giới hạn JSON 128 KiB, upload binary trực tiếp 50 MiB, rate limit cơ bản và chỉ cho xuất bản URL HTTPS.
- Upload R2 tính SHA-256 trên nội dung thực tế. URL ngoài cần SHA-256 hợp lệ và dung lượng.
- Chỉ release published xuất hiện trong catalogue công khai; draft và archived không được trả cho người dùng cuối.
- Studio lưu timeline metadata, nhập media cục bộ, xuất SRT/JSON. Studio chưa render MP4; cần dịch vụ FFmpeg riêng để render video thật.

## Xác minh sau triển khai

- GET /api/health trả status: ok và database: postgres.
- GET /api/releases chỉ trả bản published.
- Kiểm tra update API theo platform, channel và currentVersion.
- Đăng nhập /admin, upload gói thử vào R2, kiểm tra checksum, xuất bản và kiểm tra tải từ storefront.

Commit source không tự chứng minh build/deploy production. Cần kiểm tra trạng thái GitHub Actions, Render, Cloudflare và endpoint thật sau khi cấu hình credentials.
