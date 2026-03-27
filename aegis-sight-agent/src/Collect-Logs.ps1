#Requires -Version 5.1
<#
.SYNOPSIS
    Collects security-relevant log events from the local machine.
.DESCRIPTION
    - Logon / Logoff events (EventID 4624, 4634) from the Security log
    - USB device connection history from SetupAPI logs
    - Current process snapshot
.OUTPUTS
    [hashtable] with keys: logon_events, usb_events, processes
#>

function Collect-Logs {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [int]$LogonEventMaxAge = 24  # hours
    )

    # ---- Logon / Logoff Events ----
    $logonEvents = @()
    try {
        $cutoff = (Get-Date).AddHours(-$LogonEventMaxAge)
        $filter = @{
            LogName   = 'Security'
            Id        = 4624, 4634
            StartTime = $cutoff
        }
        $events = Get-WinEvent -FilterHashtable $filter -MaxEvents 500 -ErrorAction SilentlyContinue

        $logonEvents = @(foreach ($evt in $events) {
            $xml = [xml]$evt.ToXml()
            $data = @{}
            foreach ($node in $xml.Event.EventData.Data) {
                $data[$node.Name] = $node.'#text'
            }
            @{
                event_id       = $evt.Id
                time_created   = $evt.TimeCreated.ToUniversalTime().ToString('o')
                event_type     = switch ($evt.Id) { 4624 { 'Logon' } 4634 { 'Logoff' } }
                logon_type     = $data['LogonType']
                target_user    = $data['TargetUserName']
                target_domain  = $data['TargetDomainName']
                source_ip      = $data['IpAddress']
                logon_id       = $data['TargetLogonId']
            }
        })
    }
    catch {
        Write-Verbose "Could not collect logon events: $_"
    }

    # ---- USB Connection History ----
    $usbEvents = @()
    try {
        $setupLogPaths = @(
            "$env:SystemRoot\INF\setupapi.dev.log"
            "$env:SystemRoot\setupapi.log"
        )
        foreach ($logFile in $setupLogPaths) {
            if (-not (Test-Path $logFile)) { continue }

            $content = Get-Content -Path $logFile -Tail 5000 -ErrorAction SilentlyContinue
            $currentSection = $null
            $currentTimestamp = $null

            foreach ($line in $content) {
                if ($line -match '>>>\s+\[Device Install.*\]') {
                    $currentSection = $line
                }
                elseif ($line -match '>>>  Section start (\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})') {
                    $currentTimestamp = $Matches[1]
                }
                elseif ($line -match 'USB\\VID_([0-9A-Fa-f]{4})&PID_([0-9A-Fa-f]{4})') {
                    $usbEvents += @{
                        vendor_id  = $Matches[1]
                        product_id = $Matches[2]
                        timestamp  = $currentTimestamp
                        raw_line   = $line.Trim()
                    }
                }
            }
            break  # use first log found
        }
    }
    catch {
        Write-Verbose "Could not parse SetupAPI logs: $_"
    }

    # ---- Process Snapshot ----
    $processes = @()
    try {
        $procs = Get-Process -ErrorAction SilentlyContinue |
            Select-Object Id, ProcessName, Path, @{N='CPU_s';E={[math]::Round($_.CPU,2)}},
                          @{N='WorkingSet_MB';E={[math]::Round($_.WorkingSet64/1MB,1)}},
                          StartTime, Company

        $processes = @(foreach ($p in $procs) {
            @{
                pid             = $p.Id
                name            = $p.ProcessName
                path            = $p.Path
                cpu_seconds     = $p.CPU_s
                memory_mb       = $p.WorkingSet_MB
                start_time      = if ($p.StartTime) { $p.StartTime.ToUniversalTime().ToString('o') } else { $null }
                company         = $p.Company
            }
        })
    }
    catch {
        Write-Verbose "Could not collect process snapshot: $_"
    }

    return @{
        logon_events = $logonEvents
        usb_events   = $usbEvents
        processes    = $processes
    }
}
