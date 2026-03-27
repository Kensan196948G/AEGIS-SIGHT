#Requires -Modules Pester
<#
.SYNOPSIS
    Pester tests for the AEGIS-SIGHT Agent modules.
.DESCRIPTION
    Uses Pester v5 mocking to test Collect-Hardware, Collect-Software,
    and Send-Telemetry without requiring real Windows CIM/API access.
#>

BeforeAll {
    $srcDir = Join-Path $PSScriptRoot '..' 'src'
    . "$srcDir\Collect-Hardware.ps1"
    . "$srcDir\Collect-Software.ps1"
    . "$srcDir\Send-Telemetry.ps1"
}

Describe 'Collect-Hardware' {
    BeforeAll {
        # Mock all CIM calls with representative data
        Mock Get-CimInstance {
            switch ($ClassName) {
                'Win32_ComputerSystem' {
                    [PSCustomObject]@{
                        Name                = 'TESTPC01'
                        Domain              = 'corp.example.com'
                        Manufacturer        = 'Dell Inc.'
                        Model               = 'Latitude 5520'
                        TotalPhysicalMemory = 17179869184  # 16 GB
                    }
                }
                'Win32_Processor' {
                    @([PSCustomObject]@{
                        Name                     = 'Intel Core i7-1165G7'
                        NumberOfCores            = 4
                        NumberOfLogicalProcessors = 8
                        MaxClockSpeed            = 2800
                        Architecture             = 9
                    })
                }
                'Win32_PhysicalMemory' {
                    @([PSCustomObject]@{
                        BankLabel    = 'BANK 0'
                        Capacity     = 8589934592  # 8 GB
                        Speed        = 3200
                        Manufacturer = 'Samsung'
                        PartNumber   = 'M471A1G44AB0-CWE  '
                    })
                }
                'Win32_LogicalDisk' {
                    @([PSCustomObject]@{
                        DeviceID   = 'C:'
                        VolumeName = 'System'
                        FileSystem = 'NTFS'
                        Size       = 512110190592   # ~477 GB
                        FreeSpace  = 214748364800   # ~200 GB
                    })
                }
                'Win32_NetworkAdapterConfiguration' {
                    @([PSCustomObject]@{
                        Description          = 'Intel Ethernet I219-LM'
                        MACAddress           = 'AA:BB:CC:DD:EE:FF'
                        IPAddress            = @('192.168.1.100', 'fe80::1')
                        IPSubnet             = @('255.255.255.0', '64')
                        DefaultIPGateway     = @('192.168.1.1')
                        DHCPEnabled          = $true
                        DNSServerSearchOrder = @('8.8.8.8', '8.8.4.4')
                    })
                }
                'Win32_BIOS' {
                    [PSCustomObject]@{
                        SerialNumber     = 'ABC1234XYZ'
                        Manufacturer     = 'Dell Inc.'
                        SMBIOSBIOSVersion = '1.12.0'
                        ReleaseDate      = [datetime]'2023-06-15'
                    }
                }
            }
        }
    }

    It 'returns a hashtable with all expected keys' {
        $result = Collect-Hardware
        $result | Should -BeOfType [hashtable]
        $result.Keys | Should -Contain 'system'
        $result.Keys | Should -Contain 'processor'
        $result.Keys | Should -Contain 'memory'
        $result.Keys | Should -Contain 'disks'
        $result.Keys | Should -Contain 'network'
        $result.Keys | Should -Contain 'bios'
    }

    It 'returns correct hostname from system info' {
        $result = Collect-Hardware
        $result.system.hostname | Should -Be 'TESTPC01'
    }

    It 'returns correct manufacturer and model' {
        $result = Collect-Hardware
        $result.system.manufacturer | Should -Be 'Dell Inc.'
        $result.system.model | Should -Be 'Latitude 5520'
    }

    It 'calculates total memory in GB' {
        $result = Collect-Hardware
        $result.system.total_physical_memory_gb | Should -Be 16
    }

    It 'parses processor information' {
        $result = Collect-Hardware
        $result.processor | Should -HaveCount 1
        $result.processor[0].cores | Should -Be 4
        $result.processor[0].logical_processors | Should -Be 8
        $result.processor[0].architecture | Should -Be 'x64'
    }

    It 'calculates disk free space percentage' {
        $result = Collect-Hardware
        $result.disks | Should -HaveCount 1
        $result.disks[0].device_id | Should -Be 'C:'
        $result.disks[0].percent_free | Should -BeGreaterThan 0
    }

    It 'parses BIOS serial number' {
        $result = Collect-Hardware
        $result.bios.serial_number | Should -Be 'ABC1234XYZ'
    }

    It 'parses network adapter info' {
        $result = Collect-Hardware
        $result.network | Should -HaveCount 1
        $result.network[0].mac_address | Should -Be 'AA:BB:CC:DD:EE:FF'
        $result.network[0].dhcp_enabled | Should -BeTrue
    }
}

