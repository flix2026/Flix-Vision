@echo off
echo Starting local server for FlixVision Web Clone...
echo Opening Chrome...
start chrome "http://localhost:8080/index.html"
echo Press Ctrl+C to stop the server.
python -m http.server 8080
pause
