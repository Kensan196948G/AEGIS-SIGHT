#Requires -Version 5.1
<#
.SYNOPSIS
    Obtains a JWT access token from the AEGIS-SIGHT API using device certificate authentication.
.OUTPUTS
    [string] JWT token
#>

function Get-AuthToken {
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory)][string]$ApiUrl,
        [string]$CertThumbprint,
        [string]$CertStorePath = 'Cert:\LocalMachine\My'
    )

    $endpoint = "$($ApiUrl.TrimEnd('/'))/api/v1/auth/device-token"

    # ---- Locate device certificate ----
    $cert = $null
    if ($CertThumbprint) {
        $cert = Get-Item -Path "$CertStorePath\$CertThumbprint" -ErrorAction SilentlyContinue
    }

    if (-not $cert) {
        # Auto-discover: look for a cert with a Subject CN matching the hostname
        $hostname = $env:COMPUTERNAME
        $cert = Get-ChildItem -Path $CertStorePath -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Subject -match "CN=$hostname" -and
                $_.NotAfter -gt (Get-Date) -and
                $_.HasPrivateKey
            } |
            Sort-Object NotAfter -Descending |
            Select-Object -First 1
    }

    # ---- Build request body ----
    $body = @{
        hostname     = $env:COMPUTERNAME
        domain       = $env:USERDNSDOMAIN
        os_version   = [System.Environment]::OSVersion.VersionString
        agent_version = '1.0.0'
    }

    if ($cert) {
        # Include certificate thumbprint for server-side validation
        $body['cert_thumbprint'] = $cert.Thumbprint
        $body['cert_subject']    = $cert.Subject

        # Sign the hostname with the private key for proof-of-possession
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($env:COMPUTERNAME)
        try {
            $rsa = $cert.PrivateKey
            $signature = $rsa.SignData($bytes, [System.Security.Cryptography.HashAlgorithmName]::SHA256,
                                       [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
            $body['signature'] = [Convert]::ToBase64String($signature)
        }
        catch {
            Write-Verbose "Could not sign with device certificate: $_"
        }
    }

    $jsonBody = $body | ConvertTo-Json -Compress

    # ---- Request token ----
    try {
        $headers = @{
            'Content-Type' = 'application/json'
            'User-Agent'   = 'AegisSight-Agent/1.0'
        }

        $response = Invoke-RestMethod -Uri $endpoint `
                                      -Method Post `
                                      -Headers $headers `
                                      -Body $jsonBody `
                                      -TimeoutSec 30 `
                                      -ErrorAction Stop

        if (-not $response.token) {
            throw "API response did not contain a token"
        }

        return $response.token
    }
    catch {
        throw "Authentication failed: $($_.Exception.Message)"
    }
}
