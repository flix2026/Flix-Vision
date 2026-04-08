# CORS Bypass: APK vs Website

## What is CORS?

CORS (Cross-Origin Resource Sharing) is a **browser-only** security policy. When a webpage tries to fetch data from a different domain, the browser checks if that domain's server sends back an `Access-Control-Allow-Origin` header permitting it. If not, the browser blocks the response — even if the request went through fine.

**CORS does not exist outside of browsers.** It is enforced entirely by the browser, not by the server, not by the OS, not by the network.

---

## Why the APK Has No CORS Problem

The FlixVision APK uses **OkHttp** (a native Android HTTP client) to make all network requests. OkHttp runs at the OS level — it has no concept of CORS whatsoever. It can:

- Fetch any URL from any domain
- Read the full response body
- Set any headers (including spoofing `Referer` and `Origin`)
- Make requests that would be blocked in any browser

This is exactly how the APK scrapes xvideos:

1. OkHttp sends a GET request to `https://www.xvideos.com/?k=Amateur&p=0` with a mobile `User-Agent`
2. xvideos returns the full HTML page — no CORS header needed, no block
3. The APK parses the HTML with regex to extract video IDs, thumbnails, and titles
4. It extracts the HLS stream URL using the regex `setVideoHLS\('(.*?)'\` from each video's individual page
5. It plays the stream natively or embeds it via `https://www.xvideos.com/embedframe/{id}` in a WebView

---

## Why the Website Cannot Do the Same

A browser enforces CORS on every `fetch()` or `XMLHttpRequest` call. When the website tries to fetch `https://www.xvideos.com/?k=Amateur`, the browser:

1. Sends the request with an `Origin: https://yourdomain.com` header
2. Checks the response for `Access-Control-Allow-Origin`
3. xvideos does not send that header for cross-origin requests
4. The browser **blocks the response** — the JavaScript never sees the data

The request reaches xvideos fine — xvideos just doesn't know or care. The block happens entirely on the client side in the browser.

---

## Ways to Bypass CORS on a Website

### 1. Backend Proxy (Most Reliable)
Run a server (Python, Node, etc.) on your own domain/device. The browser calls your server, your server fetches xvideos (no CORS), and forwards the response back. The browser only ever talks to your own domain — no CORS issue.

### 2. CORS Proxy Services
Third-party services like `corsproxy.io` or `allorigins.win` act as a proxy. Unreliable — often blocked by sites like xvideos, rate-limited, or slow.

### 3. Pre-Scrape at Build Time (What We Did)
Run the scraper server-side (in the terminal, not the browser), bake the results into the HTML as static data. No runtime fetching needed. Works perfectly but data goes stale.

### 4. Browser Extension
A browser extension can bypass CORS by injecting headers or making requests outside the page context. Not practical for a public website.

### 5. Service Worker Proxy
A service worker can intercept and modify requests/responses. Still subject to CORS in most cases — not a reliable bypass.

---

## Summary

| Environment | CORS Enforced? | Can Fetch xvideos? |
|---|---|---|
| Android APK (OkHttp) | No | Yes |
| Browser (fetch/XHR) | Yes | No |
| Node.js / Python server | No | Yes |
| Browser + backend proxy | No (server-side) | Yes |
