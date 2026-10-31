@echo off
setlocal

set ROOT=%~dp0
set SERVER_PORT=4000
set CLIENT_PORT=5173

echo Starting SC-200 Exam Simulator...
echo.
echo Make sure your phone is connected to the same Wi-Fi network as this computer.

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js LTS first.
  pause
  exit /b 1
)

if not exist "%ROOT%server\node_modules" (
  echo Installing server dependencies...
  cd /d "%ROOT%server"
  call npm install
  if errorlevel 1 (
    echo ERROR: Failed to install server dependencies.
    pause
    exit /b 1
  )
)

if not exist "%ROOT%client\node_modules" (
  echo Installing client dependencies...
  cd /d "%ROOT%client"
  call npm install
  if errorlevel 1 (
    echo ERROR: Failed to install client dependencies.
    pause
    exit /b 1
  )
)

cd /d "%ROOT%server"
curl.exe -fsS "http://localhost:%SERVER_PORT%/api/health" >nul 2>nul
if errorlevel 1 (
  start "SC200 Server" cmd /k "npm start"
) else (
  echo SC-200 server is already running on port %SERVER_PORT%.
)

cd /d "%ROOT%client"
curl.exe -fsS "http://localhost:%CLIENT_PORT%" >nul 2>nul
if errorlevel 1 (
  start "SC200 Client" cmd /k "npm run dev -- --host --port %CLIENT_PORT%"
) else (
  echo SC-200 client is already running on port %CLIENT_PORT%.
)

set READY=0
for /l %%A in (1,1,20) do (
  curl.exe -fsS "http://localhost:%SERVER_PORT%/api/health" >nul 2>nul
  if not errorlevel 1 (
    curl.exe -fsS "http://localhost:%CLIENT_PORT%" >nul 2>nul
    if not errorlevel 1 (
      set READY=1
      goto :ready
    )
  )
  timeout /t 1 /nobreak >nul
)

:ready
if "%READY%"=="0" (
  echo ERROR: The SC-200 app did not become ready.
  echo Check the SC200 Server and SC200 Client terminal windows for the error.
  pause
  exit /b 1
)

start "" "http://localhost:%CLIENT_PORT%"

echo.
echo SC-200 app started on this computer.
echo Mobile access address:
ipconfig | findstr /R /C:"IPv4 Address" /C:"IPv4-adress"
echo Use one of the IPv4 addresses above like:
echo http://YOUR-COMPUTER-IP:%CLIENT_PORT%
echo If your phone cannot connect, allow Node.js through Windows Firewall for private networks.
echo Close both terminal windows to stop it.
endlocal