Describe 'Collect-Software' {
    BeforeAll {
        Mock Get-ItemProperty {
            @(
                [PSCustomObject]@{
                    DisplayName     = 'Mozilla Firefox'
                    DisplayVersion  = '120.0.1'
                    Publisher       = 'Mozilla'
                    InstallDate     = '20231215'
                    InstallLocation = 'C:\Program Files\Mozilla Firefox'
                    UninstallString = 'C:\Program Files\Mozilla Firefox\uninstall.exe'
                },
                [PSCustomObject]@{
                    DisplayName     = 'Visual Studio Code'
                    DisplayVersion  = '1.85.0'
                    Publisher       = 'Microsoft Corporation'
                    InstallDate     = '20231201'
                    InstallLocation = 'C:\Program Files\Microsoft VS Code'
                    UninstallString = 'C:\Program Files\Microsoft VS Code\unins000.exe'
                },
                [PSCustomObject]@{
                    DisplayName     = $null  # should be filtered out
                    DisplayVersion  = '1.0'
                    Publisher       = 'Unknown'
                    InstallDate     = $null
                    InstallLocation = $null
                    UninstallString = $null
                }
            )
        }
    }

    It 'returns a hashtable with installed_applications key' {
        $result = Collect-Software
        $result | Should -BeOfType [hashtable]
        $result.Keys | Should -Contain 'installed_applications'
        $result.Keys | Should -Contain 'total_count'
    }

    It 'filters out entries without DisplayName' {
        $result = Collect-Software
        $result.installed_applications | ForEach-Object {
            $_['name'] | Should -Not -BeNullOrEmpty
        }
    }

    It 'parses install date correctly' {
        $result = Collect-Software
        $firefox = $result.installed_applications | Where-Object { $_['name'] -eq 'Mozilla Firefox' }
        $firefox['install_date'] | Should -Be '2023-12-15'
    }

    It 'deduplicates entries from 64-bit and 32-bit registry paths' {
        # Both registry paths return the same data in our mock, so dedup should apply
        $result = Collect-Software
        $names = $result.installed_applications | ForEach-Object { $_['name'] }
        $uniqueNames = $names | Select-Object -Unique
        $names.Count | Should -Be $uniqueNames.Count
    }

    It 'returns a total_count matching the array length' {
        $result = Collect-Software
        $result.total_count | Should -Be $result.installed_applications.Count
    }
}

Describe 'Send-Telemetry' {
    Context 'Successful API call' {
        BeforeAll {
            Mock Invoke-RestMethod {
                [PSCustomObject]@{ status = 'ok'; id = 'telem-12345' }
            }
            Mock Test-Path { $false }  # no buffer DB
            Mock Send-BufferedPayloads {}
        }

        It 'returns Success = true on HTTP 200' {
            $result = Send-Telemetry -ApiUrl 'https://api.example.com' `
                                     -Token 'test-jwt-token' `
                                     -Payload @{ test = 'data' } `
                                     -BufferDbPath 'TestDrive:\buffer.db'
            $result.Success | Should -BeTrue
        }

        It 'includes Bearer token in request headers' {
            Send-Telemetry -ApiUrl 'https://api.example.com' `
                           -Token 'my-jwt' `
                           -Payload @{ test = 'data' } `
                           -BufferDbPath 'TestDrive:\buffer.db'

            Should -Invoke Invoke-RestMethod -ParameterFilter {
                $Headers['Authorization'] -eq 'Bearer my-jwt'
            }
        }

        It 'sends to /api/v1/telemetry endpoint' {
            Send-Telemetry -ApiUrl 'https://api.example.com' `
                           -Token 'tok' `
                           -Payload @{ x = 1 } `
                           -BufferDbPath 'TestDrive:\buffer.db'

            Should -Invoke Invoke-RestMethod -ParameterFilter {
                $Uri -eq 'https://api.example.com/api/v1/telemetry'
            }
        }
    }

    Context 'API failure with retry and buffer' {
        BeforeAll {
            $script:callCount = 0
            Mock Invoke-RestMethod {
                $script:callCount++
                throw [System.Net.WebException]::new('Connection refused')
            }
            Mock Start-Sleep {}  # skip actual waits
            Mock Test-Path { $false }
            Mock Send-BufferedPayloads {}
            Mock Save-ToBuffer {}
        }

        It 'retries up to 3 times then buffers' {
            $result = Send-Telemetry -ApiUrl 'https://api.example.com' `
                                     -Token 'tok' `
                                     -Payload @{ x = 1 } `
                                     -BufferDbPath 'TestDrive:\buffer.db'

            $result.Success | Should -BeFalse
            $result.Error | Should -BeLike '*buffered*'

            # 1 initial + 3 retries = 4 calls
            Should -Invoke Invoke-RestMethod -Times 4
            Should -Invoke Save-ToBuffer -Times 1
        }
    }
}
