const TMDB_KEY = '2f3cb5763db1117fcba3948632f8aad9';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };

    // /resolve?type=movie&id=123  or  /resolve?type=tv&id=123&s=1&e=1
    if (url.pathname === '/resolve') {
      const type = url.searchParams.get('type') || 'movie';
      const id   = url.searchParams.get('id');
      const s    = url.searchParams.get('s') || '1';
      const e    = url.searchParams.get('e') || '1';
      if (!id) return new Response(JSON.stringify({error:'missing id'}), {headers: cors});
      const streams = await resolveStreams(type, id, s, e);
      if (streams.length > 0) return new Response(JSON.stringify({streams}), {headers: cors});
      return new Response(JSON.stringify({error:'no streams found'}), {status:404, headers: cors});
    }

    // /tmdb/* — TMDB proxy for Roku (no CORS issues)
    if (url.pathname.startsWith('/tmdb/')) {
      const tmdbPath = url.pathname.replace('/tmdb', '');
      const tmdbUrl  = new URL(`https://api.themoviedb.org/3${tmdbPath}`);
      tmdbUrl.searchParams.set('api_key', TMDB_KEY);
      url.searchParams.forEach((v, k) => { if (k !== 'api_key') tmdbUrl.searchParams.set(k, v); });
      const resp = await fetch(tmdbUrl.toString());
      const data = await resp.json();
      return new Response(JSON.stringify(data), {headers: cors});
    }

    // Everything else — serve the static site as normal
    return env.ASSETS.fetch(request);
  }
};

async function resolveStreams(type, id, s, e) {
  const streams = [];
  try {
    const srcUrl = type === 'movie'
      ? `https://vidsrc.me/embed/movie?tmdb=${id}`
      : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`;
    const html = await fetch(srcUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://vidsrc.me/'
      }
    }).then(r => r.text());
    for (const m of html.matchAll(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g)) {
      if (!streams.includes(m[0])) streams.push(m[0]);
    }
  } catch(err) {}
  return streams;
}
