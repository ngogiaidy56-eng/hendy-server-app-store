# Hendy Server App Store

Nền tảng phân phối ứng dụng Hendy được xây dựng lại với giao diện web tiếng Việt, API kiểm tra phiên bản, bảng quản trị release và hai backend triển khai: Cloudflare Workers/D1/R2 hoặc Render/Node.js/PostgreSQL/R2.

## Repository

- Source: https://github.com/hendyngo-servers/HendyToolsPlatform
- App Store (repo đang triển khai): https://github.com/hendyngo-servers/Hendy-server-app-store

## Chức năng

- Danh mục tải ứng dụng Windows, Android và iOS; chỉ hiển thị những release ở trạng thái `published`.
- API cập nhật phiên bản có so sánh phiên bản dạng số, channel và nền tảng.
- Bảng quản trị dùng Bearer token, hỗ trợ tạo release, xuất bản/rút bản phát hành, xóa metadata và thử xóa file R2 tương ứng.
- Tải tệp trực tiếp lên Cloudflare R2; SHA-256 được tính trên máy chủ đối với tệp tải qua endpoint upload.
- Dữ liệu metadata bền vững: PostgreSQL trên Render hoặc D1 trên Cloudflare.
- GitHub Actions chạy build + smoke tests; deploy Worker và Render chỉ hoạt động khi thông tin xác thực tương ứng đã được cấu hình.
- Không nhúng token, credential, tệp nhị phân mẫu hoặc URL tải giả trong mã nguồn.

## API

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| `GET` | `/api/health` | Health check và trạng thái kiểu lưu trữ |
| `GET` | `/api/releases` | Danh sách release đã xuất bản |
| `GET` | `/api/update-check?platform=windows&channel=stable&clientVersion=1.0.0` | Kiểm tra cập nhật |
| `GET` | `/api/telemetry` | Uptime/runtime tối thiểu |
| `GET` | `/api/admin/releases` | Danh sách release (Bearer token) |
| `POST` | `/api/admin/releases` | Tạo draft hoặc published release (Bearer token) |
| `PATCH` | `/api/admin/releases/:id` | Sửa trạng thái/metadata (Bearer token) |
| `DELETE` | `/api/admin/releases/:id` | Xóa release (Bearer token) |
| `POST` | `/api/admin/uploads` | Upload binary lên R2, raw body `application/octet-stream` (Bearer token) |

Khi xuất bản, server yêu cầu URL HTTPS, SHA-256 64 ký tự hex và dung lượng lớn hơn 0. Khi tải file qua R2 upload API, SHA-256 và dung lượng được tính trên server. Nếu nhập URL bên ngoài, người quản trị phải tự tính SHA-256 từ chính binary đã tải lên; server chỉ kiểm tra định dạng giá trị, không thể xác minh nội dung của host bên ngoài.

File upload trực tiếp bị giới hạn 25 MiB và chỉ nhận các định dạng EXE, MSI, MSIX, ZIP, 7Z, APK, AAB, DMG, PKG, IPA, AppImage. Với gói lớn hơn, tải lên R2 theo quy trình riêng rồi nhập URL HTTPS, SHA-256 và dung lượng byte vào biểu mẫu.

## Chạy local

Yêu cầu Node.js 22+.

```bash
npm install
npm run build
npm test
npm start
```

Mở `http://localhost:10000`. Để phát triển UI với Vite: `npm run dev`.

Nếu không đặt `DATABASE_URL`, API public chỉ đọc từ biến `RELEASES_JSON`; các endpoint quản trị cố tình trả lỗi và không ghi vào bộ nhớ tạm. Vì vậy, thử nghiệm local đọc danh mục không thay thế kiểm thử PostgreSQL/D1 và R2 thật.

## Triển khai Render

`render.yaml` mô tả Web Service Node.js và PostgreSQL để lưu metadata. Render Blueprint cấu hình PostgreSQL ở plan `0.1c-256mb`; hãy kiểm tra giá và vùng triển khai trong Render trước khi xác nhận tạo tài nguyên. Web Service hiện dùng plan `free`, có thể cần nâng cấp tùy tải và mục tiêu uptime.

