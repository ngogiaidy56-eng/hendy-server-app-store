# Hendy Server App Store — Render + Cloudflare

Monorepo triển khai cho Hendy Server App Store với bốn giao diện riêng biệt: Storefront, Release Admin, Control Plane và Studio. **Render là backend chuẩn** (Express + PostgreSQL + Cloudflare R2); Cloudflare Pages phục vụ frontend tĩnh và Cloudflare Worker làm lớp edge proxy vào cùng backend đó. Thiết kế này tránh tình trạng Render/PostgreSQL và Worker/D1 giữ hai bộ release không đồng bộ.

## 1. Kiến trúc triển khai

```text
User browser
   │
   ├── Cloudflare Pages ── Storefront /
   │                    ├─ Release Admin /admin
   │                    ├─ Control Plane /control-plane/
   │                    └─ Studio /studio/
   │
   └── Cloudflare Worker (API edge proxy)
                    │ HTTPS + restricted CORS
                    ▼
           Render Web Service (Express)
                    ├── PostgreSQL (release metadata)
                    └── Cloudflare R2 (binary packages)
```

Render và Cloudflare dùng cùng một nguồn dữ liệu vì Worker chỉ chuyển tiếp request/response; Worker không tạo D1 database thứ hai. Có thể mở toàn bộ ứng dụng từ Render cùng origin hoặc mở frontend qua Cloudflare Pages.

## 2. Routes

| Route | Vai trò |
| --- | --- |
| `/` | Cửa hàng công khai — Windows, Android, iOS |
| `/admin` | Quản trị metadata release, upload binary, xuất bản/thu hồi |
| `/control-plane/` | Dashboard vận hành và quản lý release |
| `/studio/` | Media local, timeline, subtitle và xuất project manifest JSON |
| `/api/health` | Health check backend |
| `/api/releases` | Release đã xuất bản |
| `/api/update-check` | Kiểm tra phiên bản mới |
| `/api/admin/releases` | Quản trị release (Bearer token) |
| `/api/admin/uploads` | Upload binary lên R2, giới hạn hiện tại 25 MiB mỗi request |

## 3. Chạy local

Yêu cầu Node.js 22.x.

```bash
npm install --include=dev
npm run typecheck
npm test
npm run build
npm start
```

Mặc định Render app nghe cổng `PORT` do nền tảng cấp (fallback local: 10000). Mở `http://localhost:10000`. Các lệnh dev chạy storefront ở 5173, Control Plane ở 5174 và Studio ở 5175.

Không cấu hình `DATABASE_URL` thì API chỉ dùng `RELEASES_JSON` dạng read-only; thao tác quản trị sẽ bị khóa chủ động. Để thử quản trị, cần PostgreSQL, `ADMIN_API_TOKEN`, và các biến R2 nếu cần upload.

## 4. Triển khai Render

Mở [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/ngogiaidy56-eng/hendy-server-app-store) sau khi xác nhận repository trên GitHub có commit mới nhất.

Blueprint ở `render.yaml` tạo Web Service Node và PostgreSQL. Build command cài cả dev dependencies, kiểm tra TypeScript, chạy tests và build tất cả entry trước khi start. Health check là `/api/health`.

Đặt biến môi trường trực tiếp trong Render Dashboard:
- `ADMIN_API_TOKEN`: token dài, ngẫu nhiên và riêng cho API quản trị.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`: credentials R2 phù hợp với bucket phân phối.
- `R2_PUBLIC_BASE_URL`: origin HTTPS của custom domain/public bucket đã thiết lập trong Cloudflare R2.
- `DATABASE_URL` được liên kết từ PostgreSQL của Blueprint.

Không đặt secrets trong repository hoặc GitHub Variables dạng công khai. Sau khi Apply, lấy URL thật của Web Service từ Render Dashboard; đó là giá trị `RENDER_API_ORIGIN` cho Worker.

## 5. Triển khai Cloudflare

Tạo trước một Cloudflare Pages project và deploy Worker `hendy-server-app-store-api`. Trong repository GitHub, thiết lập **Actions Secrets**:
- `CLOUDFLARE_API_TOKEN` — token có quyền deploy Workers và Pages trong đúng account.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.

Thiết lập **Actions Variables**:
- `CLOUDFLARE_PAGES_PROJECT` — đúng tên Pages project đã tạo.
- `RENDER_API_ORIGIN` — origin HTTPS của Render Web Service, ví dụ `https://your-service.onrender.com` (không kèm path).
- `ALLOWED_ORIGIN` — origin chính xác của Pages/custom domain, ví dụ `https://your-project.pages.dev` (không kèm path).
- `VITE_API_BASE_URL` — origin HTTPS của Worker, ví dụ `https://hendy-server-app-store-api.<account-subdomain>.workers.dev` (không kèm path).

Workflow Worker injects `RENDER_API_ORIGIN` và `ALLOWED_ORIGIN` trong lúc deploy. Workflow Pages build các entry với `VITE_API_BASE_URL`, chạy typecheck/tests và deploy thư mục `dist`. Nếu thiếu biến hay secrets, workflow ghi warning và bỏ qua deploy thay vì phát hành frontend không kết nối được API.

CORS được giới hạn theo đúng một origin. Khi sử dụng custom domain, cập nhật `ALLOWED_ORIGIN` theo domain đó. Không dùng token `ADMIN_API_TOKEN` làm `CLOUDFLARE_API_TOKEN`.

## 6. API và bảo mật

- Backend dùng Bearer-token admin authorization và từ chối thao tác ghi khi chưa có token hoặc PostgreSQL.
- Release published phải có URL HTTPS, SHA-256 gồm 64 ký tự hex và dung lượng lớn hơn 0.
- R2 uploads kiểm tra phần mở rộng, giới hạn 25 MiB và tính SHA-256 từ nội dung thực tế.
- Không dùng `noindex` thay cho xác thực. Với quản trị nhiều người, nên bổ sung Cloudflare Access/SSO, rate limits và audit log.
- GitHub Actions cần được bật trong repository để CI/automatic deployment workflows chạy.

## 7. Phạm vi hiện tại

Studio đang quản lý media local, clip/timeline/subtitle metadata và xuất project manifest JSON — không giả định rằng MP4 đã được render. Muốn xuất video thật cần tích hợp render worker/FFmpeg pipeline. Tương tự, Control Plane quản lý release metadata; việc build, ký số và phát hành app Windows/Android/iOS phải được nối với pipeline CI/signing tương ứng.
