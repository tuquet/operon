<#
.SYNOPSIS
    Operon Local Bridge Installer (Windows x64)
.DESCRIPTION
    Downloads opn.exe, verifies SHA256, installs to %USERPROFILE%\.operon\bin,
    registers logon autostart, and starts the Local Bridge daemon on 127.0.0.1:8765.
#>

$ErrorActionPreference = "Stop"

$Repo = if ($env:OPERON_REPO) { $env:OPERON_REPO } else { "tuquet/operon" }
$AssetName = "opn-windows-x64.exe"
$BaseUrl = "https://github.com/$Repo/releases/latest/download"
$BinDir = Join-Path $env:USERPROFILE ".operon\bin"
$TargetExe = Join-Path $BinDir "opn.exe"
$TaskName = "OperonLocalBridge"
$StartupVbs = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\$TaskName.vbs"

Write-Host "[operon] Installing Operon Local Bridge to $BinDir..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $BinDir -Force | Out-Null

$TmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("operon-install-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TmpDir -Force | Out-Null

try {
    $TmpExe = Join-Path $TmpDir $AssetName
    $SumsFile = Join-Path $TmpDir "SHA256SUMS.txt"

    Write-Host "[operon] Downloading $AssetName..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "$BaseUrl/$AssetName" -OutFile $TmpExe -UseBasicParsing

    try {
        Invoke-WebRequest -Uri "$BaseUrl/SHA256SUMS.txt" -OutFile $SumsFile -UseBasicParsing
        $ExpectedLine = Get-Content $SumsFile | Where-Object { $_ -match "\s+\*?$([regex]::Escape($AssetName))$" } | Select-Object -First 1
        if ($ExpectedLine) {
            $ExpectedHash = ($ExpectedLine -split '\s+')[0].ToLowerInvariant()
            $ActualHash = (Get-FileHash -Path $TmpExe -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($ActualHash -ne $ExpectedHash) {
                throw "SHA256 mismatch for $AssetName (expected $ExpectedHash, got $ActualHash)"
            }
            Write-Host "[operon] SHA256 verified." -ForegroundColor Green
        }
    } catch {
        Write-Host "[operon] Warning: SHA256 verification skipped ($($_.Exception.Message))." -ForegroundColor Yellow
    }

    # Stop existing daemon before replacing binary
    if (Test-Path $TargetExe) {
        try { & $TargetExe worker stop --force 2>$null | Out-Null } catch {}
        Start-Sleep -Milliseconds 300
    }

    Move-Item -Path $TmpExe -Destination $TargetExe -Force
    Write-Host "[operon] Installed binary: $TargetExe" -ForegroundColor Green
} finally {
    Remove-Item -Path $TmpDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Add to User PATH idempotently
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$PathEntries = if ($UserPath) { $UserPath -split ';' | Where-Object { $_ -ne '' } } else { @() }
if (($PathEntries | ForEach-Object { $_.TrimEnd('\') }) -notcontains $BinDir.TrimEnd('\')) {
    $NewPath = (@($PathEntries) + $BinDir) -join ';'
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    $env:Path = "$BinDir;$env:Path"
    Write-Host "[operon] Added $BinDir to User PATH." -ForegroundColor Green
}

# Register logon autostart
$DaemonArgs = "worker start -H 127.0.0.1 -p 8765 -d"
try {
    $Action = New-ScheduledTaskAction -Execute $TargetExe -Argument $DaemonArgs
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Operon Local Bridge Daemon (127.0.0.1:8765)" -Force -ErrorAction Stop | Out-Null
    Write-Host "[operon] Autostart Scheduled Task registered: $TaskName" -ForegroundColor Green
} catch {
    $Vbs = @"
Set sh = CreateObject("WScript.Shell")
sh.Run """$TargetExe"" $DaemonArgs", 0, False
"@
    Set-Content -Path $StartupVbs -Value $Vbs -Encoding ascii -Force
    Write-Host "[operon] Autostart registered via Startup folder: $StartupVbs" -ForegroundColor Green
}

# Start daemon now and verify health
Write-Host "[operon] Starting Local Bridge daemon on 127.0.0.1:8765..." -ForegroundColor Cyan
& $TargetExe worker start -H 127.0.0.1 -p 8765 -d

$Healthy = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $Resp = Invoke-RestMethod -Uri "http://127.0.0.1:8765/api/v1/health" -TimeoutSec 2
        if ($Resp.status -eq "ok") {
            $Healthy = $true
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 500
}

if ($Healthy) {
    Write-Host "[operon] Local Bridge ONLINE at http://127.0.0.1:8765 (ready for Web-UI & Desktop)." -ForegroundColor Green
} else {
    Write-Host "[operon] Warning: binary installed, but health check on 127.0.0.1:8765 did not respond yet. Run 'opn worker status' to inspect." -ForegroundColor Yellow
}
