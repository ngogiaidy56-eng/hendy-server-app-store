const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
const bucketName = "hendy-tool-releases";

if (!/^[a-f0-9]{32}$/i.test(accountId)) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID is missing or invalid; use the 32-character Cloudflare Account ID.");
}
if (!apiToken) {
  throw new Error("CLOUDFLARE_API_TOKEN is missing; add a scoped Cloudflare API token.");
}

async function cloudflareApi(path, init = {}) {
  const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + apiToken,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Cloudflare API returned a non-JSON response for " + path + " (HTTP " + response.status + ").");
  }
  if (!response.ok || payload.success !== true) {
    const reasons = Array.isArray(payload.errors)
      ? payload.errors.map((item) => item.message || item.code).filter(Boolean).join("; ")
      : "";
    throw new Error("Cloudflare API failed for " + path + " (HTTP " + response.status + ")" + (reasons ? ": " + reasons : "") + ".");
  }
  return payload.result;
}

const result = await cloudflareApi("/accounts/" + accountId + "/r2/buckets?per_page=1000");
const buckets = Array.isArray(result) ? result : (result?.buckets || []);
if (!buckets.some((bucket) => bucket.name === bucketName)) {
  await cloudflareApi("/accounts/" + accountId + "/r2/buckets", {
    method: "POST",
    body: JSON.stringify({ name: bucketName }),
  });
  console.log("Created R2 bucket: " + bucketName);
} else {
  console.log("R2 bucket already exists: " + bucketName);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    "### Cloudflare resources",
    "",
    "- R2 bucket: `" + bucketName + "` — ready",
    "- Production uses one Worker with Static Assets and an R2 binding.",
    "",
  ].join("\n"));
}
