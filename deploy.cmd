@echo off
for /f "delims=" %%A in ('git rev-parse --short HEAD') do set VERSION_COMMIT=%%A

for /f "delims=" %%A in ('powershell -NoProfile -Command "Get-Date -Format dd/MM/yyyy"') do set VERSION_DATE=%%A

docker compose build ^
  --build-arg VERSION_COMMIT=%VERSION_COMMIT% ^
  --build-arg VERSION_DATE=%VERSION_DATE% ^
  anonimizador

docker compose up -d --force-recreate
