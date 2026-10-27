@echo off
REM ==============================================================================
REM Operon CLI Smart Shim (Windows Batch)
REM Prefers locally built target binary, then cargo installed, then docker container
REM ==============================================================================

set SCRIPT_DIR=%~dp0

if exist "%SCRIPT_DIR%target\x86_64-pc-windows-gnu\debug\opn.exe" (
    "%SCRIPT_DIR%target\x86_64-pc-windows-gnu\debug\opn.exe" %*
    exit /b %errorlevel%
)

if exist "%SCRIPT_DIR%target\release\opn.exe" (
    "%SCRIPT_DIR%target\release\opn.exe" %*
    exit /b %errorlevel%
)

if exist "%SCRIPT_DIR%target\debug\opn.exe" (
    "%SCRIPT_DIR%target\debug\opn.exe" %*
    exit /b %errorlevel%
)

where opn.exe >nul 2>&1
if %errorlevel% equ 0 (
    opn.exe %*
    exit /b %errorlevel%
)

docker ps --filter "name=daemon" --filter "status=running" -q >nul 2>&1
if %errorlevel% equ 0 (
    docker exec -it daemon opn %*
    exit /b %errorlevel%
)

echo Error: opn binary not found on host, and container 'daemon' is not running. >&2
echo Hint: Compile with 'cargo build -p operon' or start docker compose: 'docker compose up -d' >&2
exit /b 1
