#!/bin/bash
# Flix Vision — Linux Launcher
# Run with: bash start-linux.sh

# Move to the folder this script lives in
cd "$(dirname "$0")"

# Check Node.js is installed
if ! command -v node &> /dev/null; then
    echo ""
    echo "  [ERROR] Node.js is not installed."
    echo "  Install it with:"
    echo ""
    echo "    Ubuntu/Debian:  sudo apt install nodejs"
    echo "    Fedora:         sudo dnf install nodejs"
    echo "    Arch:           sudo pacman -S nodejs"
    echo "    Other:          https://nodejs.org"
    echo ""
    exit 1
fi

# Open browser after 1 second (tries multiple browsers)
(sleep 1 && (xdg-open "http://127.0.0.1:8080" || \
             google-chrome "http://127.0.0.1:8080" || \
             firefox "http://127.0.0.1:8080") 2>/dev/null) &

echo ""
echo "  ███████╗██╗     ██╗██╗  ██╗"
echo "  ██╔════╝██║     ██║╚██╗██╔╝"
echo "  █████╗  ██║     ██║ ╚███╔╝ "
echo "  ██╔══╝  ██║     ██║ ██╔██╗ "
echo "  ██║     ███████╗██║██╔╝ ██╗"
echo "  ╚═╝     ╚══════╝╚═╝╚═╝  ╚═╝  Vision"
echo ""
echo "  Running at: http://127.0.0.1:8080"
echo "  Press Ctrl+C to stop."
echo ""

node server.js

echo ""
echo "  Server stopped."