1. Mở repository này trong Render Blueprint.
2. Kiểm tra resources/giá, sau đó áp dụng Blueprint để tạo Web Service và Postgres.
3. Điền các biến được yêu cầu: `ADMIN_API_TOKEN`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`.
4. Tạo R2 API token có quyền tối thiểu cần thiết trên bucket phát hành; domain của bucket phải dùng HTTPS và được cấu hình public/custom domain theo chính sách của bạn.
5. Health check: `/api/health`.

`DATABASE_URL` được tham chiếu từ Render Postgres trong Blueprint. Server tạo bảng metadata khi khởi động/health check đầu tiên. Không dùng `RELEASES_JSON` làm nguồn chính sau khi đã bật PostgreSQL.

## Triển khai Cloudflare Workers + D1 + R2

Worker API được deploy qua GitHub Actions. Frontend Vite được deploy riêng bằng Cloudflare Pages, với build command `npm run build` và output directory `dist`.

1. Thêm GitHub Actions secrets `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID`. Token cần quyền triển khai Workers; khi tự tạo D1/R2 qua CLI, cấp thêm quyền D1/R2 phù hợp.
2. Tạo database và bucket, ví dụ:

   ```bash
   npx wrangler d1 create hendy-server-app-store-releases
   npx wrangler r2 bucket create hendy-server-app-store-releases
   ```

3. Mở `wrangler.toml`, bật các binding `RELEASES_DB` và `RELEASES_BUCKET`, rồi thay `database_id` bằng ID thật do lệnh D1 trả về. Không commit token.
4. Áp dụng schema D1 sau khi đã cấu hình binding:

   ```bash
   npx wrangler d1 execute hendy-server-app-store-releases --remote --file=migrations/0001_releases.sql
   ```

5. Cấu hình secret Worker `ADMIN_API_TOKEN` (ví dụ chạy `npx wrangler secret put ADMIN_API_TOKEN` bằng tài khoản/CLI đã xác thực).
6. Cấu hình `PUBLIC_DOWNLOAD_BASE_URL` bằng domain HTTPS đã gắn với bucket R2. Để bảng quản trị hoạt động từ một origin khác, cấu hình `ALLOWED_ORIGIN` bằng đúng origin của Cloudflare Pages; không thêm dấu `/` ở cuối.
7. Deploy workflow **Deploy Cloudflare Worker API**. Đặt biến build `VITE_API_BASE_URL` cho Cloudflare Pages bằng URL Worker API. Nếu Pages/Worker cùng origin và có routing phù hợp, có thể để trống biến này.

Các binding D1/R2 trong `wrangler.toml` đang được comment để tránh tự động tạo tài nguyên trong tài khoản Cloudflare khi chưa được xác nhận. Phải bật và điền ID/bucket thực trước khi sử dụng các chức năng ghi/upload. Khi binding chưa có, Worker có thể vẫn chạy API đọc với `RELEASES_JSON`, nhưng quản trị sẽ trả lỗi cấu hình có chủ đích.

## GitHub Actions

- **Verify and Build**: cài dependency, chạy TypeScript/Vite build và HTTP smoke tests.
- **Deploy Cloudflare Worker API**: deploy khi các secrets Cloudflare có sẵn.
- **Trigger Render Deploy**: kích hoạt Render deploy hook nếu secret `RENDER_DEPLOY_HOOK_URL` đã được đặt.

Secrets cần thiết được cấu hình trong GitHub: **Settings → Secrets and variables → Actions**. Đừng viết token vào workflow, source code, commit hoặc manifest.

## Ghi chú bảo mật và phạm vi

- Dùng HTTPS cho dashboard, API và URL tải. Dùng một token quản trị dài, ngẫu nhiên; đổi token ngay nếu bị lộ. Không chia sẻ token cho người dùng cuối.
- Token được gửi bằng header `Authorization: Bearer ...`, không đặt trong URL. UI chỉ lưu token trong `sessionStorage` của tab hiện tại.
- Backend có một token dùng chung, chưa có tài khoản nhiều vai trò, nhật ký kiểm toán đầy đủ hoặc rate limiting riêng; cân nhắc Access/SSO, rate limit ở edge và rotation trước khi mở cho nhiều người quản trị.
- Không có bản cài đặt nào được tạo giả. Danh mục mặc định rỗng cho đến khi bạn thêm release và xác minh binary.
- CI chạy smoke tests với manifest tạm; bài test này không thể thay cho triển khai thật, thử upload vào bucket, xác minh domain tải hoặc kiểm thử trên ứng dụng Windows/Android/iOS.

