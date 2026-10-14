[CmdletBinding()]
param(
  [string]$HostName = '207.180.248.95',
  [string]$User = 'root',
  [string]$KeyPath = "$env:USERPROFILE\.ssh\osgard_contabo",
  [string]$Archive = 'osgard-world-release.tgz',
  [ValidateRange(4096, 4194304)][int]$ChunkBytes = 65536,
  [ValidateRange(1, 10)][int]$Retries = 4,
  [string]$HealthUrl = 'https://osgard.world/',
  [switch]$PreflightOnly,
  [switch]$Activate
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-CheckedNative {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )
  $output = & $Executable @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = (@($output) | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
  if ($exitCode -ne 0) { throw "$Executable exited with code $exitCode. $text" }
  return $text
}

if ($Archive -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,95}\.tgz$' -or $Archive.Contains('..')) {
  throw "Archive must be a simple .tgz filename, not a path: $Archive"
}
if ($HostName -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$') { throw 'HostName must be a DNS name or IPv4 address.' }
if ($User -notmatch '^[A-Za-z_][A-Za-z0-9_-]{0,31}$') { throw 'User contains unsupported characters.' }
if ($HealthUrl -notmatch '^https?://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:/[A-Za-z0-9._~/?=&%-]*)?$') {
  throw 'HealthUrl must be an HTTP(S) URL containing only safe URL characters.'
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $root 'dist'
$archivePath = Join-Path $root $Archive
$chunkDir = Join-Path $root '.publish-chunks'
if (!(Test-Path -LiteralPath (Join-Path $dist 'index.html') -PathType Leaf)) {
  throw "Build dist first: missing $(Join-Path $dist 'index.html')"
}

# Build and validate the exact artifact before making any network connection.
$null = Invoke-CheckedNative 'tar' @('-czf', $archivePath, '-C', $dist, '.')
$listingText = Invoke-CheckedNative 'tar' @('-tzf', $archivePath)
$entries = @($listingText -split '\r?\n' | Where-Object { $_.Trim().Length -gt 0 })
$hasRootIndex = $false
foreach ($entry in $entries) {
  $normalized = $entry.Trim().Replace('\', '/')
  if ($normalized.StartsWith('/') -or $normalized -match '(^|/)\.\.(/|$)' -or $normalized -match '^[A-Za-z]:/') {
    throw "Unsafe path in generated archive: $entry"
  }
  if ($normalized -match '^(?:\./)?index\.html$') { $hasRootIndex = $true }
}
if (!$hasRootIndex) { throw 'Generated archive does not contain a root index.html.' }
$verboseListing = Invoke-CheckedNative 'tar' @('-tvzf', $archivePath)
foreach ($line in ($verboseListing -split '\r?\n')) {
  $trimmed = $line.TrimStart()
  if ($trimmed.Length -gt 0 -and ($trimmed[0] -eq 'l' -or $trimmed[0] -eq 'h')) {
    throw "Links are not allowed in the static release archive: $line"
  }
}

$localHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
$localBytes = [int64](Get-Item -LiteralPath $archivePath).Length
$preflight = [pscustomobject]@{
  status = 'ready'
  archive = $Archive
  bytes = $localBytes
  sha256 = $localHash
  entries = $entries.Count
  mode = if ($PreflightOnly) { 'local-only' } elseif ($Activate) { 'stage-and-activate' } else { 'stage-only' }
}
if ($PreflightOnly) {
  Write-Output ($preflight | ConvertTo-Json -Compress)
  return
}

if (!(Test-Path -LiteralPath $KeyPath -PathType Leaf)) { throw "SSH key not found: $KeyPath" }
$key = (Resolve-Path -LiteralPath $KeyPath).Path
$target = "$User@$HostName"
$releaseId = $localHash.Substring(0, 12) + '-' + [guid]::NewGuid().ToString('N')
$remoteStage = '/tmp/osgard-frontend-release-' + [guid]::NewGuid().ToString('N')
$remoteArchive = "$remoteStage/$Archive"
$remoteScript = "$remoteStage/activate-frontend-dist-remote.sh"
$remoteStageReady = $false
$archiveVerified = $false
$sshOptions = @(
  '-i', $key, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
  '-o', 'ServerAliveInterval=5', '-o', 'ServerAliveCountMax=2', $target
)

try {
  # Remove old chunks first: otherwise an earlier, larger archive can corrupt a shorter release.
  if (Test-Path -LiteralPath $chunkDir) { Remove-Item -LiteralPath $chunkDir -Recurse -Force }
  New-Item -ItemType Directory -Path $chunkDir -Force | Out-Null
  $chunkNames = [System.Collections.Generic.List[string]]::new()
  $inputStream = [System.IO.File]::OpenRead($archivePath)
  try {
    $buffer = New-Object byte[] $ChunkBytes
    $index = 0
    while (($read = $inputStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
      $chunkName = 'chunk-{0:D6}.bin' -f $index
      $chunkPath = Join-Path $chunkDir $chunkName
      $outputStream = [System.IO.File]::Open($chunkPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
      try { $outputStream.Write($buffer, 0, $read) } finally { $outputStream.Dispose() }
      $chunkNames.Add($chunkName)
      $index++
    }
  } finally { $inputStream.Dispose() }

  $null = Invoke-CheckedNative 'ssh' ($sshOptions + @("umask 077 && install -d -m 700 '$remoteStage'"))
  $remoteStageReady = $true

  foreach ($chunkName in $chunkNames) {
    $chunkPath = Join-Path $chunkDir $chunkName
    $remoteChunk = $target + ':' + $remoteStage + '/' + $chunkName
    $sent = $false
    $lastError = ''
    for ($attempt = 1; $attempt -le $Retries -and !$sent; $attempt++) {
      try {
        $null = Invoke-CheckedNative 'scp' @(
          '-q', '-i', $key, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
          '-o', 'ServerAliveInterval=5', '-o', 'ServerAliveCountMax=2', $chunkPath, $remoteChunk
        )
        $sent = $true
      } catch {
        $lastError = $_.Exception.Message
        if ($attempt -lt $Retries) { Start-Sleep -Seconds ([Math]::Min(8, $attempt * 2)) }
      }
    }
    if (!$sent) { throw "Failed to upload $chunkName after $Retries attempts. $lastError" }
  }

  $verifyCommand = "set -eu; cat '$remoteStage'/chunk-*.bin > '$remoteArchive'; sha256sum '$remoteArchive'; stat -c '%s' '$remoteArchive'"
  $remoteOutput = Invoke-CheckedNative 'ssh' ($sshOptions + @($verifyCommand))
  $remoteHashMatch = [regex]::Match($remoteOutput, '(?im)^([0-9a-f]{64})\s')
  $remoteSizeMatch = [regex]::Match($remoteOutput, '(?m)^([0-9]+)\s*$')
  if (!$remoteHashMatch.Success -or !$remoteSizeMatch.Success) { throw "Remote verification returned an unexpected response: $remoteOutput" }
  $remoteHash = $remoteHashMatch.Groups[1].Value.ToLowerInvariant()
  $remoteBytes = [int64]$remoteSizeMatch.Groups[1].Value
  if ($remoteHash -ne $localHash -or $remoteBytes -ne $localBytes) {
    throw "Remote archive verification failed. local=$localHash/$localBytes remote=$remoteHash/$remoteBytes"
  }
  $archiveVerified = $true

  if (!$Activate) {
    Write-Output "Verified staging only: SHA-256 $localHash; $localBytes bytes; remote stage $remoteStage"
    Write-Output 'Production was not changed. Review the release, then rerun with -Activate to switch it.'
    return
  }

  $activationScriptPath = Join-Path $PSScriptRoot 'activate-frontend-dist-remote.sh'
  if (!(Test-Path -LiteralPath $activationScriptPath -PathType Leaf)) { throw "Activation helper is missing: $activationScriptPath" }
  $null = Invoke-CheckedNative 'scp' @(
    '-q', '-i', $key, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
    $activationScriptPath, ($target + ':' + $remoteScript)
  )
  $activateCommand = "chmod 700 '$remoteScript' && OSGARD_ARCHIVE='$remoteArchive' OSGARD_SHA256='$localHash' OSGARD_CONTAINER='osgard-world' OSGARD_HEALTH_URL='$HealthUrl' OSGARD_RELEASE_ID='$releaseId' bash '$remoteScript'"
  $activationOutput = Invoke-CheckedNative 'ssh' ($sshOptions + @($activateCommand))
  if ($activationOutput) { Write-Output $activationOutput }
  $null = Invoke-CheckedNative 'ssh' ($sshOptions + @("rm -rf '$remoteStage'"))
  Write-Output "Release activated after local/remote checksum, archive, Nginx and route checks. SHA-256: $localHash"
} catch {
  if ($remoteStageReady -and !$archiveVerified) {
    try { $null = Invoke-CheckedNative 'ssh' ($sshOptions + @("rm -rf '$remoteStage'")) } catch {}
  }
  throw
} finally {
  if (Test-Path -LiteralPath $chunkDir) {
    Remove-Item -LiteralPath $chunkDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
