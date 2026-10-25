# Hendy App Store — Cloudflare Pages Functions Edition

Hendy App Store dùng **Cloudflare Pages + Pages Functions + D1 + R2 + KV** làm nền tảng triển khai duy nhất. Frontend Store, giao diện Admin và API serverless đều được xuất bản qua Cloudflare Pages. Không cần Render, Express server hay Worker router riêng.

- Source: https://github.com/ngogiaidy56-eng/hendy-server-app-store
- Pages project mặc định: **hendy-app-store**
- Host mặc định: https://hendy-app-store.pages.dev
- Store: /
- Admin: /admin → /admin.html (Cloudflare Access bắt buộc)
- Cấu hình Pages: [wrangler.toml](./wrangler.toml)
- Quy trình deploy: [deploy.yml](./.github/workflows/deploy.yml)

> Host và trạng thái triển khai thật phụ thuộc tài khoản Cloudflare của bạn. README cùng source code không tự chứng minh deployment đã thành công. Chỉ xác nhận sau khi GitHub Actions chạy hết các bước và smoke test HTTP pass.

## 1. Kiến trúc production

~~~text
Người dùng / Quản trị viên
           | HTTPS
           v
Cloudflare Pages
  ├── index.html                 Store / tải ứng dụng
  ├── admin.html                 Admin UI (Access-gated)
  └── functions/
      ├── _middleware.js         Access JWT, security headers, rate limiting
      └── api/
          ├── auth.js            Danh tính Admin đã xác minh
          ├── sync-logs.js       Nhật ký đồng bộ và trạng thái gần thời gian thực
          ├── v1/published-releases.js
          ├── v1/published/download.js
          ├── v1/admin/publish.js
          ├── v1/admin/certificates.js
          └── v1/ci/publish.js
                    |
           ┌────────┼────────┐
           v        v        v
        D1 DB    Private R2    KV
      metadata   artifacts   rate limit
      settings   encrypted   sync status
      sync logs  certificates
~~~

**Vai trò của từng dịch vụ**

| Thành phần | Chức năng |
|---|---|
| Cloudflare Pages | Phục vụ giao diện tĩnh và bundle sản xuất |
| Pages Functions | API serverless, xác thực, tải file và logic nghiệp vụ |
| Cloudflare Access | Email OTP, allow-list Admin và JWT identity |
| Cloudflare D1 | Metadata release, cấu hình Store, logs và inventory chứng thư |
| Cloudflare R2 | Binary release và chứng thư đã mã hóa; bucket không công khai |
| Cloudflare KV | Rate limiting theo IP/phút và trạng thái đồng bộ gần thời gian thực |
| GitHub Actions | Kiểm thử, tạo resource, chạy D1 migrations, nạp secrets, deploy và smoke test |

