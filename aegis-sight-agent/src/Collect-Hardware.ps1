#Requires -Version 5.1
<#
.SYNOPSIS
    Collects hardware inventory from the local machine.
.OUTPUTS
    [hashtable] with keys: system, processor, memory, disks, network, bios
#>

function Collect-Hardware {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param()

    # ---- Computer System ----
    $cs = Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction SilentlyContinue
    $system = @{
        hostname     = $cs.Name
        domain       = $cs.Domain
        manufacturer = $cs.Manufacturer
        model        = $cs.Model
        total_physical_memory_gb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
    }

    # ---- Processor ----
    $cpus = Get-CimInstance -ClassName Win32_Processor -ErrorAction SilentlyContinue
    $processor = @(foreach ($cpu in $cpus) {
        @{
            name                = $cpu.Name.Trim()
            cores               = $cpu.NumberOfCores
            logical_processors  = $cpu.NumberOfLogicalProcessors
            max_clock_speed_mhz = $cpu.MaxClockSpeed
            architecture        = switch ($cpu.Architecture) {
                0 { 'x86' }
                5 { 'ARM' }
                9 { 'x64' }
                12 { 'ARM64' }
                default { "Unknown ($($cpu.Architecture))" }
            }
        }
    })

    # ---- Physical Memory ----
    $dimms = Get-CimInstance -ClassName Win32_PhysicalMemory -ErrorAction SilentlyContinue
    $memory = @(foreach ($dimm in $dimms) {
        @{
            bank_label    = $dimm.BankLabel
            capacity_gb   = [math]::Round($dimm.Capacity / 1GB, 2)
            speed_mhz     = $dimm.Speed
            manufacturer  = $dimm.Manufacturer
            part_number   = ($dimm.PartNumber -replace '\s+$','')
        }
    })

    # ---- Logical Disks ----
    $lds = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue
    $disks = @(foreach ($ld in $lds) {
        @{
            device_id    = $ld.DeviceID
            volume_name  = $ld.VolumeName
            file_system  = $ld.FileSystem
            size_gb      = [math]::Round($ld.Size / 1GB, 2)
            free_space_gb = [math]::Round($ld.FreeSpace / 1GB, 2)
            percent_free = if ($ld.Size -gt 0) { [math]::Round(($ld.FreeSpace / $ld.Size) * 100, 1) } else { 0 }
        }
    })

    # ---- Network Adapters (IP-enabled only) ----
    $nics = Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction SilentlyContinue
    $network = @(foreach ($nic in $nics) {
        @{
            description   = $nic.Description
            mac_address   = $nic.MACAddress
            ip_addresses  = @($nic.IPAddress)
            subnets       = @($nic.IPSubnet)
            default_gateway = @($nic.DefaultIPGateway)
            dhcp_enabled  = $nic.DHCPEnabled
            dns_servers   = @($nic.DNSServerSearchOrder)
        }
    })

    # ---- BIOS ----
    $biosInfo = Get-CimInstance -ClassName Win32_BIOS -ErrorAction SilentlyContinue
    $bios = @{
        serial_number  = $biosInfo.SerialNumber
        manufacturer   = $biosInfo.Manufacturer
        version        = $biosInfo.SMBIOSBIOSVersion
        release_date   = if ($biosInfo.ReleaseDate) { $biosInfo.ReleaseDate.ToString('o') } else { $null }
    }

    return @{
        system    = $system
        processor = $processor
        memory    = $memory
        disks     = $disks
        network   = $network
        bios      = $bios
    }
}
