#Requires -Version 5.1
<#
.SYNOPSIS
    AEGIS-SIGHT Agent - Entry point for telemetry collection and submission.
.DESCRIPTION
    Reads configuration, authenticates via JWT, invokes collection modules,
    aggregates results into a single JSON payload, and sends it to the API.
.NOTES
    Intended to run as a scheduled task every 5 minutes on Windows endpoints.
#>

[CmdletBinding()]
param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\agent-config.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-Log {
    param([string]$Message, [ValidateSet('INFO','WARN','ERROR')][string]$Level = 'INFO')
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "$ts [$Level] $Message"
    if ($script:LogPath) {
        $line | Out-File -FilePath $script:LogPath -Append -Encoding utf8
    }
    switch ($Level) {
        'ERROR' { Write-Error $line }
        'WARN'  { Write-Warning $line }
        default { Write-Verbose $line }
    }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
try {
    # ---- Load config ----
    if (-not (Test-Path $ConfigPath)) {
        throw "Configuration file not found: $ConfigPath"
    }
    $Config = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json

    $script:LogPath = $Config.log_path
    $logDir = Split-Path $script:LogPath -Parent
    if ($logDir -and -not (Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }

    Write-Log "AEGIS-SIGHT Agent starting"
    Write-Log "API URL: $($Config.api_url)"

    # ---- Dot-source modules ----
    $modulesDir = $PSScriptRoot
    . "$modulesDir\Get-AuthToken.ps1"
    . "$modulesDir\Collect-Hardware.ps1"
    . "$modulesDir\Collect-Software.ps1"
    . "$modulesDir\Collect-Logs.ps1"
    . "$modulesDir\Collect-Security.ps1"
    . "$modulesDir\Send-Telemetry.ps1"

    # ---- Authenticate ----
    Write-Log "Requesting authentication token"
    $token = Get-AuthToken -ApiUrl $Config.api_url
    Write-Log "Authentication successful"

    # ---- Collect telemetry ----
    $payload = [ordered]@{
        agent_version  = '1.0.0'
        hostname       = $env:COMPUTERNAME
        collected_at   = (Get-Date).ToUniversalTime().ToString('o')
    }

    $enabledModules = $Config.modules_enabled

    if ($enabledModules.hardware) {
        Write-Log "Collecting hardware information"
        $payload['hardware'] = Collect-Hardware
    }

    if ($enabledModules.software) {
        Write-Log "Collecting software information"
        $payload['software'] = Collect-Software
    }

    if ($enabledModules.logs) {
        Write-Log "Collecting log events"
        $payload['logs'] = Collect-Logs
    }

    if ($enabledModules.security) {
        Write-Log "Collecting security status"
        $payload['security'] = Collect-Security
    }

    # ---- Send ----
    Write-Log "Sending telemetry payload"
    $result = Send-Telemetry -ApiUrl $Config.api_url `
                             -Token $token `
                             -Payload $payload `
                             -BufferDbPath $Config.buffer_db_path

    if ($result.Success) {
        Write-Log "Telemetry sent successfully (HTTP $($result.StatusCode))"
    } else {
        Write-Log "Telemetry buffered locally - will retry next cycle" -Level WARN
    }

    Write-Log "AEGIS-SIGHT Agent finished"
}
catch {
    if ($script:LogPath) {
        Write-Log "Fatal error: $_" -Level ERROR
    }
    throw
}
