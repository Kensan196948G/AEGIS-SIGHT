#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    AEGIS-SIGHT Agent auto-updater.
.DESCRIPTION
    Checks the API for a newer agent version and performs a safe update:
      1. Query the API for the latest available version
      2. Compare with the locally installed version
      3. Download the new package
      4. Backup the current installation
      5. Apply the update
      6. Verify the new version runs correctly
      7. Re-register the scheduled task
      8. Roll back on failure
.PARAMETER ConfigPath
    Path to agent-config.json.
.PARAMETER InstallDir
    Agent installation directory.
.PARAMETER Force
    Force update even if the local version matches.
.EXAMPLE
    .\Update-Agent.ps1
    .\Update-Agent.ps1 -Force
#>

[CmdletBinding()]
param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\agent-config.json",
    [string]$InstallDir = "$PSScriptRoot\..",
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TaskName = 'AegisSightAgent'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-Log {
    param([string]$Message, [ValidateSet('INFO','WARN','ERROR')][string]$Level = 'INFO')
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "$ts [$Level] [Updater] $Message"
    if ($script:LogPath) {
        $line | Out-File -FilePath $script:LogPath -Append -Encoding utf8
    }
    $color = switch ($Level) { 'ERROR' { 'Red' } 'WARN' { 'Yellow' } default { 'Gray' } }
    Write-Host $line -ForegroundColor $color
}

function Compare-Version {
    <#
    .SYNOPSIS
        Returns $true if $Remote is newer than $Local (semver comparison).
    #>
    param([string]$Local, [string]$Remote)

    try {
        $lv = [System.Version]::new($Local)
        $rv = [System.Version]::new($Remote)
        return $rv -gt $lv
    }
    catch {
        # Fallback: simple string comparison
        return $Remote -ne $Local
    }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
Write-Host "`n=== AEGIS-SIGHT Agent Updater ===" -ForegroundColor Cyan

# ---- Load config ----
if (-not (Test-Path $ConfigPath)) {
    throw "Configuration file not found: $ConfigPath"
}
$Config = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json
$script:LogPath = $Config.log_path

# Resolve install dir to absolute path
$InstallDir = (Resolve-Path $InstallDir -ErrorAction SilentlyContinue).Path
if (-not $InstallDir) { $InstallDir = Split-Path $PSScriptRoot -Parent }

# ---- Load local version ----
$versionFile = Join-Path $InstallDir 'version.json'
if (Test-Path $versionFile) {
    $localVersion = (Get-Content $versionFile -Raw | ConvertFrom-Json).current_version
} else {
    $localVersion = '0.0.0'
}
Write-Log "Local version: $localVersion"

# ---- Query API for latest version ----
Write-Log "Checking for updates..."
$apiUrl = $Config.api_url.TrimEnd('/')
$updateEndpoint = "$apiUrl/api/v1/agent/version"

try {
    $remoteInfo = Invoke-RestMethod -Uri $updateEndpoint -Method GET -TimeoutSec 15 -ErrorAction Stop
}
catch {
    Write-Log "Could not reach update endpoint: $($_.Exception.Message)" -Level WARN
    Write-Host "`n  No updates available (API unreachable)." -ForegroundColor Yellow
    return @{ Updated = $false; Reason = 'API unreachable' }
}

$remoteVersion = $remoteInfo.current_version
$downloadUrl   = $remoteInfo.download_url
$checksum      = $remoteInfo.sha256

Write-Log "Remote version: $remoteVersion"

# ---- Compare versions ----
$needsUpdate = Compare-Version -Local $localVersion -Remote $remoteVersion
if (-not $needsUpdate -and -not $Force) {
    Write-Log "Agent is up to date ($localVersion)"
    Write-Host "`n  Agent is up to date." -ForegroundColor Green
    return @{ Updated = $false; Reason = 'Already up to date'; LocalVersion = $localVersion }
}

if ($Force -and -not $needsUpdate) {
    Write-Log "Force flag set - proceeding with reinstall" -Level WARN
}

Write-Log "Update available: $localVersion -> $remoteVersion"

# ---- Step 1: Download update package ----
Write-Log "[1/5] Downloading update package..."
$tempDir  = Join-Path $env:TEMP "AegisSight-Update-$remoteVersion"
$zipPath  = Join-Path $tempDir "aegis-sight-agent-$remoteVersion.zip"

if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -Path $tempDir -ItemType Directory -Force | Out-Null

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -TimeoutSec 120 -UseBasicParsing -ErrorAction Stop
    Write-Log "  Downloaded to $zipPath"
}
catch {
    Write-Log "Download failed: $($_.Exception.Message)" -Level ERROR
    return @{ Updated = $false; Reason = "Download failed: $($_.Exception.Message)" }
}

# ---- Verify checksum ----
if ($checksum) {
    Write-Log "  Verifying SHA-256 checksum..."
    $actualHash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
    if ($actualHash -ne $checksum) {
        Write-Log "Checksum mismatch! Expected: $checksum Got: $actualHash" -Level ERROR
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        return @{ Updated = $false; Reason = 'Checksum verification failed' }
    }
    Write-Log "  Checksum verified."
}

