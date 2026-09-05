# Flix Vision — Complete Setup & Operations Guide

---

## What Flix Vision Is

Flix Vision has two modes:

**1. Hosted site** (`flix.thedevreal33.workers.dev`) — requires account login. Users browse titles, trailers, and cast info. Play buttons show self-host instructions. This is the storefront/portal.

**2. Download version** — no login required at all. User downloads a zip, runs it on their own device, and plays content directly. This is what users actually use to watch.

**Legal model:** We distribute software. We do not host, serve, or proxy any media. When a user runs the downloaded app, their own browser connects directly to third-party embed services. We have no involvement in or control over that connection.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CLOUDFLARE WORKERS  (flix.thedevreal33.workers.dev)         │
│  Static files only — HTML, CSS, JS                           │
│  • index.html     → storefront + account portal (login req.) │
│  • download.html  → per-OS setup instructions + download     │
│  • admin.html     → admin panel                              │
│  Play buttons → shows self-host modal + download link        │
└─────────────────────────┬───────────────────────────────────┘
                          │ API calls (fetch + X-Session-Token)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  X10HOSTING  (devsapps.org/flix/)                            │
│  PHP API + MySQL database                                    │
│  • api.php        → all auth + admin + activity routes       │
│  • db.php         → MySQL connection, CORS, table init       │
│  • add-users.php  → bulk user import tool                    │
└─────────────────────────────────────────────────────────────┘

USER'S OWN DEVICE (downloaded version — NO login required)
  • Extracts zip → double-clicks run script
  • Node.js serves files at http://127.0.0.1:8080
  • Play works immediately — no account, no PIN, no login
  • Browser connects directly to embed sources
  • Also works on mobile by opening the Cloudflare URL in browser
```

---

## Accounts & Credentials

| Item | Value |
|---|---|
| Cloudflare Worker URL | https://flix.thedevreal33.workers.dev |
| Download page | https://flix.thedevreal33.workers.dev/download.html |
| Admin panel | https://flix.thedevreal33.workers.dev/admin.html |
| x10hosting cPanel | epsteinarchive.com (devsapps.org is an addon domain) |
| PHP API endpoint | https://devsapps.org/flix/api.php |
| Bulk add users | https://devsapps.org/flix/add-users.php |
| MySQL database | oftmqwad_flix |
| MySQL user | oftmqwad_flix |
| MySQL password | ~FlixDatabase~ |
| MySQL host | localhost (same server as PHP) |

---

## Complete File Reference

### GitHub Repo (deploys to Cloudflare)

```
FLIX Vision/
├── index.html              Main app — login gate + media browser (hosted)
├── download.html           Per-OS setup instructions + download links
├── admin.html              Admin panel (calls PHP API)
├── embed.html              Embed page
├── trailer.html            Trailer player
├── test.html               API test suite (debugging tool)
├── sw.js                   Service worker (PWA caching)
├── manifest.json           PWA manifest (Add to Home Screen)
├── create-downloads.bat    Run this to rebuild the 3 zip packages
├── icons/
│   ├── icon.svg            SVG app icon
│   ├── icon-192.png        PWA icon
│   ├── icon-512.png        PWA icon
│   └── generate-icons.html Run once in browser to regenerate PNG icons
├── css/
│   ├── style.css           Main styles
│   └── auth.css            Login modal + account settings styles
├── js/
│   ├── api.js              TMDB API calls
│   ├── app.js              Main app logic
│   ├── auth.js             Login, sessions, activity tracking
│   └── player.js           Video player, ad blocker, auto-advance
├── download/
│   ├── README-windows.txt  Source README for Windows zip
│   ├── README-mac.txt      Source README for Mac zip
│   ├── README-linux.txt    Source README for Linux zip
│   └── downloads/          ← THE ZIP FILES LIVE HERE
│       ├── flix-vision-windows.zip
│       ├── flix-vision-mac.zip
│       └── flix-vision-linux.zip
├── run.bat                 Windows launcher (goes inside Windows zip)
├── start-mac.command       Mac launcher (goes inside Mac zip)
├── start-linux.sh          Linux launcher (goes inside Linux zip)
├── server.js               Local Node.js server (goes inside all zips)
└── .gitignore
```

### What is inside each zip (no login, standalone)

```
flix-vision/
├── index.html        (from Backups/Flix USB — clean, no auth overlay)
├── trailer.html
├── embed.html
├── manifest.json
├── sw.js
├── server.js
├── README.txt        (renamed from README-{os}.txt)
├── css/
│   └── style.css
├── js/
│   ├── api.js
│   ├── app.js
│   └── player.js     (current version — ad blocker, auto-advance, autoplay)
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
└── run.bat           (Windows only)
    start-mac.command (Mac only)
    start-linux.sh    (Linux only)
