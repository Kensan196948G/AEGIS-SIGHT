#Requires -Version 5.1
<#
.SYNOPSIS
    Collects installed software inventory from the Windows registry.
.OUTPUTS
    [hashtable] with key: installed_applications (array of app objects)
#>

function Collect-Software {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param()

    $registryPaths = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )

    $seen = @{}
    $applications = [System.Collections.ArrayList]::new()

    foreach ($path in $registryPaths) {
        try {
            $entries = Get-ItemProperty -Path $path -ErrorAction SilentlyContinue |
                Where-Object { $_.DisplayName -and $_.DisplayName.Trim() -ne '' }
        }
        catch {
            continue
        }

        foreach ($entry in $entries) {
            $name = $entry.DisplayName.Trim()
            $version = if ($entry.DisplayVersion) { $entry.DisplayVersion.Trim() } else { '' }
            $dedup = "$name|$version"

            if ($seen.ContainsKey($dedup)) { continue }
            $seen[$dedup] = $true

            $installDate = $null
            if ($entry.InstallDate -and $entry.InstallDate -match '^\d{8}$') {
                try {
                    $installDate = [datetime]::ParseExact($entry.InstallDate, 'yyyyMMdd', $null).ToString('yyyy-MM-dd')
                }
                catch { }
            }

            [void]$applications.Add(@{
                name          = $name
                version       = $version
                publisher     = if ($entry.Publisher) { $entry.Publisher.Trim() } else { '' }
                install_date  = $installDate
                install_location = if ($entry.InstallLocation) { $entry.InstallLocation.Trim() } else { '' }
                uninstall_string = if ($entry.UninstallString) { $entry.UninstallString.Trim() } else { '' }
                architecture  = if ($path -like '*WOW6432Node*') { 'x86' } else { 'x64' }
            })
        }
    }

    # Sort by name for consistent output
    $sorted = $applications | Sort-Object { $_['name'] }

    return @{
        installed_applications = @($sorted)
        total_count            = $sorted.Count
    }
}
