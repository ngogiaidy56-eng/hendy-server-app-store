# Hendy App Store — Render Free Edition

Hendy App Store hợp nhất ba nguồn mã:

1. **hendy-server-app-store** — Storefront React, Admin Studio, API phát hành, xác minh SHA-256, bảo vệ Admin, mã hóa certificate và API Render.
2. **[HendyAppStore](https://github.com/hendyngo-servers/HendyAppStore)** — kế thừa mô hình App Store đa nền tảng, API catalog/release và luồng Telegram App Store Bot. Các thành phần Cloudflare Workers/Pages/D1/KV/R2 không được triển khai song song trong runtime Render.
3. **[app-downloader-server](https://github.com/ngogiaidy56-eng/app-downloader-server)** — tích hợp API tương thích cho catalog, upload, kiểm tra cập nhật, đếm lượt tải, chỉnh sửa và ẩn ứng dụng. Không mang theo đăng nhập hardcode hoặc file APK placeholder của kho cũ.

Repository đích: https://github.com/ngogiaidy56-eng/hendy-server-app-store

Hai repository nguồn vẫn được giữ nguyên; các thay đổi hợp nhất được thực hiện tại repository đích này.

## Kiến trúc Render Free

\`\`\`text
Browser / Telegram
       |
       v
Render Free Web Service
Node.js + Express + React/Vite
       |
       +---- Admin HTTP Basic Auth
       |
       +---- Storefront + Downloader API
       |
       +---- Telegram webhook (optional)
       |
       v
Neon Free PostgreSQL
  - app catalog and release metadata
  - download counters and audit logs
  - artifact bytes (BYTEA, 25 MiB max per artifact)
  - encrypted certificate bytes
\`\`\`

**Render Free** chỉ chạy web service. Database sử dụng Neon Free bên ngoài để tránh Render Free PostgreSQL hết hạn sau 30 ngày. Artifact hiện được lưu trong PostgreSQL BYTEA để giữ tương thích với các API phát hành; đây là phương án gọn cho catalog nhỏ, không phải object storage cho kho file lớn.

## Những chức năng đã tích hợp

### Storefront
- Danh mục ứng dụng và bản phát hành đã publish.
- Tìm kiếm, lọc theo nền tảng Windows, Android, iOS, macOS, Linux và Web.
- Phiên bản, ghi chú phát hành, kích thước file và SHA-256.
- Tải file có kiểm tra trạng thái published.
- Kiểm tra cập nhật qua API.

### Downloader API tương thích
- \`GET /api/apps\` — danh sách ứng dụng.
- \`GET /api/check-update?appId=...&currentVersion=...\` — kiểm tra phiên bản.
- \`GET /api/download/:id\` — tải release và ghi nhận lượt tải.
- \`POST /api/admin/upload\` — upload multipart (Admin Basic Auth).
- \`PUT /api/admin/apps/:id\` — cập nhật tên, channel và changelog.
- \`DELETE /api/admin/apps/:id\` — rút bản phát hành khỏi Store (soft-withdraw, không xóa file).

API cũ dùng mật khẩu mặc định \`admin123\`, token hardcode và lưu \`data.json\`/uploads cục bộ đã không được mang sang. Không import file APK placeholder 1 byte hoặc metadata giả làm bản phát hành thật.

### Admin & release pipeline
- HTTP Basic Auth phía server, không dùng password/token cố định trong frontend.
- Upload chỉ chấp nhận platform/extension hợp lệ, giới hạn artifact 25 MiB.
- SHA-256 được tính từ bytes thực tế.
- Chứng thư được mã hóa AES-GCM-256 trước khi lưu.
- Release chỉ xuất hiện công khai khi status là \`published\`.
- Xóa ứng dụng là soft-withdraw để giữ lịch sử và không xóa nhầm artifact.

### Telegram App Store Bot (tùy chọn)
- Menu Kho ứng dụng, Tìm ứng dụng, Bản phát hành, Tải theo nền tảng, Mở Store, Trợ giúp.
- Webhook kiểm tra \`X-Telegram-Bot-Api-Secret-Token\`.
- Admin có thể xem trạng thái và đăng ký webhook tại:
  - \`GET /api/admin/telegram/status\`
  - \`POST /api/admin/telegram/set-webhook\`
- Bot chỉ bật khi khai báo \`BOT_TOKEN\` và \`TELEGRAM_WEBHOOK_SECRET\`.
- Bot không hiển thị menu thương mại/OTP/Proxy/VIP chưa có backend thật.

## Render Free deployment

Blueprint: \`render.yaml\`

- Một Web Service, plan \`free\`, region Singapore.
- Không tạo Render PostgreSQL Free.
- Không tạo worker/cron/disk trả phí.
- Build: \`npm install --no-audit --no-fund && npm run build\`
- Start: \`npm start\`
- Health: \`/healthz\`

### 1. Tạo Neon Free PostgreSQL

Tạo project PostgreSQL miễn phí trên Neon, sau đó copy **pooled connection string** (hostname có \`-pooler\`) để làm \`DATABASE_URL\`.

Neon Free có giới hạn compute và storage; kiểm tra mức sử dụng trong Neon Console. Không dùng connection string có mật khẩu trong GitHub, frontend hoặc tin nhắn.

### 2. Tạo Blueprint

Mở [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Fngogiaidy56-eng%2Fhendy-server-app-store), chọn repository và branch \`main\`, kiểm tra plan phải là **Free**, rồi Apply.

### 3. Environment variables

Khai báo tại Render Dashboard → Web Service → Environment:

| Variable | Bắt buộc | Mô tả |
|---|---|---|
| \`DATABASE_URL\` | Có | Neon pooled PostgreSQL URL |
| \`ADMIN_USERNAME\` | Có | Username 3–64 ký tự |
| \`ADMIN_PASSWORD\` | Có | Mật khẩu tối thiểu 20 ký tự |
| \`ADMIN_EMAIL\` | Có | Email quản trị |
| \`RELEASE_PUBLISH_TOKEN\` | Có | Token CI publish, tối thiểu 32 ký tự |
| \`CERTIFICATE_ENCRYPTION_KEY\` | Có | Base64 của đúng 32 byte ngẫu nhiên |
| \`BOT_TOKEN\` | Không | Telegram Bot token |
| \`TELEGRAM_WEBHOOK_SECRET\` | Không | Secret webhook Telegram |
| \`PUBLIC_BASE_URL\` | Không | Mặc định dùng \`RENDER_EXTERNAL_URL\` |
| \`PGPOOL_MAX\` | Tự đặt | Mặc định 3 để phù hợp Free DB |
| \`ALLOW_DEGRADED_START\` | Tự đặt | Cho phép web khởi động khi chưa khai báo DB |

Tạo secret trên máy cá nhân:

\`\`\`bash
openssl rand -hex 32
openssl rand -base64 32
\`\`\`

Không gửi giá trị secret vào chat hoặc commit vào repository. Giữ nguyên \`CERTIFICATE_ENCRYPTION_KEY\` sau khi mã hóa chứng thư.

### 4. Chạy migration

Sau khi khai báo \`DATABASE_URL\`, chạy migration từ máy local có Node.js 22+:

\`\`\`bash
npm install
npm run db:migrate
\`\`\`

Hoặc chạy workflow migration nếu đã thêm secret \`DATABASE_URL\` vào GitHub Actions. Không bật traffic phát hành trước khi migration hoàn tất.

### 5. Smoke test

\`\`\`bash
APP_BASE_URL=https://hendy-server-app-store.onrender.com npm run smoke:render
\`\`\`

Các endpoint chính:
- \`/healthz\` — process health để Render kiểm tra instance.
- \`/api/healthz\` — tình trạng binding DB/storage/rate limit.
- \`/api/v1/runtime/readiness\` — readiness của toàn bộ secrets và storage.
- \`/api/v1/published-releases\` — catalog bản phát hành.
- \`/api/apps\` — catalog tương thích Downloader.

## Free tier — giới hạn cần biết

Render Free:
- Web Service tự spin down sau 15 phút không có traffic; request đầu sau đó cần thời gian cold start.
- Free filesystem là ephemeral; không lưu upload hoặc SQLite trên local disk.
- 750 giờ instance miễn phí mỗi workspace mỗi tháng.
- Không có persistent disk hoặc background worker miễn phí.
- Không phù hợp cho dịch vụ cần uptime/SLA liên tục.

Neon Free:
- Dữ liệu PostgreSQL tồn tại độc lập với vòng đời Render service, nhưng có giới hạn compute/storage/transfer theo plan.
- Artifact lưu trong BYTEA tiêu thụ dung lượng database; với file lớn hoặc nhiều lượt tải, cần chuyển sang object storage chuyên dụng.
- Theo dõi usage và giữ backup/export định kỳ trước khi đưa dữ liệu người dùng thật vào.

**Render Free + Neon Free phù hợp demo, thử nghiệm và MVP nhỏ; không cam kết production 24/7.** Nếu cần vận hành thương mại ổn định, cần ngân sách cho compute và storage lâu dài.

## Local development

Yêu cầu Node.js 22+ và PostgreSQL tương thích.

\`\`\`bash
npm install
cp .env.example .env
# Điền DATABASE_URL và secrets thử nghiệm
npm run db:migrate
npm run lint
npm test
npm run build
npm start
\`\`\`

## Các thư mục chính

\`\`\`text
server/
  index.js
  platform.js
  downloader-api.js
  telegram-bot.js
functions/api/
  healthz.js
  v1/
    admin/
    published/
    runtime/
packages/
  db-schema/migrations/
  shared-types/src/release-utils.js
apps/
  web-user/
  web-admin/
src/interface/
  store/
  admin/
render.yaml
automation/
  smoke-test-render.mjs
  verify-build.mjs
\`\`\`

## Những phần chưa được coi là đã hoàn tất

- Không có artifact thật trong kho Downloader cũ; file APK cũ chỉ là placeholder 1 byte.
- Không tuyên bố EXE/MSI/APK/AAB/IPA đã build hoặc ký số nếu chưa có native build runner và chứng thư hợp lệ.
- Các project Android/Windows/macOS/iOS từ kho HendyAppStore là wrapper/source tham khảo; chúng không tự biến thành binary đã ký.
- Cloudflare Workers/Pages/D1/KV/R2 workflows được giữ ở repository nguồn, không chạy trong Render deployment.
- Telegram Bot chưa hoạt động cho đến khi khai báo BOT_TOKEN và đăng ký webhook.
- Database chưa sẵn sàng cho đến khi cung cấp Neon DATABASE_URL và chạy migration.
