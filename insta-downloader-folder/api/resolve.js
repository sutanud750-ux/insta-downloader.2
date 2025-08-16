// api/resolve.js
function isValidInstagramUrl(u) {
  try {
    const x = new URL(u);
    const host = x.hostname.replace(/^www\./, "");
    return host.endsWith("instagram.com") || host.endsWith("instagr.am");
  } catch {
    return false;
  }
}

function cleanUrl(u) {
  return u ? u.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&") : u;
}

function extractCandidates(html) {
  const candidates = [];
  const regexps = [
    /\"video_url\":\"(.*?)\"/,
    /\"contentUrl\":\"(.*?\\.mp4[^\\"\\]*)\"/,
    /(https?:\\/\\/[^\\"']+?\\.mp4[^\\"']*)/,
  ];
  for (const re of regexps) {
    const m = html.match(re);
    if (m) candidates.push(cleanUrl(m[1]));
  }

  // Image fallback
  const imgMatch = html.match(/\"display_url\":\"(.*?)\"/);
  if (imgMatch) candidates.push(imgMatch[1]);

  return candidates;
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Use POST { url }" });
    return;
  }

  const { url } = req.body || {};
  if (!isValidInstagramUrl(url)) {
    res.status(400).json({ ok: false, error: "Invalid Instagram URL" });
    return;
  }

  try {
    const igRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });
    const html = await igRes.text();

    const candidates = extractCandidates(html);
    if (!candidates.length) {
      res.status(404).json({ ok: false, error: "No media found (post may be private)." });
      return;
    }

    res.json({ ok: true, url: candidates[0], type: candidates[0].endsWith(".mp4") ? "video" : "image" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
