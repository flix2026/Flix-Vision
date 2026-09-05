FLIX VISION — LINUX SETUP
==========================

STEP 1 — Install Node.js (free, one-time only)
  Open a terminal and run the command for your distro:

  Ubuntu / Debian:   sudo apt install nodejs
  Fedora:            sudo dnf install nodejs
  Arch:              sudo pacman -S nodejs
  Other:             https://nodejs.org

STEP 2 — Extract this zip
  Right-click the zip → Extract Here
  Or in terminal: unzip flix-vision-linux.zip

STEP 3 — Run Flix Vision
  Open a terminal inside the extracted folder and run:

      bash start-linux.sh

  Your browser launches automatically with Flix Vision ready to use.

EVERY TIME YOU WANT TO USE IT:
  Open a terminal in the folder and run: bash start-linux.sh

TO STOP:
  Press Ctrl+C in the terminal.

PROBLEMS?
  "node: command not found"
  → Node.js is not installed. See Step 1 above.

  Browser doesn't open automatically
  → Manually open your browser and go to: http://127.0.0.1:8080
