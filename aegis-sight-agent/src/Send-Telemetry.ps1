#Requires -Version 5.1
<#
.SYNOPSIS
    Sends aggregated telemetry payload to the AEGIS-SIGHT API.
.DESCRIPTION
    - POST /api/v1/telemetry with JWT Bearer token
    - Exponential backoff retry (30s, 60s, 120s)
    - Falls back to local SQLite buffer when offline
#>

function Send-Telemetry {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory)][string]$ApiUrl,
        [Parameter(Mandatory)][string]$Token,
        [Parameter(Mandatory)][hashtable]$Payload,
        [string]$BufferDbPath = "$env:ProgramData\AegisSight\buffer.db"
    )

    $endpoint = "$($ApiUrl.TrimEnd('/'))/api/v1/telemetry"
    $jsonBody = $Payload | ConvertTo-Json -Depth 20 -Compress
    $maxRetries = 3
    $backoffSeconds = @(30, 60, 120)

    # ---- Attempt to flush buffered payloads first ----
    Send-BufferedPayloads -ApiUrl $ApiUrl -Token $Token -BufferDbPath $BufferDbPath

    # ---- Send current payload with retry ----
    for ($attempt = 0; $attempt -le $maxRetries; $attempt++) {
        try {
            $headers = @{
                'Authorization' = "Bearer $Token"
                'Content-Type'  = 'application/json'
                'User-Agent'    = 'AegisSight-Agent/1.0'
            }

            $response = Invoke-RestMethod -Uri $endpoint `
                                          -Method Post `
                                          -Headers $headers `
                                          -Body $jsonBody `
                                          -TimeoutSec 30 `
                                          -ErrorAction Stop

            return @{ Success = $true; StatusCode = 200; Response = $response }
        }
        catch {
            $statusCode = 0
            if ($_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }

            # Do not retry on client errors (except 429 Too Many Requests)
            if ($statusCode -ge 400 -and $statusCode -lt 500 -and $statusCode -ne 429) {
                Write-Verbose "Client error $statusCode - will not retry"
                return @{ Success = $false; StatusCode = $statusCode; Error = $_.Exception.Message }
            }

            if ($attempt -lt $maxRetries) {
                $wait = $backoffSeconds[$attempt]
                Write-Verbose "Attempt $($attempt+1) failed ($statusCode). Retrying in ${wait}s..."
                Start-Sleep -Seconds $wait
            }
        }
    }

    # ---- All retries exhausted - buffer locally ----
    Write-Verbose "All retries exhausted. Buffering payload to SQLite."
    Save-ToBuffer -BufferDbPath $BufferDbPath -JsonPayload $jsonBody

    return @{ Success = $false; StatusCode = 0; Error = 'All retries exhausted; payload buffered locally' }
}

# ---------------------------------------------------------------------------
# SQLite buffer helpers
# ---------------------------------------------------------------------------
function Initialize-BufferDb {
    param([string]$DbPath)

    $dir = Split-Path $DbPath -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
    }

    # Use System.Data.SQLite if available, otherwise fall back to Add-Type
    if (-not ([System.Management.Automation.PSTypeName]'System.Data.SQLite.SQLiteConnection').Type) {
        $sqliteDll = Join-Path $PSScriptRoot 'System.Data.SQLite.dll'
        if (Test-Path $sqliteDll) {
            Add-Type -Path $sqliteDll
        } else {
            # Fallback: write to a simple JSON file buffer
            return $null
        }
    }

    $connStr = "Data Source=$DbPath;Version=3;"
    $conn = New-Object System.Data.SQLite.SQLiteConnection($connStr)
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
CREATE TABLE IF NOT EXISTS telemetry_buffer (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    payload    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    attempts   INTEGER NOT NULL DEFAULT 0
);
"@
    $cmd.ExecuteNonQuery() | Out-Null
    $cmd.Dispose()

    return $conn
}

function Save-ToBuffer {
    param([string]$BufferDbPath, [string]$JsonPayload)

    $conn = Initialize-BufferDb -DbPath $BufferDbPath
    if ($null -eq $conn) {
        # Fallback: append to JSON lines file
        $fallback = [System.IO.Path]::ChangeExtension($BufferDbPath, '.jsonl')
        $JsonPayload | Out-File -FilePath $fallback -Append -Encoding utf8
        return
    }

    try {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "INSERT INTO telemetry_buffer (payload) VALUES (@payload)"
        $cmd.Parameters.AddWithValue('@payload', $JsonPayload) | Out-Null
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.Dispose()
    }
    finally {
        $conn.Close()
        $conn.Dispose()
    }
}

function Send-BufferedPayloads {
    param([string]$ApiUrl, [string]$Token, [string]$BufferDbPath)

    if (-not (Test-Path $BufferDbPath)) { return }

    $conn = Initialize-BufferDb -DbPath $BufferDbPath
    if ($null -eq $conn) { return }

    try {
        $endpoint = "$($ApiUrl.TrimEnd('/'))/api/v1/telemetry"
        $headers = @{
            'Authorization' = "Bearer $Token"
            'Content-Type'  = 'application/json'
            'User-Agent'    = 'AegisSight-Agent/1.0'
        }

        $selectCmd = $conn.CreateCommand()
        $selectCmd.CommandText = "SELECT id, payload FROM telemetry_buffer ORDER BY id ASC LIMIT 50"
        $reader = $selectCmd.ExecuteReader()

        $idsToDelete = [System.Collections.ArrayList]::new()

        while ($reader.Read()) {
            $id = $reader['id']
            $body = $reader['payload']
            try {
                Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers `
                                  -Body $body -TimeoutSec 15 -ErrorAction Stop
                [void]$idsToDelete.Add($id)
            }
            catch {
                break  # stop flushing on first failure
            }
        }
        $reader.Close()
        $selectCmd.Dispose()

        if ($idsToDelete.Count -gt 0) {
            $delCmd = $conn.CreateCommand()
            $delCmd.CommandText = "DELETE FROM telemetry_buffer WHERE id IN ($($idsToDelete -join ','))"
            $delCmd.ExecuteNonQuery() | Out-Null
            $delCmd.Dispose()
            Write-Verbose "Flushed $($idsToDelete.Count) buffered payloads"
        }
    }
    finally {
        $conn.Close()
        $conn.Dispose()
    }
}
