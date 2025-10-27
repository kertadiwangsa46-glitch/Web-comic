// ====================================================
// 🔰 UNIVERSAL PROXY UNTUK 8 ENDPOINT KOMIKSTATION
// ====================================================
// Bebas CORS, aman, dan auto adaptif untuk semua endpoint
// Gunakan di: /api/proxy/komikstation/{endpoint}
// ====================================================

export const config = {
  api: { bodyParser: true },
};

// 🌍 Domain yang diizinkan
const ALLOWLIST = ["https://www.sankavollerei.com"];
const BASE_URL = "https://www.sankavollerei.com";

// =======================
// 📚 Daftar Endpoint
// =======================
const ENDPOINTS = {
  home: "/comic/komikstation/home",               // index.html
  popular: "/comic/komikstation/popular",         // populer.html
  recommendation: "/comic/komikstation/recommendation", // recommend.html
  "top-weekly": "/comic/komikstation/top-weekly", // top.html
  ongoing: "/comic/komikstation/ongoing",         // latest.html
  search: "/comic/komikstation/search",           // search.html
  manga: "/comic/komikstation/manga",             // detail.html
  chapter: "/comic/komikstation/chapter",         // chapter.html
};

// =======================
// 🧠 Validasi domain target
// =======================
function isAllowed(url) {
  try {
    const origin = new URL(url).origin;
    return ALLOWLIST.includes(origin);
  } catch {
    return false;
  }
}

// =======================
// ⚙️ Bangun URL target final
// =======================
function buildTarget(reqPath) {
  const parts = reqPath.split("/").filter(Boolean);
  const prefix = parts[0]; // komikstation
  const action = parts[1]; // home, popular, dst
  const extra = parts.slice(2).join("/");

  if (prefix !== "komikstation") return null;
  const basePath = ENDPOINTS[action];
  if (!basePath) return null;

  // Endpoint dinamis (dengan slug/query tambahan)
  if (["search", "manga", "chapter", "ongoing", "popular"].includes(action) && extra) {
    return `${BASE_URL}${basePath}/${extra}`;
  }

  // Endpoint statis
  return `${BASE_URL}${basePath}`;
}

// =======================
// 🚀 Handler utama proxy
// =======================
export default async function handler(req, res) {
  // ✅ Header CORS selalu di awal
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Tangani preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const path = req.url.replace(/^\/?api\/proxy\/?/, "").split("?")[0];
  const target = buildTarget(`/${path}`);

  // 🔒 Validasi target
  if (!target || !isAllowed(target)) {
    res.status(400).json({
      success: false,
      error: "Endpoint tidak dikenal atau domain tidak diizinkan.",
      hint: "Gunakan format /api/proxy/komikstation/{endpoint}",
      contoh: [
        "/api/proxy/komikstation/home",
        "/api/proxy/komikstation/popular?page=1",
        "/api/proxy/komikstation/manga/solo-leveling",
      ],
    });
    return;
  }

  try {
    // 🛰️ Forward request ke server utama
    const upstream = await fetch(target, { method: "GET" });
    const data = await upstream.text();
    const contentType = upstream.headers.get("content-type");

    // 🧾 Kirim balik ke client
    res.setHeader("Content-Type", contentType || "application/json");
    res.status(upstream.status).send(data);
  } catch (err) {
    // ⚠️ Error handling
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      success: false,
      error: "Gagal fetch dari upstream.",
      details: err.message,
    });
  }
}
