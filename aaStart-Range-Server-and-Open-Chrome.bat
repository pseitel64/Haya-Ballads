@echo off
REM === Start Kaitaba library server (RangeHTTPServer) and open Chrome ===
REM Place this file INSIDE your "library" folder (parent of "viewer\" etc.).
cd /d "%~dp0"

set "PORT=8000"

REM Ensure the range-capable server is available (quiet install; safe if already installed)
py -m pip install --user -q rangehttpserver >NUL 2>&1

REM Start the server in a new console window so this script can continue
start "Kaitaba Library Server (python)" cmd /k py -m RangeHTTPServer %PORT%

REM Open Chrome to the LIBRARY ROOT. This is essential for relative paths to work.
set "URL=http://localhost:%PORT%/"
start "" chrome "%URL%"
if errorlevel 1 start "" "%URL%"