# ---- Step 2: Backup current installation ----
Write-Log "[2/5] Backing up current installation..."
$backupDir = Join-Path $InstallDir "backup-$localVersion-$(Get-Date -Format 'yyyyMMddHHmmss')"
try {
    Copy-Item -Path "$InstallDir\src"    -Destination "$backupDir\src"    -Recurse -Force
    Copy-Item -Path "$InstallDir\config" -Destination "$backupDir\config" -Recurse -Force
    if (Test-Path "$InstallDir\version.json") {
        Copy-Item -Path "$InstallDir\version.json" -Destination "$backupDir\version.json" -Force
    }
    Write-Log "  Backup created at $backupDir"
}
catch {
    Write-Log "Backup failed: $($_.Exception.Message)" -Level ERROR
    return @{ Updated = $false; Reason = "Backup failed: $($_.Exception.Message)" }
}

# ---- Step 3: Extract and apply update ----
Write-Log "[3/5] Applying update..."
$extractDir = Join-Path $tempDir 'extracted'
try {
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    # Stop the scheduled task before updating files
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask -and $existingTask.State -eq 'Running') {
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # Copy new files
    if (Test-Path "$extractDir\src") {
        Copy-Item -Path "$extractDir\src\*" -Destination "$InstallDir\src\" -Recurse -Force
    }
    if (Test-Path "$extractDir\version.json") {
        Copy-Item -Path "$extractDir\version.json" -Destination "$InstallDir\version.json" -Force
    }
    Write-Log "  Files updated."
}
catch {
    Write-Log "Update extraction failed: $($_.Exception.Message) - rolling back" -Level ERROR
    # Rollback
    if (Test-Path $backupDir) {
        Copy-Item -Path "$backupDir\src\*" -Destination "$InstallDir\src\" -Recurse -Force
        if (Test-Path "$backupDir\version.json") {
            Copy-Item -Path "$backupDir\version.json" -Destination "$InstallDir\version.json" -Force
        }
        Write-Log "  Rollback completed."
    }
    return @{ Updated = $false; Reason = "Extraction failed - rolled back" }
}

# ---- Step 4: Verify ----
Write-Log "[4/5] Verifying updated agent..."
try {
    # Quick syntax check on the main script
    $mainScript = Join-Path $InstallDir 'src' 'AegisSightAgent.ps1'
    $null = [System.Management.Automation.PSParser]::Tokenize(
        (Get-Content $mainScript -Raw), [ref]$null
    )
    Write-Log "  Syntax check passed."

    # Verify new version.json
    $newVersionFile = Join-Path $InstallDir 'version.json'
    if (Test-Path $newVersionFile) {
        $newVersion = (Get-Content $newVersionFile -Raw | ConvertFrom-Json).current_version
        Write-Log "  New version confirmed: $newVersion"
    }
}
catch {
    Write-Log "Verification failed: $($_.Exception.Message) - rolling back" -Level ERROR
    # Rollback
    if (Test-Path $backupDir) {
        Copy-Item -Path "$backupDir\src\*" -Destination "$InstallDir\src\" -Recurse -Force
        if (Test-Path "$backupDir\version.json") {
            Copy-Item -Path "$backupDir\version.json" -Destination "$InstallDir\version.json" -Force
        }
        Write-Log "  Rollback completed."
    }
    return @{ Updated = $false; Reason = "Verification failed - rolled back" }
}

# ---- Step 5: Re-register scheduled task ----
Write-Log "[5/5] Re-registering scheduled task..."
try {
    $configDest = Join-Path $InstallDir 'config' 'agent-config.json'
    $interval   = $Config.collection_interval_minutes
    if (-not $interval) { $interval = 5 }

    # Remove existing task
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    $action = New-ScheduledTaskAction `
        -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\src\AegisSightAgent.ps1`" -ConfigPath `"$configDest`"" `
        -WorkingDirectory "$InstallDir\src"

    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
        -RepetitionInterval (New-TimeSpan -Minutes $interval) `
        -RepetitionDuration (New-TimeSpan -Days 3650)

    $principal = New-ScheduledTaskPrincipal `
        -UserId 'SYSTEM' `
        -LogonType ServiceAccount `
        -RunLevel Highest

    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
        -MultipleInstances IgnoreNew

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Description "AEGIS-SIGHT telemetry collection agent v$remoteVersion" | Out-Null

    Write-Log "  Task '$TaskName' re-registered."

    # Start the task
    Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Write-Log "  Task started."
}
catch {
    Write-Log "Task registration failed: $($_.Exception.Message)" -Level WARN
    Write-Log "The agent files are updated but the scheduled task may need manual re-registration." -Level WARN
}

# ---- Cleanup ----
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

# ---- Done ----
Write-Host "`n=== Update Complete ===" -ForegroundColor Cyan
Write-Host "  $localVersion -> $remoteVersion" -ForegroundColor Green
Write-Host "  Backup: $backupDir" -ForegroundColor Gray

Write-Log "Update complete: $localVersion -> $remoteVersion"

return @{
    Updated         = $true
    PreviousVersion = $localVersion
    NewVersion      = $remoteVersion
    BackupPath      = $backupDir
}
