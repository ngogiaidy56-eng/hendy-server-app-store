import express from "express";
import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRenderPlatform } from "./platform.js";
import { registerDownloaderRoutes } from "./downloader-api.js";
import { registerTelegramRoutes } from "./telegram-bot.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FUNCTIONS_DIR = join(ROOT, "functions");
const DIST_DIR = join(ROOT, "dist");
const MAX_REQUEST_BODY_BYTES = 27 * 1024 * 1024;
const PORT = Number(process.env.PORT || 10000);

function sha256(value) {
  return createHash("sha256").update(String(value)).digest();
}
function safeEqual(left, right) {
  return timingSafeEqual(sha256(left), sha256(right));
}
function isAdminPath(pathname) {
  return pathname === "/admin" || pathname === "/admin/" ||
    pathname === "/admin.html" || pathname === "/studio" ||
    pathname.startsWith("/studio/") || pathname === "/api/auth" ||
    pathname === "/api/v1/runtime-config" || pathname === "/api/sync-logs" ||
    pathname.startsWith("/api/sync-logs/") ||
    pathname === "/api/v1/admin" || pathname.startsWith("/api/v1/admin/") ||
    pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}
function verifyAdminAuthorization(header, env) {
  const username = String(env.ADMIN_USERNAME || "");
  const password = String(env.ADMIN_PASSWORD || "");
  const email = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(username) || password.length < 20 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { configured: false };
  if (typeof header !== "string" || !header.startsWith("Basic ")) return { configured: true, identity: null };
  try {
    const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) return { configured: true, identity: null };
    const suppliedUsername = decoded.slice(0, separator);
    const suppliedPassword = decoded.slice(separator + 1);
    const valid = safeEqual(suppliedUsername, username) && safeEqual(suppliedPassword, password);
    return { configured: true, identity: valid ? { email, authenticated: true, provider: "render-basic-auth" } : null };
  } catch {
    return { configured: true, identity: null };
  }
}
async function readRequestBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maxBytes) {
      const error = new Error("Request body exceeds the server upload limit.");
      error.status = 413;
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, size);
}
function resolveFunctionModule(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (!decoded.startsWith("/api/") || decoded.includes("\\") || decoded.split("/").some((part) => part === "..")) return null;
  const relativePath = decoded.replace(/^\/+/, "") + ".js";
  const absolute = resolve(FUNCTIONS_DIR, relativePath);
  if (!absolute.startsWith(FUNCTIONS_DIR + sep) || !existsSync(absolute)) return null;
  return absolute;
}
async function toWebRequest(req, maxBytes) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const method = req.method.toUpperCase();
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    const body = await readRequestBody(req, maxBytes);
    if (body.byteLength) init.body = body;
  }
  return new Request((req.protocol || "https") + "://" + req.get("host") + req.originalUrl, init);
}
async function sendWebResponse(response, res) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  if (!response.body || res.req.method === "HEAD") {
    res.end();
    return;
  }
  try {
    for await (const chunk of response.body) {
      if (res.destroyed) return;
      res.write(Buffer.from(chunk));
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Response streaming failed");
    } else {
      res.destroy(error);
    }
  }
}
function jsonError(res, status, error, message) {
  res.status(status).set("Cache-Control", "no-store").json({ success: false, error, message });
}