Pages Functions được đặt dưới thư mục gốc **functions/**, theo mô hình file-based routing. File **functions/_middleware.js** chạy trước Pages Functions và static assets. Cấu hình Pages hỗ trợ binding D1/R2/KV qua Wrangler. Tài liệu chính thức: [Pages Functions middleware](https://developers.cloudflare.com/pages/functions/middleware/), [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/) và [Wrangler Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## 2. Cấu trúc mã nguồn

~~~text
HendyAppStore/
├── .github/workflows/
│   ├── deploy.yml
│   ├── ci-deploy.yml
│   └── build-and-publish-release.yml
├── apps/
│   ├── web-user/
│   │   ├── src/main.tsx
│   │   ├── src/hooks/useDeviceDetect.ts
│   │   └── src/components/
│   │       ├── AndroidDirectLink.tsx
│   │       ├── IOSOtaDownloader.tsx
│   │       ├── WindowsSafeInstaller.tsx
│   │       └── PlatformDownloadAction.tsx
│   └── web-admin/
│       ├── src/main.tsx
│       └── src/components/
│           ├── AutomationSecretsForm.tsx
│           └── CertUploadSecure.tsx
├── functions/
│   ├── _middleware.js
│   ├── admin.js
│   ├── studio.js
│   └── api/
│       ├── auth.js
│       ├── healthz.js
│       ├── sync-logs.js
│       └── v1/
├── packages/
│   ├── shared-types/
│   └── db-schema/migrations/0001_init.sql
├── automation/
│   ├── provision-cloudflare-resources.mjs
│   ├── provision-cloudflare-access.mjs
│   ├── verify-build.mjs
│   └── smoke-test-cloudflare.mjs
├── public/
├── src/                         Các module giao diện và logic tái sử dụng hiện có
├── index.html                   Build entry cho Store
├── admin.html                   Build entry cho Admin
├── package.json                 npm workspaces
├── vite.config.ts
└── wrangler.toml                Pages config template
~~~

Hai trang build entry **index.html** và **admin.html** nằm ở root để Vite xuất kết quả tại **dist/index.html** và **dist/admin.html**; hai app entrypoint nằm dưới **apps/web-user** và **apps/web-admin**. Các giao diện vẫn có thể tái sử dụng component trong **src/interface**.

## 3. Chuẩn bị Cloudflare

### 3.1 Tạo API Token

Mở Cloudflare Dashboard → **My Profile → API Tokens → Create Token**. Tạo token riêng cho repository và chỉ cấp các quyền cần thiết trên đúng account:

- **Pages: Edit** — tạo project và deploy Pages.
- **D1: Edit** — tạo database và quản lý migrations.
- **R2 Storage: Edit** — tạo và sử dụng bucket phát hành.
- **Workers KV Storage: Edit** — tạo KV namespace.
- **Access: Apps and Policies: Edit** — tạo Access app và policy giới hạn Admin.
- **Access: Organizations: Edit** — đọc/tạo Zero Trust organization.
- **Access: Identity Providers: Edit** — cấu hình email One-time PIN.

Tên nhóm permission có thể hiển thị khác đôi chút trong giao diện Cloudflare. Token phải được cấp cho đúng account. Tránh dùng Global API Key nếu API Token giới hạn quyền đáp ứng được nhu cầu.

### 3.2 Hoàn tất Zero Trust

Mở Cloudflare Zero Trust Dashboard và hoàn tất onboarding nếu được yêu cầu. Cloudflare Access dùng đăng nhập bằng email One-time PIN; email cần có trong allow-list của dự án.

## 4. Cấu hình GitHub Actions Secrets / Variables

Mở repository trên GitHub → **Settings → Secrets and variables → Actions**.

| Tên | Loại | Bắt buộc | Mục đích |
|---|---|---|---|
| CLOUDFLARE_API_TOKEN | Secret | Có | Token có quyền provisioning và deploy |
| CLOUDFLARE_ACCOUNT_ID | Variable hoặc Secret | Có | Account ID 32 ký tự hex |
| CF_ACCESS_ADMIN_EMAILS | Variable hoặc Secret | Có | Email Admin, phân cách bằng dấu phẩy |
| RELEASE_PUBLISH_TOKEN | Secret | Có | Token bearer để endpoint CI publish xác thực riêng |
| CERTIFICATE_ENCRYPTION_KEY | Secret | Có | AES-GCM key; Base64 của đúng 32 byte |
| APP_PUBLIC_HOST | Variable | Không | Host public; mặc định hendy-app-store.pages.dev |
| ADDITIONAL_PUBLIC_HOSTS | Variable | Không | Hostname phụ, phân cách bằng dấu phẩy |

Sinh token publisher:

~~~bash
openssl rand -hex 32
~~~

Sinh khóa mã hóa chứng thư (Base64 của 32 byte):

~~~bash
openssl rand -base64 32
~~~

Giữ lại giá trị **CERTIFICATE_ENCRYPTION_KEY** ổn định sau khi đã mã hóa chứng thư. **Không tạo key mới ở mỗi lần deploy**; nếu mất hoặc thay key, dữ liệu được mã hóa trước đó không thể giải mã bằng key mới. Không ghi các giá trị này vào repository, file .env.example, mã nguồn phía trình duyệt hoặc chat.

Workflow kiểm tra key mã hóa giải mã thành 32 byte và token publisher đủ độ dài. Script provisioning tạo file secrets tạm, gửi chúng lên Cloudflare Pages và xóa file tạm ngay sau đó.

## 5. Deploy production tự động

### Bước 1 — push code

Push lên nhánh **main**. Có thể khởi chạy thủ công tại GitHub → **Actions → Deploy Hendy App Store to Cloudflare Pages → Run workflow**.

### Bước 2 — các bước pipeline thực hiện

1. Cài package và chạy TypeScript check.
2. Chạy unit tests và test cho Pages Functions.
3. Build hai HTML entrypoint độc lập: Store và Admin.
4. Kiểm tra output và ràng buộc kiến trúc bằng **automation/verify-build.mjs**.
5. Provision Pages project **hendy-app-store**, D1 **hendy-app-store-db**, R2 **hendy-tool-releases** và KV **hendy-app-store-rate-limits** nếu chưa tồn tại.
6. Sinh **wrangler.generated.jsonc** chứa resource IDs thực của tài khoản hiện tại. Tệp này bị Git ignore và không được commit.
7. Áp dụng D1 migration **packages/db-schema/migrations/0001_init.sql**.
8. Tạo/cập nhật Access applications cho hostname/path quản trị, rồi tải Pages secrets.
9. Deploy **dist/** cùng Pages Functions bằng Wrangler.
10. Chạy smoke test kiểm tra health, metadata, D1/R2/KV binding, danh mục release, manifest và Access tại /admin.

**Chỉ xác nhận deploy thành công khi job kết thúc trạng thái Success, smoke tests pass và các URL được kiểm tra trên host thực tế.** Nếu GitHub Actions job kết thúc ngay với runner_id bằng 0 hoặc không có step nào chạy, hãy kiểm tra GitHub Actions permissions/runner availability trước khi điều tra lỗi code.

### Bước 3 — xác minh sau deploy

| Địa chỉ | Mong đợi |
|---|---|
| https://hendy-app-store.pages.dev/ | Storefront |
| https://hendy-app-store.pages.dev/admin | Redirect/Access login; không mở Admin công khai |
| /api/healthz | JSON có status healthy |
| /api/v1/meta | Metadata dịch vụ và API |
| /api/v1/runtime/readiness | Trạng thái D1, R2, KV và Access không tiết lộ secret |
| /api/v1/published-releases | Chỉ release published và object thật trong R2 |
| /api/v1/public/manifest.json | Manifest release có checksum và URL khi có file |
| /api/auth | Chỉ danh tính đã được Cloudflare Access xác minh |
| /api/sync-logs | Chỉ người dùng đã xác thực |

Nếu dùng custom domain, thay host mặc định bằng **APP_PUBLIC_HOST** trong GitHub Variables và đảm bảo domain đã được gắn vào Pages project trong Cloudflare Dashboard trước khi chạy provisioning Access. Có thể dùng **ADDITIONAL_PUBLIC_HOSTS** để cấu hình nhiều host.

Nếu Access trên host pages.dev không áp dụng ngay, vào Cloudflare Dashboard → **Workers & Pages → hendy-app-store → Settings → General → Enable access policy**. Sau đó kiểm tra Zero Trust → Access → Applications để xác nhận host production không còn wildcard preview-only. Nếu dùng custom domain, tạo/xác nhận Access application cho chính custom hostname đó. Tham khảo [Cloudflare Pages: enable Access for pages.dev](https://developers.cloudflare.com/pages/platform/known-issues/) và [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## 6. Deploy thủ công từ máy local

Yêu cầu Node.js 22+ và npm.

### 6.1 Cài đặt và kiểm tra build

~~~bash
git clone https://github.com/ngogiaidy56-eng/hendy-server-app-store.git
cd hendy-server-app-store
npm install
npm run lint
npm test
npm run build
npm run verify:build
~~~

### 6.2 Đặt credentials

Dùng Bash/Git Bash:

~~~bash
export CLOUDFLARE_ACCOUNT_ID="YOUR_32_CHARACTER_ACCOUNT_ID"
export CLOUDFLARE_API_TOKEN="YOUR_SCOPED_API_TOKEN"
export CF_ACCESS_ADMIN_EMAILS="your-admin@example.com"
export RELEASE_PUBLISH_TOKEN="YOUR_STABLE_RANDOM_PUBLISH_TOKEN"
export CERTIFICATE_ENCRYPTION_KEY="YOUR_BASE64_32_BYTE_KEY"
export PAGES_PROJECT_NAME="hendy-app-store"
export APP_PUBLIC_HOST="hendy-app-store.pages.dev"
~~~

Thay giá trị mẫu bằng secrets của chính bạn. Không commit file có chứa các giá trị này.

### 6.3 Provision resource và triển khai

~~~bash
node automation/provision-cloudflare-resources.mjs
npx --yes wrangler@4 d1 migrations apply hendy-app-store-db --remote --config=wrangler.generated.jsonc
node automation/provision-cloudflare-access.mjs
npm run build
npx --yes wrangler@4 pages deploy dist --project-name=hendy-app-store --branch=main --config=wrangler.generated.jsonc
APP_BASE_URL="https://hendy-app-store.pages.dev" npm run smoke:cloudflare
~~~

**automation/provision-cloudflare-access.mjs** nạp các biến bí mật sau vào Pages project: CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD, CF_ACCESS_ADMIN_EMAILS, RELEASE_PUBLISH_TOKEN và CERTIFICATE_ENCRYPTION_KEY. Tệp secrets tạm sẽ bị xóa sau khi nạp. Không in file tạm ra terminal.

### 6.4 Chạy local

UI Vite có thể chạy riêng để làm giao diện:

~~~bash
npm run dev:web
~~~

Để test Pages Functions cùng bindings, cần có **wrangler.generated.jsonc** đã được tạo qua bước provisioning:

~~~bash
npm run build
npx --yes wrangler@4 pages dev dist --config=wrangler.generated.jsonc
~~~

Local Pages dùng local bindings mặc định trừ khi cấu hình remote bindings. Không thử nghiệm trên production database nếu không chủ ý.

## 7. API chính

| Method | Endpoint | Yêu cầu |
|---|---|---|
| GET | /api/healthz | Công khai |
| GET | /api/v1/meta | Công khai |
| GET | /api/v1/runtime/readiness | Công khai; chỉ trả trạng thái binding |
| GET | /api/v1/runtime-config | Chỉ Admin qua Cloudflare Access; trạng thái không chứa giá trị secrets |
| GET | /api/v1/published-releases | Công khai |
| GET/HEAD | /api/v1/published/download?key=... | Chỉ key có release published trong D1 và object trong R2 |
| GET | /api/v1/public/manifest.json | Công khai |
| GET | /api/v1/store-config | Công khai |
| POST | /api/v1/admin/store-config | Cloudflare Access |
| GET | /api/v1/admin/status | Cloudflare Access |
| GET/POST | /api/v1/admin/certificates | Cloudflare Access |
| POST | /api/v1/admin/publish | Cloudflare Access |
| POST | /api/v1/ci/publish | Bearer token riêng cho CI |
| GET/POST | /api/sync-logs | Cloudflare Access |

Các API quản trị không tin vào cờ/role ở frontend. Middleware kiểm tra JWT ký bởi Cloudflare Access, issuer, audience, thời hạn và email allow-list phía server.

## 8. Phát hành ứng dụng và tải xuống

Admin Studio dùng **/api/v1/admin/publish** để upload artifact vào R2. API tính SHA-256 từ byte thực, ghi metadata vào D1 và chỉ đưa bản phát hành vào danh mục khi object tồn tại trong R2. Endpoint upload trực tiếp giới hạn 25 MiB. Workflow **Build and publish Hendy web release** đóng gói website thực thành ZIP; đó là web distribution, không phải file cài đặt native.

