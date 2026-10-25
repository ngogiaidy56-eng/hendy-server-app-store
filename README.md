# Hendy Server App Store — Cloudflare Edition

Hendy Server App Store triển khai trực tiếp trên **Cloudflare Workers + Static Assets + R2**. Frontend Store, giao diện Admin và API chạy qua cùng một Cloudflare Worker; các gói phát hành được lưu trong R2. Repository không cần máy chủ Node.js riêng.

- Repository: https://github.com/ngogiaidy56-eng/hendy-server-app-store
- Worker URL mặc định: https://hendy-tool-releas.ngogiaidy56.workers.dev/
- Store: `/`
- Admin: `/admin` (được bảo vệ bởi Cloudflare Access)
- Cấu hình production: [wrangler.toml](./wrangler.toml)
- CI/CD production: [deploy-cloudflare.yml](./.github/workflows/deploy-cloudflare.yml)

> URL workers.dev phụ thuộc subdomain tài khoản Cloudflare. Nếu tài khoản của bạn dùng hostname khác, cập nhật `PUBLIC_BASE_URL`, `WORKER_HOST` và `APP_BASE_URL` trong cấu hình trước khi deploy. Chỉ coi triển khai thành công khi GitHub Actions và kiểm tra HTTP thực tế đều hoàn tất.

## 1. Kiến trúc

```text
Browser / Admin
      | HTTPS
      v
Cloudflare Worker: hendy-tool-releas
      |
      +-- Static Assets (.worker-dist/)
      |     +-- index.html       Store
      |     +-- admin.html       Admin entry point
      |     +-- assets/*         Vite bundles
      |
      +-- src/worker.ts          API, Access checks, release manifest
      |
      +-- RELEASES_BUCKET binding
             +-- windows/3.2.0/...
             +-- android/3.2.0/...
             +-- published/<app>/<version>/<filename>
```

- **Vite + React 19** build hai HTML entrypoint riêng.
- **Cloudflare Workers Static Assets** phục vụ giao diện và chuyển request API/quản trị qua Worker.
- **Cloudflare R2** lưu artifact. Metadata mẫu trong source không có nghĩa là file đã phát hành; API chỉ đánh dấu artifact có sẵn khi file thật tồn tại trong R2.
- **Cloudflare Access** xác thực Admin bằng email One-time PIN; Worker xác minh JWT, issuer, audience, hạn sử dụng và allow-list email ở phía server.
- **GitHub Actions** kiểm tra TypeScript/test/build, tạo R2 bucket nếu thiếu, deploy Worker, provision Access và smoke-test endpoint.

## 2. Điều kiện cần

1. Repository này trên GitHub với Actions được bật.
2. Tài khoản Cloudflare có Workers, R2 và Cloudflare Zero Trust/Access.
3. Node.js 22 trở lên để chạy local.
4. Cloudflare API Token có đúng phạm vi quyền.
5. Email thật của các quản trị viên được phép đăng nhập.

Mở Cloudflare Zero Trust Dashboard và hoàn tất onboarding nếu tài khoản yêu cầu. Lấy Account ID tại Cloudflare Dashboard → Overview của tài khoản.

## 3. Tạo Cloudflare API Token

Cloudflare Dashboard → **My Profile → API Tokens → Create Token**. Tạo token giới hạn theo account cần triển khai, với quyền tối thiểu:

- **Workers Scripts: Edit** — deploy Worker.
- **R2 Storage: Edit** — tạo/kiểm tra bucket.
- **Access: Apps and Policies: Edit** — tạo Access app cho route quản trị.
- **Access: Organizations: Edit** — đọc/tạo Zero Trust organization.
- **Access: Identity Providers: Edit** — cấu hình email One-time PIN.

Tên nhóm quyền có thể hiển thị hơi khác tùy giao diện Cloudflare. Token cần được cấp cho đúng account. Tránh dùng Global API Key nếu có thể dùng token giới hạn.

Trong GitHub vào **Settings → Secrets and variables → Actions** và cấu hình:

| Tên | Loại | Giá trị |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Repository secret | API Token vừa tạo |
| `CLOUDFLARE_ACCOUNT_ID` | Repository variable hoặc secret | Account ID 32 ký tự hex |
| `CF_ACCESS_ADMIN_EMAILS` | Repository variable hoặc secret | Email Admin thật; nhiều email phân cách bằng dấu phẩy |
| `RELEASE_PUBLISH_TOKEN` | Repository secret, tùy chọn | Token dùng riêng cho publish từ CI; nếu bỏ trống pipeline tự sinh |

Ví dụ định dạng email: `admin@example.com,ops@example.com`. Hãy thay bằng email thật bạn kiểm soát. Không ghi API token, publisher token hoặc mật khẩu vào source code, README hay biến `VITE_*`.

## 4. Triển khai production bằng GitHub Actions (khuyến nghị)

### Bước 1 — kiểm tra cấu hình

Trong `wrangler.toml` xác nhận:

