#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Uninstalls the AEGIS-SIGHT Agent from the local machine.
.DESCRIPTION
    - Stops and removes the scheduled task
    - Optionally removes installation files
.PARAMETER InstallDir
    Installation directory. Defaults to C:\Program Files\AegisSight.
.PARAMETER RemoveFiles
    If set, removes all agent files from disk.
.PARAMETER RemoveData
    If set, also removes the buffer database and logs.
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$InstallDir = 'C:\Program Files\AegisSight',
    [switch]$RemoveFiles,
    [switch]$RemoveData
)

$ErrorActionPreference = 'Stop'
$TaskName = 'AegisSightAgent'

Write-Host '=== AEGIS-SIGHT Agent Uninstaller ===' -ForegroundColor Cyan

# ---- 1. Stop and remove scheduled task ----
Write-Host "[1/3] Removing scheduled task ..."

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    if ($task.State -eq 'Running') {
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Write-Host "  Task stopped." -ForegroundColor Yellow
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  Task '$TaskName' removed." -ForegroundColor Green
} else {
    Write-Host "  Task not found - skipping." -ForegroundColor Yellow
}

# ---- 2. Remove agent files ----
if ($RemoveFiles) {
    Write-Host "[2/3] Removing agent files from $InstallDir ..."
    if (Test-Path "$InstallDir\src") {
        Remove-Item -Path "$InstallDir\src" -Recurse -Force
        Write-Host "  Source files removed." -ForegroundColor Green
    }
    if (Test-Path "$InstallDir\config") {
        Remove-Item -Path "$InstallDir\config" -Recurse -Force
        Write-Host "  Config removed." -ForegroundColor Green
    }
} else {
    Write-Host "[2/3] Skipping file removal (use -RemoveFiles to delete)." -ForegroundColor Yellow
}

# ---- 3. Remove data ----
if ($RemoveData) {
    Write-Host "[3/3] Removing data files ..."
    $dataFiles = @(
        "$InstallDir\buffer.db"
        "$InstallDir\logs"
    )
    foreach ($path in $dataFiles) {
        if (Test-Path $path) {
            Remove-Item -Path $path -Recurse -Force
            Write-Host "  Removed: $path" -ForegroundColor Green
        }
    }

    # Remove install dir if empty
    if ((Test-Path $InstallDir) -and -not (Get-ChildItem $InstallDir -Recurse)) {
        Remove-Item -Path $InstallDir -Force
        Write-Host "  Removed empty directory: $InstallDir" -ForegroundColor Green
    }
} else {
    Write-Host "[3/3] Skipping data removal (use -RemoveData to delete)." -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== Uninstallation complete ===' -ForegroundColor Cyan
