function errorResponse(error, status = 500) {
  return Response.json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function onRequestGet(context) {
  const { DB, RATE_LIMITS } = context.env || {};
  if (!DB) return errorResponse("d1_not_configured", 503);
  try {
    const logs = await DB.prepare("SELECT id, status, message, actor_email AS actorEmail, created_at AS createdAt FROM sync_logs ORDER BY created_at DESC LIMIT 50").all();
    const statusRecord = RATE_LIMITS ? await RATE_LIMITS.get("sync:status", "json") : null;
    return Response.json({
      success: true,
      status: statusRecord || { status: "idle", message: "Chưa chạy tác vụ đồng bộ.", updatedAt: null },
      logs: logs.results || []
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("sync logs query failed", error instanceof Error ? error.message : "unknown error");
    return errorResponse("sync_logs_unavailable", 503);
  }
}

export async function onRequestPost(context) {
  const { DB, RATE_LIMITS } = context.env || {};
  const identity = context.data?.adminIdentity;
  if (!identity?.email) return errorResponse("authentication_required", 401);
  if (!DB) return errorResponse("d1_not_configured", 503);
  let body;
  try {
    if (Number(context.request.headers.get("content-length") || 0) > 32768) return errorResponse("payload_too_large", 413);
    body = await context.request.json();
  } catch { return errorResponse("invalid_json", 400); }
  const status = ["started", "success", "failed", "warning"].includes(body?.status) ? body.status : "warning";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "Cập nhật trạng thái đồng bộ.";
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    await DB.prepare("INSERT INTO sync_logs (id, status, message, actor_email, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, status, message, identity.email, JSON.stringify(body?.details || {}), createdAt).run();
    const record = { id, status, message, actorEmail: identity.email, createdAt };
    if (RATE_LIMITS) await RATE_LIMITS.put("sync:status", JSON.stringify(record), { expirationTtl: 604800 });
    return Response.json({ success: true, log: record }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("sync log write failed", error instanceof Error ? error.message : "unknown error");
    return errorResponse("sync_log_write_failed", 503);
  }
}
