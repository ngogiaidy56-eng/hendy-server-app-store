# Hendy App Store database schema

Schema này được áp dụng lên Cloudflare D1 bằng Wrangler migrations.

- `migrations/0001_init.sql`: apps, releases, storefront settings, sync logs và certificate metadata.
- Artifact nhị phân lưu trong R2; D1 chỉ lưu metadata và object key.
- Chứng thư được mã hóa trước khi lưu vào R2; D1 chỉ lưu thông tin kiểm kê.
- Không lưu API token, private key hoặc giá trị secrets trong D1.

Chạy migration trên database đã được provision:

```bash
npx wrangler@4 d1 migrations apply hendy-app-store-db --remote --config=wrangler.generated.jsonc
```