- `name = "hendy-tool-releas"`
- `main = "./src/worker.ts"`
- `assets.directory = "./.worker-dist"`
- R2 binding `RELEASES_BUCKET` trỏ tới `hendy-tool-releases`

Nếu đổi tên Worker/bucket, cập nhật đồng bộ `wrangler.toml`, `wrangler.bootstrap.toml`, workflow, script Access và smoke test trước khi deploy.

### Bước 2 — chạy pipeline

1. Push commit lên nhánh `main`, hoặc mở GitHub → **Actions** → **Deploy Hendy App Store to Cloudflare Worker** → **Run workflow**.
2. Pipeline cài dependencies, chạy `npm run lint`, `npm test`, build Vite và xác nhận cả Store/Admin HTML.
3. Script đảm bảo bucket R2 tồn tại.
4. Pipeline triển khai Worker bootstrap.
5. Script tạo/cập nhật Cloudflare Access và email One-time PIN cho các đường dẫn Admin; secrets được viết vào file tạm bên ngoài source.
6. Pipeline deploy Worker production với secrets đã liên kết, sau đó chạy smoke test.
7. Chỉ coi quá trình thành công khi cả job GitHub Actions kết thúc **Success** và các URL dưới đây trả về đúng nội dung.

Pipeline GitHub Actions là controller production. Nếu bạn đã bật Workers Builds/Git integration cho cùng Worker, hãy tắt pipeline deploy tự động đó để tránh hai luồng ghi đè deployment.

### Bước 3 — xác minh URL

Thay hostname ví dụ bằng Worker URL thực tế của bạn:

| URL | Kết quả kỳ vọng |
|---|---|
| `/` | Giao diện Store |
| `/admin` | Đăng nhập/chuyển hướng Cloudflare Access; không mở Admin công khai |
| `/healthz` | JSON có `status: "healthy"` |
| `/api/v1/meta` | Metadata dịch vụ và API |
| `/api/v1/runtime/readiness` | Trạng thái binding, không tiết lộ giá trị secret |
| `/api/v1/releases` | Catalogue cố định; file chưa có trong R2 phải unavailable |
| `/api/v1/published-releases` | Artifact đã publish thực sự trong R2 |
| `/api/v1/public/manifest.json` | Manifest phát hành và checksum nếu có |

## 5. Triển khai thủ công từ máy local

Dùng Bash hoặc Git Bash cho các lệnh dưới đây.

### Bước 1 — cài đặt và kiểm tra

```bash
git clone https://github.com/ngogiaidy56-eng/hendy-server-app-store.git
cd hendy-server-app-store
npm install
npm run lint
npm test
npm run build
node scripts/verify-store-admin-build.mjs
```

Lệnh build tạo `dist/` và chuẩn bị `.worker-dist/`. Chỉnh sửa source trong `src/`, không chỉnh thủ công file build.

### Bước 2 — xác thực Cloudflare

```bash
npx wrangler@4 login
npx wrangler@4 whoami
export CLOUDFLARE_ACCOUNT_ID="YOUR_32_CHARACTER_ACCOUNT_ID"
export CLOUDFLARE_API_TOKEN="YOUR_SCOPED_API_TOKEN"
export CF_ACCESS_ADMIN_EMAILS="your-real-admin@example.com"
export CLOUDFLARE_WORKER_NAME="hendy-tool-releas"
export WORKER_HOST="hendy-tool-releas.ngogiaidy56.workers.dev"
```

Thay các giá trị ví dụ bằng thông tin của tài khoản. Không commit biến môi trường hay file chứa secrets.

### Bước 3 — tạo R2 và bootstrap Worker

```bash
node scripts/provision-cloudflare-resources.mjs
npx wrangler@4 deploy --config=wrangler.bootstrap.toml
```

### Bước 4 — provision Access và deploy production

```bash
mkdir -p .runtime
node scripts/provision-cloudflare-access.mjs --output .runtime/worker-secrets.json
npx wrangler@4 deploy --config=wrangler.toml --secrets-file .runtime/worker-secrets.json
rm -f .runtime/worker-secrets.json
```

File secrets tạm nằm trong thư mục bị Git ignore. Không in nội dung file ra terminal, không commit file đó và xóa sau khi triển khai.

### Bước 5 — kiểm tra deployment

```bash
APP_BASE_URL="https://hendy-tool-releas.ngogiaidy56.workers.dev" npm run smoke:cloudflare
```

Nếu hostname Worker khác, cập nhật `WORKER_HOST` trước khi provision Access và đặt `APP_BASE_URL` chính xác khi smoke test. Không coi một hostname ví dụ là bằng chứng deployment đã chạy.

## 6. Phát hành artifact thật vào R2

Mã nguồn chứa catalogue ví dụ như `windows/3.2.0/HendyToolsPro-3.2.0-Setup.exe` và `android/3.2.0/HendyToolsMobile-3.2.0.apk`. Những entry này **không phải** file cài đặt đã được phát hành.

