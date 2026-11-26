# Hendy App Store — Render Edition

Hendy App Store dùng **Render Web Service (Node.js + Express)** và **Render PostgreSQL**. Một dịch vụ Node.js phục vụ Store, Admin và API; PostgreSQL lưu metadata, artifact và dữ liệu runtime.

- Repository: https://github.com/ngogiaidy56-eng/hendy-server-app-store
- Render Blueprint: `render.yaml`
- Web Service: `hendy-server-app-store` — Singapore, Starter
- PostgreSQL: `hendy-app-store-db` — Singapore, Basic 1 GB, disk 15 GB
- Store: `/`
- Admin: `/admin` → `/admin.html` — HTTP Basic Auth phía máy chủ
- Health: `/api/healthz`
- Readiness: `/api/v1/runtime/readiness`

> Source và Blueprint không tự chứng minh ứng dụng đã chạy live. Blueprint đã được tạo trong Render nhưng bước planning bị chặn bởi `need_payment_info`. Chưa tạo service/database và chưa có URL live.

## Kiến trúc

```text
Browser
  | HTTPS
  v
Render Web Service — Node.js + Express
  ├── dist/index.html       Store
  ├── dist/admin.html       Admin (HTTP Basic Auth)
  ├── server/index.js       Express + API dispatcher + security
  ├── functions/api/        Existing API handlers
  └── server/platform.js    D1/R2/KV compatibility adapters
              |
              v
       Render PostgreSQL
         ├── apps / releases / storefront_settings
         ├── sync_logs / certificates
         ├── stored_objects (BYTEA artifact + encrypted certificates)
         └── kv_store (runtime + rate-limit counters)
```

Các handler cũ trong `functions/api/**/*.js` tiếp tục được gọi qua Express. Adapter PostgreSQL thay thế D1/R2/KV. Admin được xác thực ở server bằng HTTP Basic Auth; POST quản trị yêu cầu same-origin; CI publish dùng Bearer token riêng.

Artifact và chứng thư đã mã hóa được lưu trong PostgreSQL `BYTEA` tại `stored_objects`. Mô hình này tránh filesystem tạm của Render Web Service, phù hợp giới hạn upload hiện tại (artifact 25 MB, certificate 20 MB), nhưng không phải object storage chuyên dụng cho quy mô lớn. Khi số lượng file và lưu lượng tăng, nên thay adapter này bằng S3-compatible object storage và giữ PostgreSQL cho metadata.

## Cấu trúc chính

```text
server/
  index.js                 Express server, API routes, Admin auth
  platform.js              PostgreSQL adapters for D1/R2/KV APIs
functions/api/             Existing API handlers
packages/db-schema/
  migrations/0002_render_storage.sql
scripts/
  migrate-render.mjs       PostgreSQL migrations
  package-web-release.mjs  ZIP distribution + SHA-256
automation/
  verify-build.mjs
  smoke-test-render.mjs
apps/web-user/              Storefront React app
apps/web-admin/             Admin React app
src/                        Shared UI
render.yaml                 Render Blueprint
```

## Environment Variables

Thiết lập tại **Render Dashboard → Web Service → Environment**. Blueprint tự liên kết `DATABASE_URL` từ PostgreSQL.

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | Có | Render PostgreSQL, tự liên kết |
| `ADMIN_USERNAME` | Có | Username 3–64 ký tự |
| `ADMIN_PASSWORD` | Có | Password tối thiểu 20 ký tự |
| `ADMIN_EMAIL` | Có | Email định danh Admin trong log |
| `RELEASE_PUBLISH_TOKEN` | Có | Token CI publish, ít nhất 32 ký tự |
| `CERTIFICATE_ENCRYPTION_KEY` | Có | Base64 của đúng 32 byte ngẫu nhiên |
| `NODE_ENV` | Tự đặt | production |
| `APP_NAME` | Tự đặt | Hendy App Store |
| `ENVIRONMENT` | Tự đặt | production |
| `RELEASE_CHANNEL` | Tự đặt | stable |
| `PUBLIC_BASE_URL` | Không | Custom URL; mặc định `RENDER_EXTERNAL_URL` |
| `PGPOOL_MAX` | Không | Pool size tối đa, mặc định 10 |

Sinh secrets trên máy cá nhân; không commit hoặc gửi giá trị qua chat:

