#!/bin/bash
# Flix Vision — Mac Launcher
# Double-click this file to start Flix Vision.

# Move to the folder this script lives in
cd "$(dirname "$0")"

# Check Node.js is installed
if ! command -v node &> /dev/null; then
    osascript -e 'display dialog "Node.js is not installed.\n\nPlease download and install it from:\nhttps://nodejs.org\n\nThen double-click start-mac.command again." with title "Flix Vision" buttons {"Open nodejs.org"} default button 1'
    open "https://nodejs.org/en/download"
    exit 1
fi

# Open browser after 1 second
(sleep 1 && open "http://127.0.0.1:8080") &

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
