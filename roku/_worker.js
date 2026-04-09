// Flix Vision — Cloudflare Worker
const TMDB_KEY = '2f3cb5763db1117fcba3948632f8aad9';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

const HTML_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'text/html'
};

const SOURCES = [
  (type, id, s, e) => type === 'movie' ? `https://vidsrc.xyz/embed/movie/${id}` : `https://vidsrc.xyz/embed/tv/${id}/${s}-${e}`,
  (type, id, s, e) => type === 'movie' ? `https://vidsrc.to/embed/movie/${id}` : `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  (type, id, s, e) => type === 'movie' ? `https://vidsrc.me/embed/movie?tmdb=${id}` : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  (type, id, s, e) => type === 'movie' ? `https://embed.smashystream.com/playere.php?tmdb=${id}` : `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`,
  (type, id, s, e) => type === 'movie' ? `https://multiembed.mov/?video_id=${id}&tmdb=1` : `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  (type, id, s, e) => type === 'movie' ? `https://moflix-stream.xyz/movie/tmdb/${id}` : `https://moflix-stream.xyz/tv/tmdb/${id}/${s}/${e}`,
];

const SOURCE_NAMES = ['VidSrc.xyz', 'VidSrc.to', 'VidSrc.me', 'SmashyStream', 'MultiEmbed', 'Moflix'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' } });
    }

    // ── /embed — full HTML page with iframe player (for Roku roHtmlWidget) ──
    if (url.pathname === '/embed') {
      const type  = url.searchParams.get('type') || 'movie';
      const id    = url.searchParams.get('id');
      const s     = url.searchParams.get('s') || '1';
      const e     = url.searchParams.get('e') || '1';
      const src   = parseInt(url.searchParams.get('src') || '0');
      if (!id) return new Response('missing id', { status: 400 });
      const idx = Math.min(src, SOURCES.length - 1);
      const embedUrl = SOURCES[idx](type, id, s, e);
      return new Response(playerHtml(embedUrl, SOURCE_NAMES, type, id, s, e, idx), { headers: HTML_CORS });
    }

    // ── /trailer — YouTube embed page ──────────────────────────
    if (url.pathname === '/trailer') {
      const v = url.searchParams.get('v');
      if (!v) return new Response('missing v', { status: 400 });
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;background:#000}iframe{width:100vw;height:100vh;border:none}</style></head>
<body><iframe src="https://www.youtube.com/embed/${v}?autoplay=1" allowfullscreen allow="autoplay"></iframe></body></html>`;
      return new Response(html, { headers: HTML_CORS });
    }

    // ── /tmdb/* ───────────────────────────────────────────────
    if (url.pathname.startsWith('/tmdb/')) {
      const tmdbPath = url.pathname.replace('/tmdb', '');
      const tmdbUrl  = new URL(`https://api.themoviedb.org/3${tmdbPath}`);
      tmdbUrl.searchParams.set('api_key', TMDB_KEY);
      url.searchParams.forEach((v, k) => { if (k !== 'api_key') tmdbUrl.searchParams.set(k, v); });
      const resp = await fetch(tmdbUrl.toString());
      const data = await resp.json();
      return new Response(JSON.stringify(data), { headers: CORS });
    }

    return env.ASSETS.fetch(request);
  }
};

function playerHtml(embedUrl, names, type, id, s, e, activeIdx) {
  const btns = names.map((n, i) => {
    const url = SOURCES[i](type, id, s, e);
    const active = i === activeIdx ? 'background:#e50914;color:#fff' : 'background:#333;color:#ccc';
    return `<button onclick="load('${url}')" style="${active};border:none;padding:6px 12px;margin:2px;cursor:pointer;font-size:13px;border-radius:4px">${n}</button>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;display:flex;flex-direction:column;height:100vh}
#bar{background:#111;padding:6px;display:flex;flex-wrap:wrap;gap:2px;flex-shrink:0}
#player{flex:1;border:none;width:100%}
</style></head><body>
<div id="bar">${btns}</div>
<iframe id="player" src="${embedUrl}" allowfullscreen allow="autoplay" referrerpolicy="origin"></iframe>
<script>function load(u){document.getElementById('player').src=u}</script>
</body></html>`;
}