Windows EXE/MSI, APK/AAB, IPA/PKG hoặc Linux installers cần được build trên runner/toolchain phù hợp. Chỉ upload artifact đã được build/test. Không có installer hoặc chữ ký số thật nào được tạo ra chỉ bằng cách thêm metadata vào release record.

- **Android:** nút tải APK chỉ hiện khi file đã phát hành.
- **Windows:** hiển thị checksum khi backend cung cấp.
- **iOS:** tải IPA không tự cài đặt ứng dụng. OTA yêu cầu IPA được ký hợp lệ, HTTPS manifest.plist và cấu hình phân phối hợp lệ. Component chỉ bật liên kết OTA khi được truyền manifest URL thực.

## 9. Chứng thư ký số và secrets

**apps/web-admin/src/components/CertUploadSecure.tsx** gửi chứng thư lên endpoint được bảo vệ bằng Cloudflare Access. Pages Function:

1. Chỉ chấp nhận phần mở rộng được cho phép và file tối đa 20 MiB.
2. Mã hóa byte phía server bằng AES-GCM-256 trước khi ghi vào R2.
3. Ghi metadata cần thiết vào D1; danh sách không trả về nội dung tệp hay đường dẫn tải công khai.
4. Không có endpoint công khai để tải chứng thư gốc.

