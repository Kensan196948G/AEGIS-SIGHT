#Requires -Modules Pester
<#
.SYNOPSIS
    Pester tests for Test-Config.ps1 - configuration validation module.
.DESCRIPTION
    Tests the configuration validation logic including JSON parsing,
    required field checks, URL format validation, and default values.
#>

BeforeAll {
    $srcDir = Join-Path $PSScriptRoot '..' 'src'
    $configDir = Join-Path $PSScriptRoot '..' 'config'

    # We will invoke Test-Config.ps1 as a script (not dot-source) so we
    # capture the returned results object.
    $TestConfigScript = Join-Path $srcDir 'Test-Config.ps1'
}

Describe 'Test-Config.ps1 - Configuration Validation' {

    Context 'Valid configuration file' {
        BeforeAll {
            # Create a temp valid config
            $script:tempConfig = Join-Path $TestDrive 'agent-config.json'
            @{
                api_url                     = 'https://aegis-sight.example.com'
                collection_interval_minutes = 5
                buffer_db_path              = 'C:\ProgramData\AegisSight\buffer.db'
                log_path                    = 'C:\ProgramData\AegisSight\logs\agent.log'
                cert_thumbprint             = ''
                modules_enabled             = @{
                    hardware = $true
                    software = $true
                    logs     = $true
                    security = $true
                }
            } | ConvertTo-Json -Depth 5 | Set-Content -Path $script:tempConfig -Encoding utf8

            # Mock network calls to prevent real API hits
            Mock Invoke-WebRequest { throw [System.Net.WebException]::new('Test - no network') } -ModuleName Microsoft.PowerShell.Utility -ErrorAction SilentlyContinue
        }

        It 'returns a results hashtable' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $result | Should -BeOfType [hashtable]
        }

        It 'contains expected top-level keys' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $result.Keys | Should -Contain 'timestamp'
            $result.Keys | Should -Contain 'hostname'
            $result.Keys | Should -Contain 'overall'
            $result.Keys | Should -Contain 'checks'
        }

        It 'passes config file existence check' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $configCheck = $result.checks | Where-Object { $_.name -eq 'config_file' }
            $configCheck.status | Should -Be 'PASS'
        }

        It 'passes JSON parse check' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $parseCheck = $result.checks | Where-Object { $_.name -eq 'config_parse' }
            $parseCheck.status | Should -Be 'PASS'
        }

        It 'passes all required field checks' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $fieldChecks = $result.checks | Where-Object { $_.name -like 'field_*' }
            foreach ($check in $fieldChecks) {
                $check.status | Should -Be 'PASS' -Because "Field check $($check.name) should pass"
            }
        }

        It 'passes HTTPS URL format check' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $urlCheck = $result.checks | Where-Object { $_.name -eq 'api_url_format' }
            $urlCheck.status | Should -Be 'PASS'
        }

        It 'passes interval range check' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $intervalCheck = $result.checks | Where-Object { $_.name -eq 'interval_range' }
            $intervalCheck.status | Should -Be 'PASS'
        }

        It 'passes all module enabled checks' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $moduleChecks = $result.checks | Where-Object { $_.name -like 'module_*' }
            foreach ($check in $moduleChecks) {
                $check.status | Should -Be 'PASS' -Because "Module check $($check.name) should pass"
            }
        }

        It 'includes a summary with counts' {
            $result = & $TestConfigScript -ConfigPath $script:tempConfig
            $result.summary | Should -Not -BeNullOrEmpty
            $result.summary.total | Should -BeGreaterThan 0
            $result.summary.pass  | Should -BeGreaterThan 0
        }
    }

    Context 'Missing configuration file' {
        It 'fails with config_file FAIL status' {
            $result = & $TestConfigScript -ConfigPath 'C:\nonexistent\fake-config.json'
            $configCheck = $result.checks | Where-Object { $_.name -eq 'config_file' }
            $configCheck.status | Should -Be 'FAIL'
        }
    }

    Context 'Invalid JSON in configuration file' {
        BeforeAll {
            $script:badJsonConfig = Join-Path $TestDrive 'bad-config.json'
            'this is { not valid json !!!' | Set-Content -Path $script:badJsonConfig
        }

        It 'fails with config_parse FAIL status' {
            $result = & $TestConfigScript -ConfigPath $script:badJsonConfig
            $parseCheck = $result.checks | Where-Object { $_.name -eq 'config_parse' }
            $parseCheck.status | Should -Be 'FAIL'
        }
    }

    Context 'HTTP URL (not HTTPS)' {
        BeforeAll {
            $script:httpConfig = Join-Path $TestDrive 'http-config.json'
            @{
                api_url                     = 'http://aegis-sight.example.com'
                collection_interval_minutes = 5
                buffer_db_path              = 'C:\ProgramData\AegisSight\buffer.db'
                log_path                    = 'C:\ProgramData\AegisSight\logs\agent.log'
                cert_thumbprint             = ''
                modules_enabled             = @{
                    hardware = $true
                    software = $true
                    logs     = $true
                    security = $true
                }
            } | ConvertTo-Json -Depth 5 | Set-Content -Path $script:httpConfig -Encoding utf8
        }

        It 'warns about HTTP URL' {
            $result = & $TestConfigScript -ConfigPath $script:httpConfig
            $urlCheck = $result.checks | Where-Object { $_.name -eq 'api_url_format' }
            $urlCheck.status | Should -Be 'WARN'
        }
    }

    Context 'Aggressive polling interval' {
        BeforeAll {
            $script:aggressiveConfig = Join-Path $TestDrive 'aggressive-config.json'
            @{
                api_url                     = 'https://aegis-sight.example.com'
                collection_interval_minutes = 1
                buffer_db_path              = 'C:\ProgramData\AegisSight\buffer.db'
                log_path                    = 'C:\ProgramData\AegisSight\logs\agent.log'
                cert_thumbprint             = ''
                modules_enabled             = @{
                    hardware = $true
                    software = $true
                    logs     = $true
                    security = $true
                }
            } | ConvertTo-Json -Depth 5 | Set-Content -Path $script:aggressiveConfig -Encoding utf8
        }

        It 'warns about aggressive interval' {
            $result = & $TestConfigScript -ConfigPath $script:aggressiveConfig
            $intervalCheck = $result.checks | Where-Object { $_.name -eq 'interval_range' }
            $intervalCheck.status | Should -Be 'WARN'
        }
    }

    Context 'Disabled modules' {
        BeforeAll {
            $script:disabledConfig = Join-Path $TestDrive 'disabled-modules-config.json'
            @{
                api_url                     = 'https://aegis-sight.example.com'
                collection_interval_minutes = 5
                buffer_db_path              = 'C:\ProgramData\AegisSight\buffer.db'
                log_path                    = 'C:\ProgramData\AegisSight\logs\agent.log'
                cert_thumbprint             = ''
                modules_enabled             = @{
                    hardware = $true
                    software = $false
                    logs     = $true
                    security = $false
                }
            } | ConvertTo-Json -Depth 5 | Set-Content -Path $script:disabledConfig -Encoding utf8
        }

        It 'warns about disabled modules' {
            $result = & $TestConfigScript -ConfigPath $script:disabledConfig
            $softwareCheck = $result.checks | Where-Object { $_.name -eq 'module_software' }
            $softwareCheck.status | Should -Be 'WARN'

            $securityCheck = $result.checks | Where-Object { $_.name -eq 'module_security' }
            $securityCheck.status | Should -Be 'WARN'
        }

        It 'passes enabled module checks' {
            $result = & $TestConfigScript -ConfigPath $script:disabledConfig
            $hwCheck = $result.checks | Where-Object { $_.name -eq 'module_hardware' }
            $hwCheck.status | Should -Be 'PASS'
        }
    }

    Context 'Missing required fields' {
        BeforeAll {
            $script:incompleteConfig = Join-Path $TestDrive 'incomplete-config.json'
            @{
                api_url = 'https://aegis-sight.example.com'
                # Missing: collection_interval_minutes, buffer_db_path, log_path, modules_enabled
            } | ConvertTo-Json -Depth 5 | Set-Content -Path $script:incompleteConfig -Encoding utf8
        }

        It 'fails for missing fields' {
            $result = & $TestConfigScript -ConfigPath $script:incompleteConfig
            $result.overall | Should -Be 'FAIL'
        }
    }

    Context 'Report output' {
        BeforeAll {
            $script:validConfig = Join-Path $TestDrive 'valid-for-report.json'
            @{
                api_url                     = 'https://aegis-sight.example.com'
                collection_interval_minutes = 5
                buffer_db_path              = 'C:\ProgramData\AegisSight\buffer.db'
                log_path                    = 'C:\ProgramData\AegisSight\logs\agent.log'
                cert_thumbprint             = ''
                modules_enabled             = @{
                    hardware = $true
                    software = $true
                    logs     = $true
                    security = $true
                }
            } | ConvertTo-Json -Depth 5 | Set-Content -Path $script:validConfig -Encoding utf8
        }

        It 'writes report JSON to file when -ReportPath is specified' {
            $reportPath = Join-Path $TestDrive 'report.json'
            $null = & $TestConfigScript -ConfigPath $script:validConfig -ReportPath $reportPath
            Test-Path $reportPath | Should -BeTrue

            $reportContent = Get-Content $reportPath -Raw | ConvertFrom-Json
            $reportContent.hostname | Should -Not -BeNullOrEmpty
        }
    }
}

