param(
    [string]$Target = "local",
    [string]$Plugin = "all",
    [string]$Action = "install",
    [switch]$WithSeed = $true
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cloudDir = Split-Path -Parent (Split-Path -Parent $scriptDir)
Set-Location $cloudDir

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " [OPERON-RUNTIME] Engine Plugins Runner (Action: $Action, Target: $Target)" -ForegroundColor Cyan
Write-Host " Working Directory: $cloudDir" -ForegroundColor DarkGray
Write-Host "====================================================================" -ForegroundColor Cyan

$dbContainer = docker ps --filter "name=supabase_db" --format "{{.Names}}" | Select-Object -First 1

if ($Action -eq "uninstall") {
    $canonicalPlugins = @(
        @{ Id = "automation"; File = "supabase/plugins/automation/uninstall.sql"; Desc = "Automation Cloud Bridge (schema: automation)" },
        @{ Id = "browsers"; File = "supabase/plugins/browsers/uninstall.sql"; Desc = "Cloud Browser Profiles (schema: browsers)" },
        @{ Id = "workers"; File = "supabase/plugins/workers/uninstall.sql"; Desc = "Workers & Compute Fleet (schema: workers)" },
        @{ Id = "storage"; File = "supabase/plugins/storage/uninstall.sql"; Desc = "Media Storage Assets (schema: media)" }
    )
} else {
    $canonicalPlugins = @(
        @{ Id = "storage"; File = "supabase/plugins/storage/install.sql"; Desc = "Media Storage Assets (schema: media)" },
        @{ Id = "workers"; File = "supabase/plugins/workers/install.sql"; Desc = "Workers & Compute Fleet (schema: workers)" },
        @{ Id = "browsers"; File = "supabase/plugins/browsers/install.sql"; Desc = "Cloud Browser Profiles (schema: browsers)" },
        @{ Id = "automation"; File = "supabase/plugins/automation/install.sql"; Desc = "Automation Cloud Bridge (schema: automation)" }
    )
}

foreach ($item in $canonicalPlugins) {
    if ($Plugin -ne "all" -and $Plugin -ne $item.Id) {
        continue
    }

    if (-not (Test-Path $item.File)) {
        Write-Warning "[-] Plugin $Action file not found, skipping: $($item.File)"
        continue
    }

    Write-Host "`n--> [$Action] $($item.Desc)..." -ForegroundColor Yellow

    if ($Target -eq "local" -and $dbContainer) {
        Get-Content $item.File -Raw | docker exec -i $dbContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1
    } else {
        supabase db query "--$Target" -f $item.File
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "[-] Failed to $Action plugin: $($item.Id)"
        exit 1
    }
    Write-Host "    [OK] Engine Plugin $($item.Id) applied successfully." -ForegroundColor Green

    if ($Action -eq "install" -and $WithSeed) {
        $seedFile = "supabase/plugins/$($item.Id)/seed.sql"
        if (Test-Path $seedFile) {
            Write-Host "    --> Applying sample data: $seedFile" -ForegroundColor DarkCyan
            if ($Target -eq "local" -and $dbContainer) {
                Get-Content $seedFile -Raw | docker exec -i $dbContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1
            } else {
                supabase db query "--$Target" -f $seedFile
            }
            Write-Host "    [OK] Sample data applied for $($item.Id)" -ForegroundColor Green
        }
    }
}

Write-Host "`n[SUCCESS] Operon runtime plugins pipeline completed!" -ForegroundColor Green
