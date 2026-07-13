@echo off
setlocal
title Planka - Desenvolvimento Local

cd /d "%~dp0"

docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo O Docker Desktop nao esta a correr.
  echo Abre o Docker Desktop, espera que fique pronto e tenta novamente.
  echo.
  pause
  exit /b 1
)

echo.
echo A iniciar o Planka. O browser abre quando a aplicacao estiver pronta.
echo Para parar o ambiente, prime Ctrl+C nesta janela ou executa parar-dev.bat.
echo.

rem Espera pelo Vite e abre o browser sem bloquear os logs do Docker.
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "$url = 'http://localhost:3008'; for ($i = 0; $i -lt 150; $i++) { try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2 ^| Out-Null; Start-Process $url; exit 0 } catch { Start-Sleep -Seconds 2 } }; exit 1"

docker compose -f docker-compose.dev.yml up
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo O ambiente foi parado.
pause
exit /b %EXIT_CODE%