Khóa **CERTIFICATE_ENCRYPTION_KEY** phải được bảo quản như một secret quan trọng. Hiện tại pipeline lưu trữ/kiểm kê chứng thư đã được triển khai; việc giải mã key trong native signing runner cần được tích hợp riêng trước khi coi quy trình ký ứng dụng native là tự động hoàn chỉnh.

## 10. Khắc phục lỗi

**403 khi provisioning resource:** kiểm tra API Token có quyền Pages, D1, R2, KV và Access trên đúng account.

**Thiếu Pages secrets hoặc Admin trả 503:** kiểm tra CF_ACCESS_ADMIN_EMAILS, CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD đã provision; mở Cloudflare Access Dashboard xác nhận app/path và OTP provider.

**Readiness báo D1 false:** kiểm tra **wrangler.generated.jsonc**, database name/ID và binding **DB**; xác nhận migration đã áp dụng.

**Readiness báo R2 false:** xác nhận **RELEASES** trỏ đúng bucket **hendy-tool-releases** trong Pages project. Không bật public bucket để chữa binding lỗi.

**Readiness báo KV false:** xác nhận namespace **hendy-app-store-rate-limits** đã được tạo và **RATE_LIMITS** có ID đúng trong generated config.

**Catalog rỗng hoặc download 404:** cần upload artifact thật; kiểm tra bản ghi D1 có status published, key published/... đúng và object tồn tại trong R2.

**Cert upload trả 503:** kiểm tra CERTIFICATE_ENCRYPTION_KEY giải mã thành 32 bytes Base64, binding D1/R2 tồn tại và Cloudflare Access đã xác thực Admin.

**Build fail:** mở log cụ thể của job, chạy lại npm run lint, npm test, npm run build và node automation/verify-build.mjs bằng Node.js 22+. Không bỏ qua bước build/test để deploy bản chưa kiểm tra.

## 11. Bảo mật vận hành

- Không commit .env, .dev.vars, .runtime, wrangler.generated.jsonc hoặc file secrets.
- Không đặt private token/key trong biến VITE_*; Vite nhúng các biến này vào browser assets.
- Không công khai R2 bucket chứa release/certificate objects.
- Duy trì Cloudflare Access cho mọi route Admin; định kỳ rà soát allow-list email.
- Bảo quản backup/rotation quy trình cho CERTIFICATE_ENCRYPTION_KEY; mất key đồng nghĩa không giải mã được chứng thư đã mã hóa.
- Kiểm tra Cloudflare Logs, usage, giới hạn upload và dependency alerts sau mỗi bản phát hành.
