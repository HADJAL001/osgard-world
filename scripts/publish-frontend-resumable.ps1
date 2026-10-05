param(
  [string]$HostName = '207.180.248.95',
  [string]$User = 'root',
  [string]$KeyPath = "$env:USERPROFILE\.ssh\osgard_contabo",
  [string]$Archive = 'osgard-world-release.tgz',
  [int]$ChunkBytes = 65536,
  [int]$Retries = 4,
  [switch]$Activate
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$dist = Join-Path $root 'dist'
$archivePath = Join-Path $root $Archive
$chunkDir = Join-Path $root '.publish-chunks'
$remoteStage = '/tmp/osgard-frontend-release'
$remoteArchive = "$remoteStage/$Archive"

if (!(Test-Path (Join-Path $dist 'index.html'))) { throw "Build dist first: missing $dist/index.html" }
tar -czf $archivePath -C $dist .
$localHash = (Get-FileHash $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
$localBytes = (Get-Item $archivePath).Length
New-Item -ItemType Directory -Force $chunkDir | Out-Null
$data = [IO.File]::ReadAllBytes($archivePath)
for ($offset = 0; $offset -lt $data.Length; $offset += $ChunkBytes) {
  $length = [Math]::Min($ChunkBytes, $data.Length - $offset)
  $name = 'chunk-{0:D6}.bin' -f [int]($offset / $ChunkBytes)
  [IO.File]::WriteAllBytes((Join-Path $chunkDir $name), $data[$offset..($offset + $length - 1)])
}

$target = "$User@$HostName"
ssh -i $KeyPath -o BatchMode=yes -o ConnectTimeout=10 $target "rm -rf $remoteStage; mkdir -p $remoteStage"
foreach ($chunk in (Get-ChildItem $chunkDir -Filter 'chunk-*.bin' | Sort-Object Name)) {
  $sent = $false
  for ($attempt = 1; $attempt -le $Retries -and !$sent; $attempt++) {
    scp -q -i $KeyPath -o BatchMode=yes -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=2 $chunk.FullName "$target`:$remoteStage/" 2>$null
    $sent = $LASTEXITCODE -eq 0
    if (!$sent) { Start-Sleep -Seconds ([Math]::Min(8, $attempt * 2)) }
  }
  if (!$sent) { throw "Failed to upload $($chunk.Name) after $Retries attempts" }
}

$remoteHash = ssh -i $KeyPath -o BatchMode=yes -o ConnectTimeout=10 $target "cat $remoteStage/chunk-*.bin > $remoteArchive; sha256sum $remoteArchive | cut -d' ' -f1; stat -c '%s' $remoteArchive"
$parts = $remoteHash -split '\s+'
if ($parts[0] -ne $localHash -or [int64]$parts[1] -ne $localBytes) { throw "Remote archive verification failed: $remoteHash" }
if (!$Activate) { Write-Output "Verified staging archive only: $localHash ($localBytes bytes)"; exit 0 }

ssh -i $KeyPath -o BatchMode=yes -o ConnectTimeout=10 $target "set -e; docker cp $remoteArchive osgard-world:/tmp/osgard-frontend-release.tgz; docker exec osgard-world sh -lc 'rm -rf /tmp/osgard-frontend-next /tmp/osgard-html-previous && mkdir -p /tmp/osgard-frontend-next && tar -xzf /tmp/osgard-frontend-release.tgz -C /tmp/osgard-frontend-next && test -f /tmp/osgard-frontend-next/index.html'; docker exec osgard-world sh -lc 'cp -a /usr/share/nginx/html /tmp/osgard-html-previous && rm -rf /usr/share/nginx/html/* && cp -a /tmp/osgard-frontend-next/. /usr/share/nginx/html/'; if ! curl -fsS https://osgard.world/ >/dev/null; then docker exec osgard-world sh -lc 'rm -rf /usr/share/nginx/html/* && cp -a /tmp/osgard-html-previous/. /usr/share/nginx/html/'; exit 1; fi"
Write-Output "Frontend archive activated after checksum verification: $localHash"
