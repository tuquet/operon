# Install the active managed nightly. GitHub Releases hosts the versioned installer.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$registryUrl = 'https://raw.githubusercontent.com/tuquet/console/release-state/registry.json'
$registry = Invoke-RestMethod -Uri $registryUrl
$tag = $registry.channels.nightly.tag
if (-not $tag) { throw 'No active nightly release is available.' }
$release = $registry.releases.$tag
if ($release.status -ne 'published') { throw 'The nightly release is unavailable or has been revoked.' }
$installer = @($release.artifacts | Where-Object { $_.kind -eq 'installer' -and $_.platform -eq 'windows-x86_64' })
if ($installer.Count -ne 1) { throw 'The nightly installer manifest is invalid.' }
$asset = $installer[0]
$expectedPrefix = "https://github.com/tuquet/console/releases/download/$tag/"
if (-not $asset.url.StartsWith($expectedPrefix) -or $asset.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'The installer URL or checksum is invalid.' }
$installerPath = Join-Path $env:TEMP ('Operon-' + [Guid]::NewGuid().ToString('N') + '-setup.exe')
Write-Host "Downloading $tag..."
Invoke-WebRequest -Uri $asset.url -OutFile $installerPath
$actualHash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $asset.sha256) { throw 'Installer checksum verification failed. Installation stopped.' }
Write-Host 'Checksum verified. Starting the installer.'
Start-Process -FilePath $installerPath
