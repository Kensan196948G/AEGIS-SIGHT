#Requires -Version 5.1
<#
.SYNOPSIS
    Validates the AEGIS-SIGHT Agent configuration and environment.
.DESCRIPTION
    Performs a comprehensive health-check of the agent configuration:
      - Reads and validates agent-config.json
      - Tests API URL connectivity
      - Checks device certificate expiry
      - Verifies SQLite buffer database state
      - Outputs a summary report
.PARAMETER ConfigPath
    Path to agent-config.json. Defaults to ..\config\agent-config.json.
.PARAMETER ReportPath
    Optional path to write the report as JSON. If omitted, outputs to console only.
.EXAMPLE
    .\Test-Config.ps1
    .\Test-Config.ps1 -ConfigPath "C:\Program Files\AegisSight\config\agent-config.json" -ReportPath "C:\temp\report.json"
#>

[CmdletBinding()]
param(
    [string]$ConfigPath = "$PSScriptRoot\..\config\agent-config.json",
    [string]$ReportPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

# ---------------------------------------------------------------------------
# Result collector
# ---------------------------------------------------------------------------
$results = [ordered]@{
    timestamp    = (Get-Date).ToUniversalTime().ToString('o')
    hostname     = $env:COMPUTERNAME
    overall      = 'PASS'
    checks       = [System.Collections.ArrayList]::new()
}

function Add-CheckResult {
    param(
        [string]$Name,
        [ValidateSet('PASS','WARN','FAIL')][string]$Status,
        [string]$Message,
        [object]$Details = $null
    )
    $entry = [ordered]@{
        name    = $Name
        status  = $Status
        message = $Message
    }
    if ($null -ne $Details) { $entry['details'] = $Details }
    [void]$results.checks.Add($entry)

    if ($Status -eq 'FAIL') { $results.overall = 'FAIL' }
    elseif ($Status -eq 'WARN' -and $results.overall -ne 'FAIL') { $results.overall = 'WARN' }

    $color = switch ($Status) { 'PASS' { 'Green' } 'WARN' { 'Yellow' } 'FAIL' { 'Red' } }
    Write-Host "  [$Status] $Name - $Message" -ForegroundColor $color
}

# ===================================================================
Write-Host "`n=== AEGIS-SIGHT Configuration Validation ===" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  |  $env:COMPUTERNAME`n"
# ===================================================================

# ---------------------------------------------------------------------------
# 1. Configuration file existence and structure
# ---------------------------------------------------------------------------
Write-Host "--- Configuration File ---" -ForegroundColor White

if (-not (Test-Path $ConfigPath)) {
    Add-CheckResult -Name 'config_file' -Status 'FAIL' -Message "Config not found: $ConfigPath"
    # Cannot proceed without config
    $results | ConvertTo-Json -Depth 10
    return
}

Add-CheckResult -Name 'config_file' -Status 'PASS' -Message "Config found at $ConfigPath"

try {
    $raw = Get-Content -Path $ConfigPath -Raw -ErrorAction Stop
    $Config = $raw | ConvertFrom-Json -ErrorAction Stop
    Add-CheckResult -Name 'config_parse' -Status 'PASS' -Message 'Config parsed as valid JSON'
}
catch {
    Add-CheckResult -Name 'config_parse' -Status 'FAIL' -Message "JSON parse error: $_"
    $results | ConvertTo-Json -Depth 10
    return
}

# ---------------------------------------------------------------------------
# 2. Required fields
# ---------------------------------------------------------------------------
Write-Host "`n--- Required Fields ---" -ForegroundColor White

$requiredFields = @('api_url', 'collection_interval_minutes', 'buffer_db_path', 'log_path', 'modules_enabled')
foreach ($field in $requiredFields) {
    $value = $Config.PSObject.Properties[$field]
    if ($null -eq $value -or ($value.Value -is [string] -and [string]::IsNullOrWhiteSpace($value.Value))) {
        Add-CheckResult -Name "field_$field" -Status 'FAIL' -Message "Required field '$field' is missing or empty"
    } else {
        Add-CheckResult -Name "field_$field" -Status 'PASS' -Message "'$field' is set"
    }
}

# Validate api_url format
if ($Config.api_url -and $Config.api_url -notmatch '^https?://') {
    Add-CheckResult -Name 'api_url_format' -Status 'FAIL' -Message "api_url must start with http:// or https://"
} elseif ($Config.api_url -and $Config.api_url -match '^http://') {
    Add-CheckResult -Name 'api_url_format' -Status 'WARN' -Message "api_url uses HTTP (not HTTPS) - consider using TLS in production"
} elseif ($Config.api_url) {
    Add-CheckResult -Name 'api_url_format' -Status 'PASS' -Message "api_url uses HTTPS"
}

# Validate interval
if ($Config.collection_interval_minutes -and $Config.collection_interval_minutes -lt 1) {
    Add-CheckResult -Name 'interval_range' -Status 'FAIL' -Message "collection_interval_minutes must be >= 1"
} elseif ($Config.collection_interval_minutes -and $Config.collection_interval_minutes -lt 5) {
    Add-CheckResult -Name 'interval_range' -Status 'WARN' -Message "Interval is $($Config.collection_interval_minutes) min - aggressive polling may impact performance"
} elseif ($Config.collection_interval_minutes) {
    Add-CheckResult -Name 'interval_range' -Status 'PASS' -Message "Interval: $($Config.collection_interval_minutes) minutes"
}

# Validate modules_enabled
if ($Config.modules_enabled) {
    $moduleFields = @('hardware', 'software', 'logs', 'security')
    foreach ($mod in $moduleFields) {
        $val = $Config.modules_enabled.PSObject.Properties[$mod]
        if ($null -eq $val) {
            Add-CheckResult -Name "module_$mod" -Status 'WARN' -Message "Module '$mod' is not defined in modules_enabled"
        } elseif ($val.Value -eq $true) {
            Add-CheckResult -Name "module_$mod" -Status 'PASS' -Message "Module '$mod' is enabled"
        } else {
            Add-CheckResult -Name "module_$mod" -Status 'WARN' -Message "Module '$mod' is disabled"
        }
    }
}

# ---------------------------------------------------------------------------
# 3. API URL connectivity
# ---------------------------------------------------------------------------
Write-Host "`n--- API Connectivity ---" -ForegroundColor White

if ($Config.api_url) {
    $healthUrl = "$($Config.api_url.TrimEnd('/'))/api/v1/health"
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Add-CheckResult -Name 'api_connectivity' -Status 'PASS' `
            -Message "API reachable ($healthUrl) - HTTP $($response.StatusCode)" `
            -Details @{ status_code = $response.StatusCode; url = $healthUrl }
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -ge 200 -and $statusCode -lt 500) {
            Add-CheckResult -Name 'api_connectivity' -Status 'WARN' `
                -Message "API returned HTTP $statusCode (may still be functional)" `
                -Details @{ status_code = $statusCode; url = $healthUrl; error = $_.Exception.Message }
        } else {
            Add-CheckResult -Name 'api_connectivity' -Status 'FAIL' `
                -Message "API unreachable: $($_.Exception.Message)" `
                -Details @{ url = $healthUrl; error = $_.Exception.Message }
        }
    }
} else {
    Add-CheckResult -Name 'api_connectivity' -Status 'FAIL' -Message 'Cannot test - api_url is not set'
}

