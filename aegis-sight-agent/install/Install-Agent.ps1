#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs the AEGIS-SIGHT Agent on the local machine.
.DESCRIPTION
    - Copies agent files to the installation directory
    - Generates config from template if not present
    - Registers a scheduled task to run every 5 minutes
    - Performs an initial collection run
.PARAMETER InstallDir
    Target installation directory. Defaults to C:\Program Files\AegisSight.
.PARAMETER ApiUrl
    AEGIS-SIGHT API base URL.
.PARAMETER IntervalMinutes
    Collection interval in minutes. Defaults to 5.
#>

[CmdletBinding()]
param(
    [string]$InstallDir = 'C:\Program Files\AegisSight',
    [Parameter(Mandatory)][string]$ApiUrl,
    [int]$IntervalMinutes = 5
)

$ErrorActionPreference = 'Stop'
$TaskName = 'AegisSightAgent'

Write-Host '=== AEGIS-SIGHT Agent Installer ===' -ForegroundColor Cyan

# ---- 1. Copy files ----
Write-Host "[1/4] Copying agent files to $InstallDir ..."

$srcRoot = Split-Path $PSScriptRoot -Parent   # aegis-sight-agent/
$dirs = @(
    "$InstallDir\src"
    "$InstallDir\config"
    "$InstallDir\logs"
)
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -Path $d -ItemType Directory -Force | Out-Null
    }
}

Copy-Item -Path "$srcRoot\src\*" -Destination "$InstallDir\src\" -Force -Recurse
Write-Host "  Files copied." -ForegroundColor Green

# ---- 2. Generate config ----
Write-Host "[2/4] Generating configuration ..."

$configDest = "$InstallDir\config\agent-config.json"
if (-not (Test-Path $configDest)) {
    $config = @{
        api_url                    = $ApiUrl
        collection_interval_minutes = $IntervalMinutes
        buffer_db_path             = "$InstallDir\buffer.db"
        log_path                   = "$InstallDir\logs\agent.log"
        cert_thumbprint            = ''
        modules_enabled            = @{
            hardware = $true
            software = $true
            logs     = $true
            security = $true
        }
    }
    $config | ConvertTo-Json -Depth 5 | Set-Content -Path $configDest -Encoding utf8
    Write-Host "  Config written to $configDest" -ForegroundColor Green
} else {
    Write-Host "  Config already exists - skipping." -ForegroundColor Yellow
}

# ---- 3. Register scheduled task ----
Write-Host "[3/4] Registering scheduled task ($IntervalMinutes min interval) ..."

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  Removed existing task." -ForegroundColor Yellow
}

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\src\AegisSightAgent.ps1`" -ConfigPath `"$configDest`"" `
    -WorkingDirectory "$InstallDir\src"

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
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
    -Description 'AEGIS-SIGHT telemetry collection agent' | Out-Null

Write-Host "  Task '$TaskName' registered." -ForegroundColor Green

# ---- 4. Initial run ----
Write-Host "[4/4] Running initial collection ..."
try {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "  Initial run started." -ForegroundColor Green
}
catch {
    Write-Host "  Could not trigger initial run: $_" -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== Installation complete ===' -ForegroundColor Cyan
Write-Host "Install dir : $InstallDir"
Write-Host "Config      : $configDest"
Write-Host "Task name   : $TaskName"
Write-Host "Interval    : $IntervalMinutes minutes"
