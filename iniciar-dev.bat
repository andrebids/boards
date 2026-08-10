@echo off
setlocal
title Planka - Desenvolvimento Local

cd /d "%~dp0"

set "APP_URL=http://localhost:3008"

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
echo A iniciar o Planka. O browser abre quando a aplicacao estiver pronta em %APP_URL%.
echo Para parar o ambiente, prime Ctrl+C nesta janela ou executa parar-dev.bat.
echo.

rem Espera pelo frontend e pela API antes de abrir o browser, sem bloquear os logs do Docker.
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "$url = $env:APP_URL; $readyUrl = $url + '/api/config'; $deadline = (Get-Date).AddMinutes(5); while ((Get-Date) -lt $deadline) { try { $response = Invoke-WebRequest -UseBasicParsing -Uri $readyUrl -TimeoutSec 2; if ($response.StatusCode -eq 200) { Start-Process $url; exit 0 } } catch {}; Start-Sleep -Seconds 2 }; Write-Host 'A aplicacao nao ficou pronta dentro de 5 minutos.' -ForegroundColor Yellow; exit 1"

docker compose -f docker-compose.dev.yml up
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo O ambiente foi parado.
pause
exit /b %EXIT_CODE%
