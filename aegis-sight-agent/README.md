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
    Test-Config.ps1          # Configuration validation & health-check
    Update-Agent.ps1         # Auto-updater with rollback support
  config/
    agent-config.json        # Configuration template
    prometheus-exporter.yml  # Prometheus Windows Exporter settings
  install/
    Install-Agent.ps1        # Automated installer
    Uninstall-Agent.ps1      # Automated uninstaller
  tests/
    AegisSightAgent.Tests.ps1  # Pester v5 unit tests
    Config.Tests.ps1           # Configuration validation tests
    Update.Tests.ps1           # Auto-updater tests
  version.json               # Agent version metadata
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

## Configuration Validation

Before deploying the agent, validate the configuration using `Test-Config.ps1`:

```powershell
.\src\Test-Config.ps1
```

This performs the following checks:

| Check | Description |
|-------|-------------|
| Config file | Existence and JSON validity |
| Required fields | `api_url`, `collection_interval_minutes`, `buffer_db_path`, `log_path`, `modules_enabled` |
| URL format | Verifies HTTPS is used (warns on plain HTTP) |
| API connectivity | Attempts `GET /api/v1/health` |
| Certificate | Locates cert in `Cert:\LocalMachine\My` and checks expiry (warns at 30 days) |
| Buffer DB | Checks directory existence and file size |
| Log directory | Verifies the log output directory exists |

Export the report as JSON for automation:

```powershell
.\src\Test-Config.ps1 -ReportPath "C:\temp\config-report.json"
```

Each check returns `PASS`, `WARN`, or `FAIL`. The overall result is `PASS` only if all checks pass.

## Auto-Update

The agent supports automatic updates via `Update-Agent.ps1`:

```powershell
.\src\Update-Agent.ps1
```

The update process:

1. **Version check** - Queries `GET /api/v1/agent/version` for the latest release
2. **Download** - Fetches the update package and verifies its SHA-256 checksum
3. **Backup** - Creates a timestamped backup of the current installation
4. **Apply** - Stops the scheduled task, extracts new files, and replaces the current version
5. **Verify** - Runs a syntax check on the updated scripts
6. **Task re-registration** - Re-registers the Windows Scheduled Task with the same settings
7. **Rollback** - If verification fails, automatically restores from the backup

Force a reinstall of the current version:

```powershell
.\src\Update-Agent.ps1 -Force
```

Version metadata is stored in `version.json` at the agent root:

```json
{
  "current_version": "1.1.0",
  "minimum_api_version": "1.0.0",
  "release_date": "2026-03-27"
}
```

## Prometheus Windows Exporter

The agent ships with a configuration file for [Prometheus Windows Exporter](https://github.com/prometheus-community/windows_exporter) at `config/prometheus-exporter.yml`. This exposes system metrics on port **9182** for Prometheus scraping.

Collected metric categories:

| Collector | Metrics |
|-----------|---------|
| `cpu` | Per-core usage, idle, interrupt, DPC, privileged time |
| `memory` | Available bytes, committed bytes, cache, page faults |
| `logical_disk` | Read/write bytes, IOPS, free space, queue length |
| `net` | Bytes sent/received, packets, errors, drops |
| `service` | State and start mode for monitored Windows services |
| `process` | CPU, memory, handle count, thread count per process |

Start the exporter with the config:

```powershell
windows_exporter.exe --config.file="C:\Program Files\AegisSight\config\prometheus-exporter.yml"
```

## Troubleshooting

### Agent does not send telemetry

1. Run `.\src\Test-Config.ps1` and check for FAIL results
2. Verify the API URL is reachable: `Invoke-WebRequest -Uri "https://your-api/api/v1/health"`
3. Check the agent log at the path specified in `agent-config.json` (default: `C:\ProgramData\AegisSight\logs\agent.log`)
4. Ensure the scheduled task is registered: `Get-ScheduledTask -TaskName AegisSightAgent`

### Certificate authentication fails

1. Verify the certificate exists: `Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq '<your-thumbprint>' }`
2. Check expiry: `.\src\Test-Config.ps1` will warn if the cert expires within 30 days
3. Ensure the private key is accessible to the SYSTEM account

### Buffer database grows too large

1. Check size: `(Get-Item "C:\ProgramData\AegisSight\buffer.db").Length / 1MB`
2. If the API is reachable, the agent flushes buffered payloads automatically each cycle
3. Manually clear: `Remove-Item "C:\ProgramData\AegisSight\buffer.db"` (payloads will be lost)

### Update fails or agent breaks after update

1. Check the backup directory (named `backup-<version>-<timestamp>`) under the install dir
2. Manually restore: `Copy-Item -Path "backup-*\src\*" -Destination ".\src\" -Recurse -Force`
3. Re-register the scheduled task: `.\install\Install-Agent.ps1 -ApiUrl "https://your-api"`

### Prometheus exporter not responding

1. Verify the exporter process is running: `Get-Process windows_exporter -ErrorAction SilentlyContinue`
2. Check port 9182: `Test-NetConnection -ComputerName localhost -Port 9182`
3. Review exporter logs at `C:\ProgramData\AegisSight\logs\windows-exporter.log`
4. Ensure Windows Firewall allows inbound TCP 9182

## Collected Data

| Module   | Data Points                                                       |
|----------|-------------------------------------------------------------------|
| Hardware | Hostname, CPU, RAM, disks, NICs (IP/MAC), BIOS serial            |
| Software | Installed applications (name, version, publisher, install date)   |
| Logs     | Logon/logoff events, USB connections, running processes           |
| Security | Defender status, BitLocker, hotfixes, firewall profile settings   |
