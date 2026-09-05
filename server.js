/**
 * FLIX Vision - Local Development Server
 *
 * Pure Node.js — no dependencies required.
 * Serves all static files and exposes a /proxy?url= endpoint for CORS bypass.
 *
 * Auth is handled entirely by the PHP API on devsapps.org/flix/api.php
 * This server only serves static files and the proxy — nothing more.
 *
 * Usage:  node server.js   or   run.bat
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = 8080;
const ROOT = __dirname;

// ─── MIME types ───────────────────────────────────────────────────────────────

const MIME = {
    '.html' : 'text/html; charset=utf-8',
    '.css'  : 'text/css; charset=utf-8',
    '.js'   : 'application/javascript; charset=utf-8',
    '.json' : 'application/json; charset=utf-8',
    '.png'  : 'image/png',
    '.jpg'  : 'image/jpeg',
    '.jpeg' : 'image/jpeg',
    '.gif'  : 'image/gif',
    '.svg'  : 'image/svg+xml',
    '.ico'  : 'image/x-icon',
    '.webp' : 'image/webp',
    '.woff' : 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf'  : 'font/ttf',
    '.otf'  : 'font/otf',
    '.eot'  : 'application/vnd.ms-fontobject',
    '.mp4'  : 'video/mp4',
    '.webm' : 'video/webm',
    '.ogg'  : 'audio/ogg',
    '.mp3'  : 'audio/mpeg',
    '.wav'  : 'audio/wav',
    '.pdf'  : 'application/pdf',
    '.zip'  : 'application/zip',
    '.txt'  : 'text/plain; charset=utf-8',
    '.md'   : 'text/markdown; charset=utf-8',
    '.xml'  : 'application/xml; charset=utf-8',
    '.brs'  : 'text/plain; charset=utf-8',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMime(fp) {
    return MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream';
}
function sendError(res, code, msg) {
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`${code} ${msg}`);
}
function addCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── Proxy handler ────────────────────────────────────────────────────────────

function handleProxy(req, res, targetUrl) {
    let parsedTarget;
    try { parsedTarget = new URL(targetUrl); }
    catch (_) { return sendError(res, 400, 'Bad Request — invalid proxy URL'); }

    const isHttps = parsedTarget.protocol === 'https:';
    const client  = isHttps ? https : http;
    const port    = parsedTarget.port ? parseInt(parsedTarget.port) : (isHttps ? 443 : 80);

    const options = {
        hostname: parsedTarget.hostname,
        port,
        path:     parsedTarget.pathname + parsedTarget.search,
        method:   req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: {
            'User-Agent':      req.headers['user-agent'] || 'Mozilla/5.0 (compatible; FlixVision/1.0)',
            'Accept':          req.headers['accept'] || '*/*',
            'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
            'Referer':         parsedTarget.origin,
        },
    };

    const proxyReq = client.request(options, (proxyRes) => {
        addCorsHeaders(res);
        const safe = ['content-type','content-length','content-encoding','last-modified','etag','cache-control'];
        const fwd = {};
        safe.forEach(h => { if (proxyRes.headers[h]) fwd[h] = proxyRes.headers[h]; });
        res.writeHead(proxyRes.statusCode, fwd);
        proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
        console.error(`[proxy] Error fetching ${targetUrl}:`, err.message);
        if (!res.headersSent) sendError(res, 502, 'Bad Gateway');
    });
    proxyReq.setTimeout(15000, () => {
        proxyReq.destroy();
        if (!res.headersSent) sendError(res, 504, 'Gateway Timeout');
    });
    proxyReq.end();
}

// ─── Static file handler ──────────────────────────────────────────────────────

function handleStatic(req, res, filePath) {
    const resolved = path.resolve(filePath);
    // Block access outside ROOT and to the php/ directory
    if (!resolved.startsWith(ROOT) || resolved.startsWith(path.join(ROOT, 'php'))) {
        return sendError(res, 403, 'Forbidden');
    }
    fs.stat(resolved, (err, stat) => {
        if (err || !stat.isFile()) {
            const indexPath = path.join(resolved, 'index.html');
            fs.stat(indexPath, (err2, stat2) => {
                if (err2 || !stat2.isFile()) return sendError(res, 404, 'Not Found');
                serveFile(res, indexPath, stat2);
            });
            return;
        }
        serveFile(res, resolved, stat);
    });
}

function serveFile(res, filePath, stat) {
    addCorsHeaders(res);
    res.writeHead(200, {
        'Content-Type':       getMime(filePath),
        'Content-Length':     stat.size,
        'Cache-Control':      'no-cache',
        'Permissions-Policy': 'popup=()',
        'Feature-Policy':     "popup 'none'",
    });
    fs.createReadStream(filePath).pipe(res);
}

// ─── Main request handler ─────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
    const reqUrl   = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const pathname = decodeURIComponent(reqUrl.pathname);

    if (req.method === 'OPTIONS') {
        addCorsHeaders(res);
        res.writeHead(204);
        res.end();
        return;
    }

    // CORS proxy
    if (pathname === '/proxy') {
        const target = reqUrl.searchParams.get('url');
        if (!target) return sendError(res, 400, 'Bad Request — missing ?url= parameter');
        console.log(`[proxy] → ${target}`);
        return handleProxy(req, res, target);
    }

    // Static files
    const filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
    handleStatic(req, res, filePath);
});

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  ███████╗██╗     ██╗██╗  ██╗');
    console.log('  ██╔════╝██║     ██║╚██╗██╔╝');
    console.log('  █████╗  ██║     ██║ ╚███╔╝ ');
    console.log('  ██╔══╝  ██║     ██║ ██╔██╗ ');
    console.log('  ██║     ███████╗██║██╔╝ ██╗');
    console.log('  ╚═╝     ╚══════╝╚═╝╚═╝  ╚═╝  Vision');
    console.log('');
    console.log(`  Server running at: http://127.0.0.1:${PORT}`);
    console.log('');
    console.log('  Press Ctrl+C to stop.');
    console.log('');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n  [error] Port ${PORT} is already in use.`);
        console.error(`  Close the other process or change PORT in server.js\n`);
    } else {
        console.error('\n  [error]', err.message, '\n');
    }
    process.exit(1);
});