# ---------------------------------------------------------------------------
# 4. Certificate validation
# ---------------------------------------------------------------------------
Write-Host "`n--- Certificate ---" -ForegroundColor White

$certThumbprint = $Config.cert_thumbprint
if ([string]::IsNullOrWhiteSpace($certThumbprint)) {
    Add-CheckResult -Name 'certificate' -Status 'WARN' -Message 'No cert_thumbprint configured - device certificate auth may not work'
} else {
    try {
        $cert = Get-ChildItem -Path "Cert:\LocalMachine\My\$certThumbprint" -ErrorAction Stop
        $daysUntilExpiry = ($cert.NotAfter - (Get-Date)).Days

        if ($daysUntilExpiry -le 0) {
            Add-CheckResult -Name 'certificate' -Status 'FAIL' `
                -Message "Certificate EXPIRED on $($cert.NotAfter.ToString('yyyy-MM-dd'))" `
                -Details @{ thumbprint = $certThumbprint; not_after = $cert.NotAfter.ToString('o'); days_remaining = $daysUntilExpiry }
        } elseif ($daysUntilExpiry -le 30) {
            Add-CheckResult -Name 'certificate' -Status 'WARN' `
                -Message "Certificate expires in $daysUntilExpiry days ($($cert.NotAfter.ToString('yyyy-MM-dd')))" `
                -Details @{ thumbprint = $certThumbprint; not_after = $cert.NotAfter.ToString('o'); days_remaining = $daysUntilExpiry }
        } else {
            Add-CheckResult -Name 'certificate' -Status 'PASS' `
                -Message "Certificate valid - expires in $daysUntilExpiry days ($($cert.NotAfter.ToString('yyyy-MM-dd')))" `
                -Details @{ thumbprint = $certThumbprint; not_after = $cert.NotAfter.ToString('o'); days_remaining = $daysUntilExpiry }
        }
    }
    catch {
        Add-CheckResult -Name 'certificate' -Status 'FAIL' `
            -Message "Certificate not found in LocalMachine\My for thumbprint: $certThumbprint"
    }
}

# ---------------------------------------------------------------------------
# 5. SQLite buffer database
# ---------------------------------------------------------------------------
Write-Host "`n--- Buffer Database ---" -ForegroundColor White

$bufferPath = $Config.buffer_db_path
if ([string]::IsNullOrWhiteSpace($bufferPath)) {
    Add-CheckResult -Name 'buffer_db' -Status 'WARN' -Message 'buffer_db_path not configured'
} else {
    $bufferDir = Split-Path $bufferPath -Parent
    if ($bufferDir -and -not (Test-Path $bufferDir)) {
        Add-CheckResult -Name 'buffer_db_dir' -Status 'WARN' -Message "Buffer directory does not exist: $bufferDir (will be created on first use)"
    } else {
        Add-CheckResult -Name 'buffer_db_dir' -Status 'PASS' -Message "Buffer directory exists: $bufferDir"
    }

    if (Test-Path $bufferPath) {
        $dbFile = Get-Item $bufferPath
        $sizeMB = [math]::Round($dbFile.Length / 1MB, 2)
        if ($sizeMB -gt 100) {
            Add-CheckResult -Name 'buffer_db_size' -Status 'WARN' `
                -Message "Buffer DB is large: ${sizeMB} MB - consider flushing or clearing" `
                -Details @{ path = $bufferPath; size_mb = $sizeMB }
        } else {
            Add-CheckResult -Name 'buffer_db_size' -Status 'PASS' `
                -Message "Buffer DB size: ${sizeMB} MB" `
                -Details @{ path = $bufferPath; size_mb = $sizeMB }
        }
    } else {
        Add-CheckResult -Name 'buffer_db_size' -Status 'PASS' -Message "No buffer DB yet (will be created when needed)"
    }

    # Check for JSONL fallback
    $jsonlFallback = [System.IO.Path]::ChangeExtension($bufferPath, '.jsonl')
    if (Test-Path $jsonlFallback) {
        $jsonlFile = Get-Item $jsonlFallback
        $jsonlSizeMB = [math]::Round($jsonlFile.Length / 1MB, 2)
        Add-CheckResult -Name 'buffer_jsonl_fallback' -Status 'WARN' `
            -Message "JSONL fallback file exists (${jsonlSizeMB} MB) - SQLite may not be available" `
            -Details @{ path = $jsonlFallback; size_mb = $jsonlSizeMB }
    }
}

# ---------------------------------------------------------------------------
# 6. Log directory
# ---------------------------------------------------------------------------
Write-Host "`n--- Log Directory ---" -ForegroundColor White

if ($Config.log_path) {
    $logDir = Split-Path $Config.log_path -Parent
    if ($logDir -and -not (Test-Path $logDir)) {
        Add-CheckResult -Name 'log_dir' -Status 'WARN' -Message "Log directory does not exist: $logDir (will be created on first run)"
    } else {
        Add-CheckResult -Name 'log_dir' -Status 'PASS' -Message "Log directory exists: $logDir"
    }
}

# ===================================================================
# Summary
# ===================================================================
Write-Host "`n=== Validation Complete ===" -ForegroundColor Cyan

$passCount = ($results.checks | Where-Object { $_.status -eq 'PASS' }).Count
$warnCount = ($results.checks | Where-Object { $_.status -eq 'WARN' }).Count
$failCount = ($results.checks | Where-Object { $_.status -eq 'FAIL' }).Count

$results['summary'] = [ordered]@{
    total = $results.checks.Count
    pass  = $passCount
    warn  = $warnCount
    fail  = $failCount
}

$overallColor = switch ($results.overall) { 'PASS' { 'Green' } 'WARN' { 'Yellow' } 'FAIL' { 'Red' } }
Write-Host "  Overall: $($results.overall)  |  Pass: $passCount  Warn: $warnCount  Fail: $failCount" -ForegroundColor $overallColor

# Export report if requested
if ($ReportPath) {
    $reportDir = Split-Path $ReportPath -Parent
    if ($reportDir -and -not (Test-Path $reportDir)) {
        New-Item -Path $reportDir -ItemType Directory -Force | Out-Null
    }
    $results | ConvertTo-Json -Depth 10 | Set-Content -Path $ReportPath -Encoding utf8
    Write-Host "  Report saved to: $ReportPath" -ForegroundColor Gray
}

# Return structured results for programmatic use
return $results