Describe 'Default configuration template' {
    BeforeAll {
        $templatePath = Join-Path $PSScriptRoot '..' 'config' 'agent-config.json'
    }

    It 'template file exists' {
        Test-Path $templatePath | Should -BeTrue
    }

    It 'template is valid JSON' {
        $content = Get-Content $templatePath -Raw
        { $content | ConvertFrom-Json } | Should -Not -Throw
    }

    It 'template contains all required fields' {
        $config = Get-Content $templatePath -Raw | ConvertFrom-Json
        $config.api_url | Should -Not -BeNullOrEmpty
        $config.collection_interval_minutes | Should -BeGreaterThan 0
        $config.buffer_db_path | Should -Not -BeNullOrEmpty
        $config.log_path | Should -Not -BeNullOrEmpty
        $config.modules_enabled | Should -Not -BeNullOrEmpty
    }

    It 'template has default interval of 5 minutes' {
        $config = Get-Content $templatePath -Raw | ConvertFrom-Json
        $config.collection_interval_minutes | Should -Be 5
    }

    It 'template enables all modules by default' {
        $config = Get-Content $templatePath -Raw | ConvertFrom-Json
        $config.modules_enabled.hardware | Should -BeTrue
        $config.modules_enabled.software | Should -BeTrue
        $config.modules_enabled.logs     | Should -BeTrue
        $config.modules_enabled.security | Should -BeTrue
    }
}
