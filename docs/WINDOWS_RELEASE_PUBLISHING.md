# Windows release publishing and recovery

This is the supported Windows path for staging the OSGARD static frontend. It avoids hand-built scp command fragments and checks each native command's exit code.

## 1. Build and run local preflight

Open PowerShell in the repository root (the folder containing package.json):

    npm ci
    npm run build
    npm run qa:windows-publisher
    .\scripts\publish-frontend-resumable.ps1 -PreflightOnly

PreflightOnly writes osgard-world-release.tgz, validates its paths and root index.html, rejects symbolic/hard links, then prints the byte count and SHA-256 as JSON. It does not open an SSH connection, read the SSH key, upload chunks, or modify production.

## 2. Stage the archive on the server

    .\scripts\publish-frontend-resumable.ps1

The default behavior uploads to a unique /tmp/osgard-frontend-release-* directory and verifies both remote SHA-256 and byte count. It does not switch the live document root. Retries are bounded; failed SSH/SCP/tar commands stop the process. Old local chunks are removed before splitting the next artifact, so stale chunks cannot corrupt a shorter release.

## 3. Activate only after reviewing staging output

    .\scripts\publish-frontend-resumable.ps1 -Activate

Activation repeats checksum validation on the server and inside the container, rejects path traversal and archive links, extracts into a candidate directory, preserves the previous document root, validates Nginx, reloads it, and checks the home route plus /games/. A failed route check triggers rollback. A rollback copy is retained inside the container under /tmp/osgard-html-backup-<release-id>.

Activation is intentionally opt-in. Never paste private key contents into chat, a ticket, terminal transcript, or Git. The default key path is %USERPROFILE%\.ssh\osgard_contabo.

## Common PowerShell mistake

Do not enter -o ConnectTimeout=15 as its own command. -o is an option for ssh/scp. This is a complete command, but the supported publisher script is preferred:

    scp -i "$env:USERPROFILE\.ssh\osgard_contabo" -o ConnectTimeout=15 .\osgard-world-release.tgz root@207.180.248.95:/tmp/osgard-world-release.tgz

A bare filename followed by root@host:/path is not a copy command, so it will not transfer the archive. If sha256sum reports that the remote file does not exist, first complete the upload and confirm its exit code; do not interpret an empty hash output as success.
