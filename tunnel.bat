@echo off
REM Starts a Host-rewriting proxy (5174 -> 5173) and a pinggy tunnel to it.
REM Keep this window open. Open the https URL pinggy prints.

start "vite-proxy" /min node tunnel.mjs
timeout /t 2 /nobreak >nul
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -p 443 -R 0:localhost:5174 a.pinggy.io