Artifact do Admin/CI publish được lưu theo key:

`published/<appSlug>/<version>/<filename>`

Danh mục chỉ đánh dấu file khả dụng khi object tương ứng thật sự tồn tại trong R2. Chỉ upload binary bạn đã build và kiểm tra. SHA-256 giúp xác minh tính toàn vẹn, nhưng không tự chứng minh danh tính nhà phát hành.

Workflow **Build and publish Hendy web release** có thể đóng gói website thành ZIP và lưu như GitHub Actions artifact. Nếu chọn publish, workflow gửi gói qua `/api/v1/ci/publish` với publisher token chỉ dùng phía CI/server. Endpoint upload trực tiếp giới hạn 25 MB; file lớn cần quy trình upload phù hợp qua R2.

## 7. API endpoints

| Endpoint | Mục đích |
|---|---|
| `GET /healthz` | Liveness check |
| `GET /api/v1/meta` | Metadata dịch vụ |
| `GET /api/v1/releases` | Catalogue phát hành |
| `GET /api/v1/published-releases` | Release thực có trong R2 |
| `GET /api/v1/public/manifest.json` | Manifest công khai |
| `GET /api/v1/runtime/readiness` | Kiểm tra binding/secrets không tiết lộ giá trị |
| `POST /api/v1/ci/publish` | CI publisher; cần Bearer token |
| `POST /api/v1/admin/publish` | Admin publish; yêu cầu Cloudflare Access |

Health check không chứng minh rằng artifact đã upload hoặc custom domain đã cấu hình. Kiểm tra từng phần riêng.

## 8. Các tệp mã nguồn quan trọng

- `src/worker.ts` — Worker router, API, xác thực Access, release catalogue và R2 delivery.
- `src/main.tsx`, `src/App.tsx`, `src/interface/store/` — giao diện Store.
- `src/admin-main.tsx`, `src/interface/admin/` — giao diện Admin/Studio.
- `index.html`, `admin.html` — hai HTML entrypoint.
- `wrangler.toml` — cấu hình production.
- `wrangler.bootstrap.toml` — cấu hình deployment đầu tiên trước khi secrets Access được liên kết.
- `scripts/provision-cloudflare-resources.mjs` — đảm bảo R2 bucket tồn tại.
- `scripts/provision-cloudflare-access.mjs` — cấu hình Zero Trust/Access và file secrets tạm.
- `scripts/prepare-worker-assets.mjs` — tạo `.worker-dist/` từ build Vite.
- `scripts/verify-store-admin-build.mjs` — xác nhận cả Store/Admin được build.
- `scripts/smoke-test-cloudflare.mjs` — kiểm tra endpoint production.
- `.github/workflows/deploy-cloudflare.yml` — deployment production.
- `.github/workflows/ci-deploy.yml` — kiểm tra pull request/push.
- `.github/workflows/build-and-publish-release.yml` — đóng gói/publish bản web.

## 9. Xử lý lỗi phổ biến

**403 khi tạo bucket hoặc Access:** kiểm tra Account ID, quyền token và quyền Workers Scripts, R2, Access Organizations, Identity Providers, Apps và Policies; token cần cấp đúng account.

**Thiếu `CF_ACCESS_ADMIN_EMAILS`:** tạo GitHub Actions variable/secret có email hợp lệ, cách nhau bằng dấu phẩy và chạy lại workflow.

**Admin trả về Access setup required (503):** kiểm tra bước provision Access, secrets file tạm và endpoint `/api/v1/runtime/readiness`. Không tắt cơ chế xác minh Access để né lỗi.

**`releaseStorage: false`:** kiểm tra bucket `hendy-tool-releases`, binding `RELEASES_BUCKET` và account chứa bucket có cùng account triển khai Worker.

**Release URL trả 404:** object key chưa tồn tại hoặc không trùng. Upload artifact thật vào đúng key và kiểm tra lại danh mục.

**Thiếu `dist/admin.html`:** chạy `npm run build` và `node scripts/verify-store-admin-build.mjs`. Không xóa `admin.html` trước khi deploy Worker.

**Hostname workers.dev sai:** xác nhận hostname trên Cloudflare Worker Overview; cập nhật `PUBLIC_BASE_URL`, `WORKER_HOST` và `APP_BASE_URL` cho nhất quán trước khi provision Access.

## 10. Checklist bảo mật production

- Không commit `.env`, `.dev.vars`, `.runtime`, secret files, API tokens hoặc publisher tokens.
- Không đặt secret trong biến `VITE_*`; Vite đóng gói các biến này vào browser bundle.
- Giữ Cloudflare Access cho mọi route Admin và API nhạy cảm.
- Rà soát danh sách email được phép truy cập sau khi thay đổi nhân sự.
- Xem Worker Logs và usage/cost sau deployment.
- Chỉ phát hành binary có nguồn gốc rõ ràng; không dùng metadata giả làm bằng chứng rằng binary đã tồn tại.
