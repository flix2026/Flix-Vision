// Cloudflare Worker — serves the Flix site AND resolves HLS streams for Roku
// Deploy this as your worker at flix.thedevreal33.workers.dev

const TMDB_KEY = '2f3cb5763db1117fcba3948632f8aad9';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS headers for Roku
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };

    // /resolve?type=movie&id=12345  OR  /resolve?type=tv&id=12345&s=1&e=1
    if (url.pathname === '/resolve') {
      const type = url.searchParams.get('type') || 'movie';
      const id   = url.searchParams.get('id');
      const s    = url.searchParams.get('s') || '1';
      const e    = url.searchParams.get('e') || '1';

      if (!id) return new Response(JSON.stringify({error:'missing id'}), {headers: cors});

      // Try vidsrc.me API — it exposes a JSON sources endpoint
      const sources = await resolveVidsrc(type, id, s, e);
      if (sources && sources.length > 0) {
        return new Response(JSON.stringify({streams: sources}), {headers: cors});
      }

      return new Response(JSON.stringify({error:'no streams found'}), {status: 404, headers: cors});
    }

    // /tmdb/* — proxy TMDB to avoid CORS on Roku
    if (url.pathname.startsWith('/tmdb/')) {
      const tmdbPath = url.pathname.replace('/tmdb', '');
      const tmdbUrl  = new URL(`https://api.themoviedb.org/3${tmdbPath}`);
      tmdbUrl.searchParams.set('api_key', TMDB_KEY);
      url.searchParams.forEach((v, k) => { if (k !== 'api_key') tmdbUrl.searchParams.set(k, v); });

      const resp = await fetch(tmdbUrl.toString());
      const data = await resp.json();
      return new Response(JSON.stringify(data), {headers: cors});
    }

    // Default — serve the existing site assets (pass through to static files)
    return fetch(request);
  }
};

async function resolveVidsrc(type, id, s, e) {
  const streams = [];

  // vidsrc.me has a known sources API
  try {
    const srcUrl = type === 'movie'
      ? `https://vidsrc.me/embed/movie?tmdb=${id}&ds_langs=en`
      : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}&ds_langs=en`;

    const html = await fetch(srcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://vidsrc.me/'
      }
    }).then(r => r.text());

    // Extract HLS m3u8 URLs from the page source
    const m3u8Matches = [...html.matchAll(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g)];
    for (const match of m3u8Matches) {
      if (!streams.includes(match[0])) streams.push(match[0]);
    }

    // Also look for encoded source URLs
    const srcMatches = [...html.matchAll(/src['":\s]+([^"'\s]+\.m3u8[^"'\s]*)/g)];
    for (const match of srcMatches) {
      if (!streams.includes(match[1])) streams.push(match[1]);
    }
  } catch(e) {
    console.error('vidsrc resolve error:', e);
  }

  return streams;
}