async function createApp(platform) {
  const app = express();
  app.disable("x-powered-by");
  // Render places a trusted reverse proxy in front of the service.
  app.set("trust proxy", 1);

  const env = {
    ...process.env,
    APP_NAME: process.env.APP_NAME || "Hendy App Store",
    ENVIRONMENT: process.env.ENVIRONMENT || "production",
    RELEASE_CHANNEL: process.env.RELEASE_CHANNEL || "stable",
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "",
    DB: platform.DB,
    RELEASES: platform.RELEASES,
    RATE_LIMITS: platform.RATE_LIMITS
  };

  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", isAdminPath(req.path) ? "DENY" : "SAMEORIGIN");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    if (isAdminPath(req.path)) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    next();
  });

  app.use((req, res, next) => {
    if (!isAdminPath(req.path)) return next();
    const auth = verifyAdminAuthorization(req.headers.authorization, env);
    if (!auth.configured) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Hendy Admin", charset="UTF-8"');
      return jsonError(res, 503, "admin_auth_not_configured", "Cấu hình ADMIN_USERNAME, ADMIN_PASSWORD (tối thiểu 20 ký tự) và ADMIN_EMAIL trong Render Environment.");
    }
    if (!auth.identity) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Hendy Admin", charset="UTF-8"');
      return jsonError(res, 401, "authentication_required", "Đăng nhập bằng thông tin Admin đã cấu hình trên Render.");
    }
    req.adminIdentity = auth.identity;
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase()) && req.path.startsWith("/api/")) {
      const origin = req.get("origin");
      const host = String(req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
      let originHost = "";
      try { originHost = new URL(origin || "").host; } catch {}
      if (!originHost || originHost !== host) {
        return jsonError(res, 403, "origin_not_allowed", "Yêu cầu thay đổi dữ liệu phải đến từ cùng nguồn.");
      }
    }
    next();
  });

  app.get("/healthz", (_req, res) => res.status(200).json({ status: "healthy", service: "hendy-server-app-store", runtime: "render-node-express", timestamp: new Date().toISOString() }));

  app.use(async (req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    if (typeof env.RATE_LIMITS?.consume !== "function") return next();
    try {
      const ip = String(req.ip || req.socket.remoteAddress || "unknown").slice(0, 100);
      const minute = Math.floor(Date.now() / 60000);
      const count = await env.RATE_LIMITS.consume("ratelimit:" + ip + ":" + minute, 120);
      if (count > 120) return jsonError(res, 429, "rate_limited", "Quá nhiều yêu cầu. Vui lòng thử lại sau một phút.");
      next();
    } catch (error) {
      console.error("PostgreSQL rate limiter unavailable", error instanceof Error ? error.message : "unknown error");
      jsonError(res, 503, "rate_limiter_unavailable", "Bộ giới hạn truy cập tạm thời không hoạt động.");
    }
  });

  registerDownloaderRoutes(app, env, { toWebRequest, sendWebResponse, maxBodyBytes: MAX_REQUEST_BODY_BYTES });
  registerTelegramRoutes(app, express, env, jsonError);

  app.use(async (req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    const modulePath = resolveFunctionModule(req.path);
    if (!modulePath) return jsonError(res, 404, "route_not_found", "API route không tồn tại.");
    try {
      const route = await import(pathToFileURL(modulePath).href);
      const method = req.method.toLowerCase();
      let handler = route["onRequest" + method[0].toUpperCase() + method.slice(1)];
      if (!handler && method === "head") handler = route.onRequestGet;
      if (!handler) handler = route.onRequest;
      if (typeof handler !== "function") return jsonError(res, 405, "method_not_allowed", "Phương thức HTTP không được hỗ trợ.");
      const request = await toWebRequest(req, MAX_REQUEST_BODY_BYTES);
      const context = {
        request,
        env,
        data: { adminIdentity: req.adminIdentity || null },
        params: {},
        next: async () => new Response(null, { status: 404 })
      };
      const result = await handler(context);
      if (!(result instanceof Response)) throw new TypeError("API handler did not return a Web Response.");
      await sendWebResponse(result, res);
    } catch (error) {
      if (error?.status === 413) return jsonError(res, 413, "payload_too_large", "Dữ liệu tải lên vượt quá giới hạn máy chủ.");
      console.error("API request failed", req.requestId, req.path, error instanceof Error ? error.stack : "unknown error");
      if (!res.headersSent) jsonError(res, 500, "internal_error", "Yêu cầu không thể được xử lý.");
      else res.destroy(error);
    }
  });

  app.get(/^\/(?:admin\/?|studio(?:\/.*)?)$/, (_req, res) => res.redirect(302, "/admin.html"));

  app.use(express.static(DIST_DIR, {
    index: false,
    dotfiles: "deny",
    etag: true,
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    }
  }));

  app.get("/", (_req, res) => res.sendFile(join(DIST_DIR, "index.html")));
  app.use((_req, res) => res.status(404).send("Not Found"));
  return app;
}

async function main() {
  let platform;
  try {
    platform = await createRenderPlatform(process.env);
  } catch (error) {
    if (process.env.ALLOW_DEGRADED_START !== "true") throw error;
    console.error("Starting in degraded mode; configure DATABASE_URL to enable API storage:", error instanceof Error ? error.message : "database unavailable");
    platform = { DB: null, RELEASES: null, RATE_LIMITS: null, async close() {} };
  }
  const app = await createApp(platform);
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("Hendy App Store listening on 0.0.0.0:" + PORT);
    console.log("Runtime: Render Node.js + Express; database: external PostgreSQL; artifact store: PostgreSQL BYTEA.");
  });
  const shutdown = (signal) => {
    console.log("Received " + signal + "; shutting down gracefully.");
    server.close(async () => {
      await platform.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 25000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("Hendy App Store startup failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
