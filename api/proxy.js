// ====================================================
// 🔰 UNIVERSAL PROXY UNTUK 8 ENDPOINT KOMIKSTATION
// ====================================================
// Gunakan di Vercel/Next.js agar bebas CORS dan aman
// ====================================================

export const config = {
  api: { bodyParser: true },
};

// 🌍 Domain yang diizinkan
const ALLOWLIST = ["https://www.sankavollerei.com"];
const BASE_URL = "https://www.sankavollerei.com";

// =======================
// 📚 Endpoint yang dipakai
// =======================
const ENDPOINTS = {
  home: "/comic/komikstation/home",             // index.html
  popular: "/comic/komikstation/popular",       // populer.html
  recommendation: "/comic/komikstation/recommendation", // recommend.html
  "top-weekly": "/comic/komikstation/top-weekly", // top.html
  ongoing: "/comic/komikstation/ongoing",       // latest.html
  search: "/comic/komikstation/search",         // search.html
  manga: "/comic/komikstation/manga",           // detail.html
  chapter: "/comic/komikstation/chapter",       // chapter.html
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
  // contoh: /komikstation/home → ["komikstation","home"]
  const parts = reqPath.split("/").filter(Boolean);
  const prefix = parts[0]; // komikstation
  const action = parts[1]; // home, popular, dsb
  const extra = parts.slice(2).join("/");

  if (prefix !== "komikstation") return null;
  const basePath = ENDPOINTS[action];
  if (!basePath) return null;

  // Untuk endpoint dinamis
  if (["search", "manga", "chapter", "ongoing", "popular"].includes(action) && extra) {
    return `${BASE_URL}${basePath}/${extra}`;
  }

  // Untuk endpoint statis
  return `${BASE_URL}${basePath}`;
}

// =======================
// 🚀 Handler utama proxy
// =======================
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const path = req.url.replace(/^\/?api\/proxy\/?/, "").split("?")[0];
  const target = buildTarget(`/${path}`);

  if (!target || !isAllowed(target)) {
    return res.status(400).json({
      success: false,
      error: "Endpoint tidak dikenal atau domain tidak diizinkan.",
      hint: "Gunakan format /api/proxy/komikstation/{endpoint}",
      contoh: [
        "/api/proxy/komikstation/home",
        "/api/proxy/komikstation/popular?page=1",
        "/api/proxy/komikstation/manga/solo-leveling",
      ],
    });
  }

  try {
    const upstream = await fetch(target, { method: "GET" });
    const data = await upstream.text();
    const contentType = upstream.headers.get("content-type");
    res.setHeader("Content-Type", contentType || "application/json");
    res.status(upstream.status).send(data);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Gagal fetch dari upstream",
      details: err.message,
    });
  }
}
