#Requires -Version 5.1
<#
.SYNOPSIS
    Collects security posture information from the local machine.
.DESCRIPTION
    - Windows Defender status
    - BitLocker encryption status
    - Windows Update / hotfix history
    - Firewall profile status
.OUTPUTS
    [hashtable] with keys: defender, bitlocker, hotfixes, firewall
#>

function Collect-Security {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param()

    # ---- Windows Defender ----
    $defender = @{ available = $false }
    try {
        $mp = Get-MpComputerStatus -ErrorAction Stop
        $defender = @{
            available                    = $true
            antivirus_enabled            = $mp.AntivirusEnabled
            realtime_protection_enabled  = $mp.RealTimeProtectionEnabled
            antispyware_enabled          = $mp.AntispywareEnabled
            behavior_monitor_enabled     = $mp.BehaviorMonitorEnabled
            ioav_protection_enabled      = $mp.IoavProtectionEnabled
            nis_enabled                  = $mp.NISEnabled
            on_access_protection_enabled = $mp.OnAccessProtectionEnabled
            signature_last_updated       = if ($mp.AntivirusSignatureLastUpdated) {
                                               $mp.AntivirusSignatureLastUpdated.ToUniversalTime().ToString('o')
                                           } else { $null }
            signature_version            = $mp.AntivirusSignatureVersion
            engine_version               = $mp.AMEngineVersion
            full_scan_age_days           = $mp.FullScanAge
            quick_scan_age_days          = $mp.QuickScanAge
        }
    }
    catch {
        Write-Verbose "Windows Defender status unavailable: $_"
    }

    # ---- BitLocker ----
    $bitlocker = @()
    try {
        $volumes = Get-BitLockerVolume -ErrorAction Stop
        $bitlocker = @(foreach ($vol in $volumes) {
            @{
                mount_point       = $vol.MountPoint
                volume_status     = $vol.VolumeStatus.ToString()
                protection_status = $vol.ProtectionStatus.ToString()
                encryption_method = $vol.EncryptionMethod.ToString()
                encryption_percentage = $vol.EncryptionPercentage
                lock_status       = $vol.LockStatus.ToString()
                key_protectors    = @($vol.KeyProtector | ForEach-Object { $_.KeyProtectorType.ToString() })
            }
        })
    }
    catch {
        Write-Verbose "BitLocker status unavailable: $_"
    }

    # ---- Hotfixes / Windows Update ----
    $hotfixes = @()
    try {
        $hf = Get-HotFix -ErrorAction SilentlyContinue |
            Sort-Object InstalledOn -Descending |
            Select-Object -First 50

        $hotfixes = @(foreach ($h in $hf) {
            @{
                hotfix_id    = $h.HotFixID
                description  = $h.Description
                installed_on = if ($h.InstalledOn) { $h.InstalledOn.ToString('yyyy-MM-dd') } else { $null }
                installed_by = $h.InstalledBy
            }
        })
    }
    catch {
        Write-Verbose "Could not collect hotfix info: $_"
    }

    # ---- Firewall ----
    $firewall = @()
    try {
        $profiles = Get-NetFirewallProfile -ErrorAction Stop
        $firewall = @(foreach ($fp in $profiles) {
            @{
                profile   = $fp.Name
                enabled   = $fp.Enabled
                default_inbound_action  = $fp.DefaultInboundAction.ToString()
                default_outbound_action = $fp.DefaultOutboundAction.ToString()
                log_allowed  = $fp.LogAllowed
                log_blocked  = $fp.LogBlocked
                log_file     = $fp.LogFileName
            }
        })
    }
    catch {
        Write-Verbose "Firewall status unavailable: $_"
    }

    return @{
        defender  = $defender
        bitlocker = $bitlocker
        hotfixes  = $hotfixes
        firewall  = $firewall
    }
}
