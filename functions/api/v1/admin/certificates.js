function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function bytesToBase64(bytes) {
  let binary = "";
  for (const item of bytes) binary += String.fromCharCode(item);
  return btoa(binary);
}
async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}
function safeName(value) {
  const name = String(value || "certificate.bin").split(/[\\/]/).pop() || "certificate.bin";
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function onRequestGet(context) {
  const identity = context.data?.adminIdentity;
  const { DB } = context.env || {};
  if (!identity?.email) return json({ success: false, error: "authentication_required" }, 401);
  if (!DB) return json({ success: false, error: "d1_not_configured" }, 503);
  try {
    const result = await DB.prepare("SELECT id, file_name AS fileName, size_bytes AS sizeBytes, sha256, uploaded_at AS uploadedAt, encryption_algorithm AS encryptionAlgorithm FROM certificates ORDER BY uploaded_at DESC LIMIT 100").all();
    return json({ success: true, certificates: result.results || [] });
  } catch (error) {
    console.error("certificate inventory query failed", error instanceof Error ? error.message : "unknown error");
    return json({ success: false, error: "certificate_inventory_unavailable" }, 503);
  }
}

export async function onRequestPost(context) {
  const identity = context.data?.adminIdentity;
  const env = context.env || {};
  if (!identity?.email) return json({ success: false, error: "authentication_required" }, 401);
  if (!env.DB || !env.RELEASES?.put) return json({ success: false, error: "certificate_storage_not_configured" }, 503);

  let keyBytes;
  try { keyBytes = base64ToBytes(String(env.CERTIFICATE_ENCRYPTION_KEY || "")); }
  catch { keyBytes = new Uint8Array(); }
  if (keyBytes.byteLength !== 32) return json({ success: false, error: "certificate_encryption_not_configured", message: "Cần cấu hình CERTIFICATE_ENCRYPTION_KEY là key Base64 32 byte trong Pages secrets." }, 503);

  let form;
  try { form = await context.request.formData(); }
  catch { return json({ success: false, error: "invalid_multipart" }, 400); }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ success: false, error: "certificate_required" }, 400);
  if (file.size < 1 || file.size > 20 * 1024 * 1024) return json({ success: false, error: "certificate_size_limit", message: "Tệp chứng thư phải dưới 20 MB." }, 413);
  const fileName = safeName(file.name);
  const extension = fileName.toLowerCase().split(".").pop();
  if (!["p12", "pfx", "cer", "crt", "mobileprovision"].includes(extension)) return json({ success: false, error: "unsupported_certificate_type" }, 415);

  const original = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const importedKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, importedKey, original);
  const id = crypto.randomUUID();
  const r2Key = "private/certificates/" + id + ".aesgcm";
  const uploadedAt = new Date().toISOString();
  const fileHash = await sha256(original);
  const mimeType = String(file.type || "application/octet-stream").slice(0, 120);
  try {
    await env.RELEASES.put(r2Key, encrypted, {
      httpMetadata: { contentType: "application/octet-stream", cacheControl: "no-store" },
      customMetadata: {
        originalFileName: fileName,
        encrypted: "true",
        algorithm: "AES-GCM-256",
        iv: bytesToBase64(iv),
        sha256: fileHash,
        uploadedBy: identity.email,
        uploadedAt
      }
    });
    await env.DB.prepare("INSERT INTO certificates (id, file_name, r2_key, size_bytes, sha256, mime_type, encryption_algorithm, encryption_iv, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, fileName, r2Key, file.size, fileHash, mimeType, "AES-GCM-256", bytesToBase64(iv), identity.email, uploadedAt).run();
  } catch (error) {
    try { await env.RELEASES.delete(r2Key); } catch {}
    console.error("certificate upload failed", error instanceof Error ? error.message : "unknown error");
    return json({ success: false, error: "certificate_upload_failed" }, 503);
  }
  return json({
    success: true,
    certificate: { id, fileName, sizeBytes: file.size, sha256: fileHash, uploadedAt, encryptionAlgorithm: "AES-GCM-256" },
    message: "Chứng thư đã được mã hóa và lưu vào R2 riêng tư. API công khai không cung cấp đường dẫn tải xuống."
  }, 201);
}