```bash
openssl rand -hex 32          # RELEASE_PUBLISH_TOKEN
openssl rand -base64 32       # CERTIFICATE_ENCRYPTION_KEY
openssl rand -hex 32          # ADMIN_PASSWORD
```

Giữ nguyên `CERTIFICATE_ENCRYPTION_KEY` sau khi mã hóa chứng thư. Nếu thay hoặc mất key, dữ liệu cũ không giải mã được bằng key mới.

## Render Blueprint

1. Mở [Render Dashboard](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fngogiaidy56-eng%2Fhendy-server-app-store).
2. Chọn repository `ngogiaidy56-eng/hendy-server-app-store`, branch `main`, file `render.yaml`.
3. Xem kế hoạch: Web Service Starter và PostgreSQL Basic 1 GB, disk 15 GB; cả hai tại Singapore. Đây là tài nguyên trả phí.
4. Cung cấp payment information nếu Render yêu cầu.
5. Khai báo các secret thủ công trong Environment.
6. Chỉ Apply sau khi xem và chấp thuận chi phí. Render sẽ build, chạy migration ở Pre-Deploy rồi khởi động server.

Blueprint đã tạo:
- ID: `exs-dc3ulfp5efls73chqptg`
- Trạng thái: `created`
- Planning: `failed`, thông báo `need_payment_info` cho Web Service và PostgreSQL
- Resources: chưa có

Planning thất bại không tạo dịch vụ/database và không triển khai ứng dụng.

## Kiểm tra sau khi có URL

Sau khi Render deploy thành công, đặt URL thật rồi chạy:

```bash
APP_BASE_URL=https://YOUR-SERVICE.onrender.com npm run smoke:render
```

| Endpoint | Kết quả mong đợi |
|---|---|
| `/` | Storefront HTML |
| `/admin` | Chuyển hướng đến Admin; phải yêu cầu xác thực |
| `/api/healthz` | `healthy`, runtime `render-node-express` |
| `/api/v1/meta` | Provider `render` |
| `/api/v1/runtime/readiness` | DB, object storage, rate-limit, Admin auth và secrets sẵn sàng |
| `/api/v1/published-releases` | Release catalog |
| `/api/v1/public/manifest.json` | Public release manifest |
| `/api/auth` | Danh tính Admin đã xác thực |

Render service bind `0.0.0.0` và sử dụng biến `PORT` Render cấp. Health path trong Blueprint là `/api/healthz`.

## Local development

Yêu cầu Node.js 22.12+ và PostgreSQL.

```bash
npm install
cp .env.example .env
# Điền DATABASE_URL local và secrets thử nghiệm
npm run db:migrate
npm run lint
npm test
npm run build
npm start
```

Mở `http://localhost:10000`. Không dùng production secrets/database cho local tests.

## Chuyển dữ liệu Cloudflare cũ

Chuyển source code không tự động chuyển dữ liệu D1/R2. PostgreSQL Render mới bắt đầu trống. Trước khi đổi traffic production cần:
- Export D1 metadata và import vào schema PostgreSQL.
- Copy từng R2 object vào `stored_objects`, giữ nguyên object key/metadata và xác minh SHA-256.
- Giữ nguyên `CERTIFICATE_ENCRYPTION_KEY` để dữ liệu chứng thư cũ có thể giải mã.
- So sánh số lượng releases và thử download trước khi đổi DNS.
- Giữ Cloudflare D1/R2 cũ đến khi backup và đối soát hoàn tất.

## Giới hạn hiện tại

- Chỉ coi build đã được xác minh khi CI chạy hết các steps và pass. Nếu GitHub Actions trả `runner_id=0` và không có step, cần xử lý hosted-runner/billing/permissions trước.
- Artifact hiện lưu trong PostgreSQL BYTEA; file lớn/tải nhiều cần chuyển sang object storage chuyên dụng.
- EXE/MSI/APK/AAB/IPA/DMG/AppImage vẫn cần toolchain/runner theo nền tảng. ZIP website/nguồn không phải native binary đã build/ký số.
- Firebase Auth/Google Drive là integrations độc lập; cần kiểm tra allowed domains/security rules sau khi đổi hostname.
- Không đặt passwords, tokens hoặc private keys trong `VITE_*`; Vite có thể đưa chúng vào browser assets.
