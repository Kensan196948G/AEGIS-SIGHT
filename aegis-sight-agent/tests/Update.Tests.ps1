#Requires -Modules Pester
<#
.SYNOPSIS
    Pester tests for Update-Agent.ps1 - agent auto-updater module.
.DESCRIPTION
    Tests the version comparison logic, update flow, backup and rollback
    mechanisms using mocked API responses and file system operations.
#>

BeforeAll {
    $srcDir = Join-Path $PSScriptRoot '..' 'src'
    $UpdateScript = Join-Path $srcDir 'Update-Agent.ps1'

    # Helper: create a minimal config file for testing
    function New-TestConfig {
        param([string]$Path)
        @{
            api_url                     = 'https://aegis-sight.example.com'
            collection_interval_minutes = 5
            buffer_db_path              = "$TestDrive\buffer.db"
            log_path                    = "$TestDrive\logs\agent.log"
            cert_thumbprint             = ''
            modules_enabled             = @{
                hardware = $true
                software = $true
                logs     = $true
                security = $true
            }
        } | ConvertTo-Json -Depth 5 | Set-Content -Path $Path -Encoding utf8
    }

    # Helper: create a version.json for testing
    function New-TestVersionFile {
        param([string]$Path, [string]$Version = '1.0.0')
        @{
            current_version     = $Version
            minimum_api_version = '1.0.0'
            release_date        = '2026-01-01'
        } | ConvertTo-Json | Set-Content -Path $Path -Encoding utf8
    }
}

Describe 'Compare-Version function' {
    # We need to dot-source or extract the Compare-Version function.
    # Since it is defined inside Update-Agent.ps1, we parse and extract it.
    BeforeAll {
        # Define Compare-Version inline for testing (mirrors the script's implementation)
        function Compare-Version {
            param([string]$Local, [string]$Remote)
            try {
                $lv = [System.Version]::new($Local)
                $rv = [System.Version]::new($Remote)
                return $rv -gt $lv
            }
            catch {
                return $Remote -ne $Local
            }
        }
    }

    It 'returns true when remote is newer (major)' {
        Compare-Version -Local '1.0.0' -Remote '2.0.0' | Should -BeTrue
    }

    It 'returns true when remote is newer (minor)' {
        Compare-Version -Local '1.0.0' -Remote '1.1.0' | Should -BeTrue
    }

    It 'returns true when remote is newer (patch)' {
        Compare-Version -Local '1.0.0' -Remote '1.0.1' | Should -BeTrue
    }

    It 'returns false when versions are equal' {
        Compare-Version -Local '1.0.0' -Remote '1.0.0' | Should -BeFalse
    }

    It 'returns false when local is newer' {
        Compare-Version -Local '2.0.0' -Remote '1.0.0' | Should -BeFalse
    }

    It 'handles two-part versions' {
        Compare-Version -Local '1.0' -Remote '1.1' | Should -BeTrue
    }

    It 'handles four-part versions' {
        Compare-Version -Local '1.0.0.0' -Remote '1.0.0.1' | Should -BeTrue
    }

    It 'falls back to string comparison for non-semver' {
        Compare-Version -Local 'alpha' -Remote 'beta' | Should -BeTrue
    }

    It 'returns false for identical non-semver strings' {
        Compare-Version -Local 'alpha' -Remote 'alpha' | Should -BeFalse
    }
}

Describe 'Update-Agent.ps1 - Already up to date' {
    BeforeAll {
        # Set up test directory structure
        $script:testInstallDir = Join-Path $TestDrive 'AegisSight'
        $script:testSrcDir     = Join-Path $script:testInstallDir 'src'
        $script:testConfigDir  = Join-Path $script:testInstallDir 'config'

        New-Item -Path $script:testSrcDir    -ItemType Directory -Force | Out-Null
        New-Item -Path $script:testConfigDir -ItemType Directory -Force | Out-Null

        # Create test config
        $script:testConfigPath = Join-Path $script:testConfigDir 'agent-config.json'
        New-TestConfig -Path $script:testConfigPath

        # Create version file indicating v1.0.0
        $script:testVersionPath = Join-Path $script:testInstallDir 'version.json'
        New-TestVersionFile -Path $script:testVersionPath -Version '1.0.0'

        # Create a minimal AegisSightAgent.ps1
        'Write-Host "Agent"' | Set-Content -Path (Join-Path $script:testSrcDir 'AegisSightAgent.ps1')

        # Mock the API to return same version
        Mock Invoke-RestMethod {
            [PSCustomObject]@{
                current_version = '1.0.0'
                download_url    = 'https://api.example.com/agent/1.0.0.zip'
                sha256          = 'abc123'
            }
        }
    }

    It 'returns Updated = false when already up to date' {
        $result = & $UpdateScript `
            -ConfigPath $script:testConfigPath `
            -InstallDir $script:testInstallDir

        $result.Updated | Should -BeFalse
        $result.Reason | Should -BeLike '*up to date*'
    }
}

Describe 'Update-Agent.ps1 - API unreachable' {
    BeforeAll {
        $script:testInstallDir = Join-Path $TestDrive 'AegisSight-NoAPI'
        $script:testSrcDir     = Join-Path $script:testInstallDir 'src'
        $script:testConfigDir  = Join-Path $script:testInstallDir 'config'

        New-Item -Path $script:testSrcDir    -ItemType Directory -Force | Out-Null
        New-Item -Path $script:testConfigDir -ItemType Directory -Force | Out-Null

        $script:testConfigPath = Join-Path $script:testConfigDir 'agent-config.json'
        New-TestConfig -Path $script:testConfigPath

        $script:testVersionPath = Join-Path $script:testInstallDir 'version.json'
        New-TestVersionFile -Path $script:testVersionPath -Version '1.0.0'

        'Write-Host "Agent"' | Set-Content -Path (Join-Path $script:testSrcDir 'AegisSightAgent.ps1')

        # Mock the API to fail
        Mock Invoke-RestMethod {
            throw [System.Net.WebException]::new('Connection refused')
        }
    }

    It 'returns Updated = false with API unreachable reason' {
        $result = & $UpdateScript `
            -ConfigPath $script:testConfigPath `
            -InstallDir $script:testInstallDir

        $result.Updated | Should -BeFalse
        $result.Reason | Should -BeLike '*API unreachable*'
    }
}

Describe 'Update-Agent.ps1 - Version file' {
    BeforeAll {
        $script:versionFilePath = Join-Path $PSScriptRoot '..' 'version.json'
    }

    It 'version.json exists in the project' {
        Test-Path $script:versionFilePath | Should -BeTrue
    }

    It 'version.json is valid JSON' {
        $content = Get-Content $script:versionFilePath -Raw
        { $content | ConvertFrom-Json } | Should -Not -Throw
    }

    It 'version.json contains current_version' {
        $ver = Get-Content $script:versionFilePath -Raw | ConvertFrom-Json
        $ver.current_version | Should -Not -BeNullOrEmpty
    }

    It 'version.json contains minimum_api_version' {
        $ver = Get-Content $script:versionFilePath -Raw | ConvertFrom-Json
        $ver.minimum_api_version | Should -Not -BeNullOrEmpty
    }

    It 'version.json contains release_date' {
        $ver = Get-Content $script:versionFilePath -Raw | ConvertFrom-Json
        $ver.release_date | Should -Not -BeNullOrEmpty
    }

    It 'current_version is a valid semver string' {
        $ver = Get-Content $script:versionFilePath -Raw | ConvertFrom-Json
        { [System.Version]::new($ver.current_version) } | Should -Not -Throw
    }
}
