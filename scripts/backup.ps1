function Backup-DeploymentFiles {
    param(
        [Parameter(Mandatory=$true)][string]$CheckoutRoot,
        [Parameter(Mandatory=$true)][string]$BackupRoot,
        [Parameter(Mandatory=$true)][string[]]$Manifest
    )
    $checkoutPath = [System.IO.Path]::GetFullPath($CheckoutRoot).TrimEnd('\', '/')
    $backupPath = [System.IO.Path]::GetFullPath($BackupRoot).TrimEnd('\', '/')
    if ($backupPath.Equals($checkoutPath, [StringComparison]::OrdinalIgnoreCase) -or
        $backupPath.StartsWith($checkoutPath + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Backup must be outside the checkout to prevent recursive self-copy.'
    }
    if (Test-Path -LiteralPath $backupPath) { throw 'Backup destination must be new.' }
    # Freeze the existing source list before creating any backup directories.
    $existing = @($Manifest | Where-Object { Test-Path -LiteralPath (Join-Path $checkoutPath $_) })
    New-Item -ItemType Directory -Path $backupPath | Out-Null
    foreach ($item in $existing) {
        $source = Join-Path $checkoutPath $item
        $saved = Join-Path $backupPath $item
        New-Item -ItemType Directory -Path (Split-Path -Parent $saved) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $saved -Recurse -ErrorAction Stop
    }
}
