param([switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$repositoryUrl = 'https://github.com/benson103081/AIoT-DIC2-MultipleLR.git'
$manifest = @('index.html','styles.css','package.json','README.md','.gitignore','.nojekyll','.github/workflows/pages.yml','src','data','scripts','tests','reports')
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE. No force push was attempted." }
}
Get-Command git, node, python -ErrorAction Stop | Out-Null
foreach ($item in $manifest) {
    if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $item))) { throw "Missing deliverable: $item" }
}
# Initial publication only. Never overwrite a populated remote repository.
$remoteRefs = & git -c credential.username=benson103081 ls-remote $repositoryUrl
if ($LASTEXITCODE -ne 0) { throw 'Create the public repository benson103081/AIoT-DIC2-MultipleLR first, without README, license or gitignore. Then retry using your benson103081 account.' }
if ($remoteRefs) { throw 'The student repository is not empty. Stop to preserve its history; use the existing checkout for subsequent updates.' }
$deployRoot = Join-Path $sourceRoot '.deploy'
New-Item -ItemType Directory -Path $deployRoot -Force | Out-Null
$checkout = Join-Path $deployRoot ('student-' + [Guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $checkout | Out-Null
Write-Host "Preparing your independent assignment repository in: $checkout"
foreach ($item in $manifest) {
    $from = Join-Path $sourceRoot $item
    $to = Join-Path $checkout $item
    New-Item -ItemType Directory -Path (Split-Path -Parent $to) -Force | Out-Null
    Copy-Item -LiteralPath $from -Destination $to -Recurse -Force
}
Push-Location $checkout
try {
    Invoke-Checked git @('init','-b','main')
    Invoke-Checked git @('remote','add','origin',$repositoryUrl)
    Invoke-Checked git @('config','credential.username','benson103081')
    $remote = (& git remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $remote -ne $repositoryUrl) { throw 'Unexpected origin. Stopping.' }
    $testFiles = @(Get-ChildItem -LiteralPath 'tests' -Filter '*.test.mjs' | ForEach-Object { $_.FullName })
    Invoke-Checked node (@('--test') + $testFiles)
    Invoke-Checked node @('scripts/analyze.mjs')
    Invoke-Checked python @('scripts/verify_numeric.py')
    Invoke-Checked node @('scripts/browser-test.mjs')
    Invoke-Checked node @('scripts/build.mjs')
    Invoke-Checked git (@('add','--') + $manifest)
    Invoke-Checked git @('--no-pager','diff','--cached','--stat')
    Invoke-Checked git @('commit','-m','Implement reproducible two-problem AIoT regression assignment')
    if ($PrepareOnly) {
        Write-Host "Prepared and committed without pushing: $checkout"
        Write-Host 'When ready, run git push -u origin main from that checkout.'
    } else {
        Write-Host "If authentication fails, retry git push -u origin main from: $checkout"
        Invoke-Checked git @('push','-u','origin','main')
        Write-Host 'Pushed to YOUR repository. Deployment still needs to complete in Actions.'
        Write-Host 'Set Settings > Pages > Source to GitHub Actions, then check or rerun the workflow:'
        Write-Host 'https://github.com/benson103081/AIoT-DIC2-MultipleLR/actions'
        Write-Host 'After the NEW workflow succeeds, verify:'
        Write-Host 'https://benson103081.github.io/AIoT-DIC2-MultipleLR/'
    }
} finally { Pop-Location }
