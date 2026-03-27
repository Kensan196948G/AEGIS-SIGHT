# AEGIS-SIGHT Agent

Windows endpoint agent for the AEGIS-SIGHT IT asset management platform.
Collects hardware, software, log, and security telemetry and sends it to the central API.

## Architecture

```
aegis-sight-agent/
  src/
    AegisSightAgent.ps1     # Entry point
    Get-AuthToken.ps1        # JWT authentication
    Collect-Hardware.ps1     # HW inventory (CIM)
    Collect-Software.ps1     # Installed apps (registry)
    Collect-Logs.ps1         # Logon events, USB, processes
    Collect-Security.ps1     # Defender, BitLocker, FW, updates
    Send-Telemetry.ps1       # API POST with retry & offline buffer
  config/
    agent-config.json        # Configuration template
  install/
    Install-Agent.ps1        # Automated installer
    Uninstall-Agent.ps1      # Automated uninstaller
  tests/
    AegisSightAgent.Tests.ps1  # Pester v5 unit tests
```

## Requirements

- Windows 10 / 11 or Windows Server 2016+
- PowerShell 5.1 or later
- Administrator privileges (for CIM queries, event log access, BitLocker status)
- Network access to the AEGIS-SIGHT API endpoint

## Installation

Run from an elevated PowerShell prompt:

```powershell
.\install\Install-Agent.ps1 -ApiUrl "https://aegis-sight.your-domain.com"
```

Options:

| Parameter          | Default                          | Description                    |
|--------------------|----------------------------------|--------------------------------|
| `-InstallDir`      | `C:\Program Files\AegisSight`   | Installation directory         |
| `-ApiUrl`          | *(required)*                     | API base URL                   |
| `-IntervalMinutes` | `5`                              | Collection interval in minutes |

The installer will:

1. Copy agent files to the installation directory
2. Generate `agent-config.json` with the provided settings
3. Register a Windows Scheduled Task (`AegisSightAgent`) running as SYSTEM
4. Trigger an initial collection

## Uninstallation

```powershell
.\install\Uninstall-Agent.ps1 -RemoveFiles -RemoveData
```

| Flag            | Effect                                |
|-----------------|---------------------------------------|
| `-RemoveFiles`  | Deletes agent source and config files |
| `-RemoveData`   | Deletes buffer DB and log files       |

## Configuration

Edit `config/agent-config.json`:

```json
{
  "api_url": "https://aegis-sight.example.com",
  "collection_interval_minutes": 5,
  "buffer_db_path": "C:\\ProgramData\\AegisSight\\buffer.db",
  "log_path": "C:\\ProgramData\\AegisSight\\logs\\agent.log",
  "cert_thumbprint": "",
  "modules_enabled": {
    "hardware": true,
    "software": true,
    "logs": true,
    "security": true
  }
}
```

Disable any module by setting it to `false`.

## Authentication

The agent authenticates using device certificate-based JWT:

1. Agent locates a certificate in `Cert:\LocalMachine\My` matching the hostname
2. Signs a proof-of-possession challenge with the certificate private key
3. Sends `POST /api/v1/auth/device-token` with hostname, certificate thumbprint, and signature
4. Receives a JWT token used for subsequent API calls

## Offline Resilience

When the API is unreachable, payloads are stored in a local SQLite database (or `.jsonl` fallback). On the next successful run, buffered payloads are flushed before the current payload is sent.

## Testing

Install [Pester v5](https://pester.dev/) and run:

```powershell
Invoke-Pester -Path .\tests\AegisSightAgent.Tests.ps1 -Output Detailed
```

## Collected Data

| Module   | Data Points                                                       |
|----------|-------------------------------------------------------------------|
| Hardware | Hostname, CPU, RAM, disks, NICs (IP/MAC), BIOS serial            |
| Software | Installed applications (name, version, publisher, install date)   |
| Logs     | Logon/logoff events, USB connections, running processes           |
| Security | Defender status, BitLocker, hotfixes, firewall profile settings   |