```

Note: NO `auth.js`, NO `auth.css`, NO login overlay. Opens and plays immediately.

### x10hosting Only (NOT in GitHub repo)

Upload these to `/devsapps.org/flix/` on x10hosting:

```
/devsapps.org/flix/
├── api.php           Main API — all auth + admin routes
├── db.php            MySQL config + CORS origins + table init
├── .htaccess         Blocks db.php direct access, forces HTTPS
└── add-users.php     Bulk user import web UI
```

Local copies live in `php/` folder in the project (gitignored, never committed).

### Local Dev Only (gitignored, never in GitHub repo)

```
node_modules/         Never commit
data/                 Old SQLite remnant, unused
.wrangler/            Cloudflare build cache
php/                  Local copy of x10hosting files
  ├── api.php
  ├── db.php
  ├── .htaccess
  ├── add-users.php
  ├── setup.sql       Import once via phpMyAdmin
  └── README.txt
```

---

## Part 1 — x10hosting Setup

### Step 1 — MySQL database

In cPanel → MySQL Databases:
- Database `oftmqwad_flix` exists — user `oftmqwad_flix` has ALL PRIVILEGES

### Step 2 — Import SQL schema (first time only)

cPanel → phpMyAdmin → select `oftmqwad_flix` → Import → choose `php/setup.sql` → Go

Tables created: `users`, `sessions`, `activity`, `pin_reset_requests`, `settings`
Admin password seeded automatically on first PHP request — default is `1579`.

### Step 3 — Upload PHP files

Upload these 4 files from the local `php/` folder to `/devsapps.org/flix/` on x10hosting:
- `api.php`
- `db.php`
- `.htaccess`
- `add-users.php`

### Step 4 — Verify

Open in browser: `https://devsapps.org/flix/api.php?action=me`
Expected response: `{"error":"Not authenticated"}`

### Step 5 — ALLOWED_ORIGINS in db.php

If you ever change your Cloudflare domain, update this array in `db.php` and re-upload:

```php
define('ALLOWED_ORIGINS', [
    'https://flix.thedevreal33.workers.dev',
    'https://devsapps.org',
    'http://127.0.0.1:8080',
    'http://localhost:8080',
]);
```

### Note on existing .htaccess

`/devsapps.org/.htaccess` has a redirect rule:
```
RewriteRule ^flix$ "http://flix.thedevreal33.workers.dev/" [R=301,L]
```
This only matches `devsapps.org/flix` exactly (no trailing slash, no subpath).
It does NOT affect `devsapps.org/flix/api.php` — the PHP files are safe.

---

## Part 2 — Cloudflare Workers Setup

### Build settings (Workers & Pages → flix → Settings → Build)

| Field | Value |
|---|---|
| Build command | *(empty — leave completely blank)* |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |
| Production branch | `main` |
| Include paths | `*` |
| Exclude paths | `node_modules/**, .git/**` |

**Critical:** Build command must be empty. No `package.json` in the repo.
If any build command installs packages, `node_modules/workerd` (147MB) gets
included in the asset upload and the deploy fails with "Asset too large".

### Files that must NOT be in the GitHub repo

- `package.json` — triggers bun/npm install of wrangler+workerd at build time
- `wrangler.toml` / `wrangler.jsonc` — triggers wrangler setup wizard which overwrites config
- `node_modules/` — gitignored
- `php/` — goes on x10hosting only, not Cloudflare

---

## Part 3 — First-Time Admin Setup

1. Visit `https://devsapps.org/flix/api.php?action=me` in your browser to seed the admin password
2. Open `https://flix.thedevreal33.workers.dev/admin.html`
3. Log in with default password `1579`
4. Immediately click **Change Password** in the top bar and set a new one
5. Go to Users → add your first user, or use the bulk tool

---

## Part 4 — Adding Users

**Single user:** Admin panel → Users → type username → Add User

**Bulk import:**
1. Go to `https://devsapps.org/flix/add-users.php`
2. Log in with admin password
3. Paste usernames one per line → Add Users
4. Duplicates and existing users are handled automatically

Users have no PIN until first login on the hosted site. On first login they create their own 4-digit PIN. The downloaded app requires no PIN at all.

---

## Part 5 — Creating / Rebuilding the Download Packages

The three zip files live at:
```
download/downloads/flix-vision-windows.zip
download/downloads/flix-vision-mac.zip
download/downloads/flix-vision-linux.zip
```

To rebuild them (after any code changes), just double-click:
```
create-downloads.bat
```

This script automatically stages all the correct files, creates all three zips, and puts them in `download/downloads/`. It takes about 30 seconds.

