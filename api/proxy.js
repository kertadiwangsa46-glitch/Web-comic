// pages/api/proxy.js
// 🔰 Universal proxy dengan mapping endpoint Kiryuu lengkap.
// Gunakan di Vercel/Next.js agar frontend bisa akses tanpa CORS error.

export const config = {
  api: {
    bodyParser: true,
  },
};

const ALLOWLIST = ["https://www.sankavollerei.com"];
const BASE_URL = "https://www.sankavollerei.com";

// Semua endpoint Kiryuu di-map di sini
const KIRYUU_ENDPOINTS = {
  home: "/comic/kiryuu/home",
  popular: "/comic/kiryuu/popular",
  recommendations: "/comic/kiryuu/recommendations",
  latest: "/comic/kiryuu/latest",
  "top-weekly": "/comic/kiryuu/top-weekly",
  search: "/comic/kiryuu/search", // + /:query(/:page?)
  manga: "/comic/kiryuu/manga",   // + /:slug
  chapter: "/comic/kiryuu/chapter" // + /:slug
};

// Helper untuk validasi domain target
function isAllowed(url) {
  try {
    const origin = new URL(url).origin;
    return ALLOWLIST.includes(origin);
  } catch {
    return false;
  }
}

// Helper untuk mapping path → URL target
function buildTarget(reqPath) {
  // reqPath: mis. /kiryuu/home, /kiryuu/search/one%20piece, dst.
  const parts = reqPath.split("/").filter(Boolean); // ["kiryuu", "home"]
  const prefix = parts[0];
  const action = parts[1];
  const extra = parts.slice(2).join("/");

  if (prefix !== "kiryuu") return null;
  const basePath = KIRYUU_ENDPOINTS[action];
  if (!basePath) return null;

  // kalau endpoint dynamic (punya parameter), tambahkan tail-nya
  if (["search", "manga", "chapter"].includes(action) && extra) {
    return `${BASE_URL}${basePath}/${extra}`;
  }

  // kalau bukan dynamic → langsung return
  return `${BASE_URL}${basePath}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // ambil bagian path setelah /api/proxy
  const path = req.url.replace(/^\/?api\/proxy\/?/, "").split("?")[0];
  const target = buildTarget(`/${path}`);

  if (!target || !isAllowed(target)) {
    return res.status(400).json({
      success: false,
      error: "Endpoint tidak dikenal atau domain tidak diizinkan.",
      hint: "Gunakan path seperti /api/proxy/kiryuu/home atau /api/proxy/kiryuu/search/one%20piece"
    });
  }

  try {
    const upstream = await fetch(target, { method: "GET" });
    const data = await upstream.text(); // bisa JSON atau HTML, tergantung API
    const contentType = upstream.headers.get("content-type");
    res.setHeader("Content-Type", contentType || "application/json");
    res.status(upstream.status).send(data);
  } catch (e) {
    res.status(500).json({ success: false, error: "Gagal fetch dari upstream", details: e.message });
  }
}
