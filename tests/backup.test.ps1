$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/backup.ps1')
$testRoot = Join-Path (Join-Path $PSScriptRoot '../.deploy') ('test-' + [Guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
foreach ($withLegacy in @($false, $true)) {
    $case = Join-Path $testRoot ([string]$withLegacy)
    $checkout = Join-Path $case 'checkout'
    $backup = Join-Path $case 'backup'
    New-Item -ItemType Directory -Path (Join-Path $checkout '.github/workflows') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $checkout 'index.html') -Value 'original-index'
    Set-Content -LiteralPath (Join-Path $checkout '.github/workflows/pages.yml') -Value 'original-workflow'
    if ($withLegacy) {
        New-Item -ItemType Directory -Path (Join-Path $checkout 'legacy/old') -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $checkout 'legacy/old/README.md') -Value 'original-history'
    }
    Backup-DeploymentFiles -CheckoutRoot $checkout -BackupRoot $backup -Manifest @('index.html','.github/workflows/pages.yml','legacy','absent')
    $archive = Join-Path $checkout 'legacy/pre-update-test'
    New-Item -ItemType Directory -Path (Split-Path -Parent $archive) -Force | Out-Null
    Copy-Item -LiteralPath $backup -Destination $archive -Recurse
    $expected = if ($withLegacy) { 3 } else { 2 }
    $files = @(Get-ChildItem -LiteralPath $archive -Recurse -File)
    if ($files.Count -ne $expected) { throw "Recursive copy regression: expected $expected files, got $($files.Count)" }
    if ((Get-Content -LiteralPath (Join-Path $archive 'index.html') -Raw).Trim() -ne 'original-index') { throw 'Backup content changed.' }
    if ($withLegacy -and (Get-Content -LiteralPath (Join-Path $archive 'legacy/old/README.md') -Raw).Trim() -ne 'original-history') { throw 'Legacy content changed.' }
    $rejected = $false
    try { Backup-DeploymentFiles -CheckoutRoot $checkout -BackupRoot (Join-Path $checkout 'nested') -Manifest @('legacy') }
    catch { $rejected = $_.Exception.Message -like '*outside the checkout*' }
    if (-not $rejected) { throw 'Nested backup destination was not rejected.' }
    Write-Output "PASS: external backup, history preservation, no recursion; existing legacy=$withLegacy"
}
