# Flix Vision

A self-hosted media browser application. Browse movies and TV shows, view trailers, cast information, and ratings — all from your own device.

---

## Legal Disclaimer

**Flix Vision is a self-hosted software tool. We do not host, store, stream, or distribute any copyrighted content whatsoever.**

When you run this software, your device connects directly to publicly available third-party embed services on the internet. We have no affiliation with, control over, or responsibility for any of those services or the content they provide.

By downloading and using this software you agree that:

- You are solely responsible for your own use of this software
- You will comply with all applicable laws and regulations in your jurisdiction
- The developers of Flix Vision accept no liability for any content accessed through third-party services via this software
- Any use of this software to access content without the appropriate rights in your jurisdiction is your sole responsibility

This software is provided as-is with no warranties of any kind.

---

## Download

Download the latest version for your operating system from the [Releases](https://github.com/flix2026/Flix-Vision/releases/latest) page.

| Platform | File |
|---|---|
| Windows | `flix-vision-windows.zip` |
| Mac | `flix-vision-mac.zip` |
| Linux | `flix-vision-linux.zip` |

---

## Requirements

- **Node.js** (free) — download from [nodejs.org](https://nodejs.org) — click the LTS button and install with default settings. You only need to do this once.

---

## Setup — Windows

1. Download `flix-vision-windows.zip` from the [Releases](https://github.com/flix2026/Flix-Vision/releases/latest) page
2. Extract the zip anywhere — Desktop is fine
3. Double-click **`run.bat`**
4. Your browser opens automatically at `http://127.0.0.1:8080`

> Every time you want to use Flix Vision, just double-click `run.bat` again.

---

## Setup — Mac

1. Download `flix-vision-mac.zip` from the [Releases](https://github.com/flix2026/Flix-Vision/releases/latest) page
2. Extract the zip anywhere
3. Double-click **`start-mac.command`**
4. Your browser opens automatically at `http://127.0.0.1:8080`

**If Mac blocks the file:** Right-click → Open → Open Anyway  
Or go to: System Settings → Privacy & Security → Allow Anyway

> Every time you want to use Flix Vision, just double-click `start-mac.command` again.

---

## Setup — Linux

1. Download `flix-vision-linux.zip` from the [Releases](https://github.com/flix2026/Flix-Vision/releases/latest) page
2. Extract the zip anywhere
3. Open a terminal in the extracted folder and run:

```bash
bash start-linux.sh
```

4. Your browser opens automatically at `http://127.0.0.1:8080`

**Install Node.js if needed:**
```bash
# Ubuntu / Debian
sudo apt install nodejs

# Fedora
sudo dnf install nodejs

# Arch
sudo pacman -S nodejs
```

---

## Using on Mobile (Android / iPhone)

Flix Vision runs on your computer and can be accessed from any phone or tablet on the **same Wi-Fi network**.

1. Follow the setup for your computer (Windows, Mac, or Linux) above
2. Find your computer's local IP address:
   - **Windows:** Open Command Prompt → type `ipconfig` → look for IPv4 Address
   - **Mac:** System Settings → Wi-Fi → your network name → IP address
   - **Linux:** Open Terminal → type `ip addr`
3. On your phone's browser go to: `http://YOUR-COMPUTER-IP:8080`  
   Example: `http://192.168.1.10:8080`

---

## Stopping the Server

- **Windows:** Close the black terminal window, or press `Ctrl+C` inside it
- **Mac:** Close the terminal window, or press `Ctrl+C`
- **Linux:** Press `Ctrl+C` in the terminal

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `node is not recognized` or `node: command not found` | Node.js is not installed — go to [nodejs.org](https://nodejs.org) and install the LTS version |
| Browser doesn't open automatically | Manually open your browser and go to `http://127.0.0.1:8080` |
| Port already in use | Another program is using port 8080 — restart your computer and try again |
| Mac says file can't be opened | Right-click `start-mac.command` → Open → Open Anyway |
| Can't access from phone | Make sure phone and computer are on the same Wi-Fi network |

---

## What This Software Does

Flix Vision is a media **browser**. It displays movie and TV show metadata (titles, posters, descriptions, ratings, trailers) sourced from [The Movie Database (TMDB)](https://www.themoviedb.org). When you choose to play something, your browser connects directly to publicly available third-party embed services. Flix Vision does not host or provide any of that content.

---

*This product uses the TMDB API but is not endorsed or certified by TMDB.*