After running it, commit and push — the new zips will be on Cloudflare and users downloading from `download.html` will get the updated version.

**The README files that go inside the zips** are in `download/README-windows.txt`, `download/README-mac.txt`, `download/README-linux.txt`. Edit those if you need to change the user-facing instructions, then re-run `create-downloads.bat`.

---

## Part 6 — How the Two Versions Work

### Hosted site (flix.thedevreal33.workers.dev) — account required

- Login overlay blocks everything until user authenticates
- User can browse movies/TV, see details, trailers, cast
- Clicking Play shows the self-host modal with download instructions
- Download links point to `download/downloads/flix-vision-{os}.zip`
- Mobile users (Android/iPhone) — no download needed, works directly in browser, can Add to Home Screen

### Downloaded version — NO login, plays immediately

- User extracts zip, double-clicks the run script
- Browser opens at `http://127.0.0.1:8080`
- No account, no PIN, no login overlay — plays immediately
- All features work: ad blocker, auto-advance, episode tracking, all sources
- Works on Windows, Mac, Linux
- Requires Node.js (free, one-time install from nodejs.org)

### Mobile (Android/iPhone) — NO download needed

- Open `https://flix.thedevreal33.workers.dev` in Chrome (Android) or Safari (iPhone)
- Log in with username and PIN
- Tap Add to Home Screen for a full-screen app icon
- Session stored in localStorage — stays logged in for 30 days of inactivity

---

## Part 7 — How User Authentication Works (hosted site only)

1. User visits the hosted site — login overlay appears immediately
2. User enters username → server checks if it exists
3. **First time:** no PIN set → prompted to create a 4-digit PIN → auto-logged in
4. **Returning:** enters PIN → session token issued
5. Token stored in `localStorage` as `fv_token` AND sent as `X-Session-Token` header
   (handles browsers that block third-party cookies cross-origin)
6. Sessions last 30 days of inactivity — after 30 days without use the session expires and user must log in again
7. No session limit — users can be logged in on any number of devices simultaneously
8. User can change PIN via Account Settings (must enter current PIN first)
9. Forgotten PIN → "Request PIN Reset" on login screen → admin resets it

---

## Part 8 — Admin Panel Features

Access: `https://flix.thedevreal33.workers.dev/admin.html`

| Section | What you can do |
|---|---|
| Dashboard | Total users, active sessions, pending requests, activity count |
| Users | Add/delete users, set/reset PIN, view per-user activity log |
| Sessions | All active sessions across all users, revoke any individually |
| Requests | PIN reset requests — reset to 1234, set custom PIN, or delete |
| Activity | Per-user log: page views, what they watched, duration, IP, Eastern Time |

Admin password is stored as a bcrypt hash in the `settings` MySQL table.
The plain password never appears in any file, log, or database export.
Change it anytime via the **Change Password** button in the top bar.
PIN reset requests auto-refresh every 30 seconds.

---

## Part 9 — Local Development (running the hosted version locally)

```
node server.js
```
or double-click `run.bat`.

Serves at `http://127.0.0.1:8080`. Auth still calls the live PHP API on x10hosting.
No npm install needed — `server.js` uses only built-in Node.js modules.

---

## Part 10 — Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Cloudflare deploy fails "Asset too large" | `package.json` or wrangler config in repo | Remove `package.json`, `wrangler.toml`, `wrangler.jsonc` from repo |
| Admin button does nothing | JS syntax error in admin.html | Open F12 console, look for SyntaxError |
| "Could not reach server" on admin login | PHP files not uploaded or wrong path | Visit `devsapps.org/flix/api.php?action=me` — should return 401 |
| CORS Allow-Origin: null | Cloudflare domain not in ALLOWED_ORIGINS | Edit `db.php` on x10hosting, add domain, re-upload |
| "Not authenticated" on change-pin | Session token not being sent | Check `fv_token` in localStorage; re-login |
| Login overlay doesn't appear on hosted site | auth.js not loaded or markup missing | Check F12 console for errors |
| Play button shows self-host modal on local | IS_LOCAL check failing | Make sure you're accessing via `127.0.0.1:8080` |
| Downloaded app won't start | Node.js not installed | Install from nodejs.org |
| Zip files are 404 on download.html | Zips not in `download/downloads/` | Run `create-downloads.bat` then commit and push |
| PWA icons missing on mobile | PNG icons not generated | Open `icons/generate-icons.html` in browser, save PNGs to `icons/`, commit |

---

## Part 11 — API Test Suite

`test.html` is deployed to Cloudflare. Visit:
```
https://flix.thedevreal33.workers.dev/test.html
```
Click **▶ Run All Tests** — shows HTTP status and full JSON response for every API endpoint.
Use this whenever something breaks to pinpoint exactly which layer is failing.
