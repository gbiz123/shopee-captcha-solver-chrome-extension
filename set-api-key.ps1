$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "script.js"
$unpatched = 'let apiKey = localStorage.getItem("sadCaptchaKey");'
$patchedPattern = 'let apiKey = "([^"]*)";'

function Save-Utf8NoBom([string]$path, [string]$text) {
    [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding($false)))
}

Write-Host ""
Write-Host "  SadCaptcha extension - API key" -ForegroundColor White
Write-Host "  ------------------------------" -ForegroundColor DarkGray

if (-not (Test-Path $scriptPath)) {
    Write-Host ""
    Write-Host "  script.js not found next to this file." -ForegroundColor Red
    Write-Host "  Run it from inside the extension folder, and run 'npm run build' first."
    Write-Host ""
    return
}

$text = [IO.File]::ReadAllText($scriptPath)
$current = $null
if ($text -match $patchedPattern) { $current = $Matches[1] }

Write-Host ""
if ($null -ne $current) {
    $shown = if ($current.Length -gt 8) { $current.Substring(0, 6) + "..." } else { $current }
    Write-Host "  A key is already built in: $shown"
    Write-Host "  Enter a new key to replace it, or type  remove  to take it back out."
} elseif ($text.Contains($unpatched)) {
    Write-Host "  No key is built in. The extension will ask for one through its popup."
    Write-Host "  Enter a key to build it in instead, or press Enter to leave it alone."
} else {
    Write-Host "  script.js does not look like a build of this extension." -ForegroundColor Red
    Write-Host "  Run 'npm run build' and try again."
    Write-Host ""
    return
}

Write-Host ""
$key = (Read-Host "  API key").Trim()

if ($key -eq "") {
    Write-Host ""
    Write-Host "  Nothing changed."
    Write-Host ""
    return
}

if ($key -eq "remove") {
    if ($null -eq $current) {
        Write-Host ""
        Write-Host "  There was no key to remove."
        Write-Host ""
        return
    }
    $out = $text -replace $patchedPattern, 'let apiKey = localStorage.getItem("sadCaptchaKey");'
    Save-Utf8NoBom $scriptPath $out
    Write-Host ""
    Write-Host "  Key removed. The extension will ask for one through its popup." -ForegroundColor Green
    Write-Host ""
    return
}

if ($key -notmatch '^[A-Za-z0-9_\-]+$') {
    Write-Host ""
    Write-Host "  That does not look like an API key - letters, digits, - and _ only." -ForegroundColor Red
    Write-Host "  Nothing changed."
    Write-Host ""
    return
}

if ($null -ne $current) {
    $out = $text -replace $patchedPattern, ('let apiKey = "' + $key + '";')
} else {
    $out = $text.Replace($unpatched, 'let apiKey = "' + $key + '";')
}

if ($out -eq $text) {
    Write-Host ""
    Write-Host "  Could not find the line to patch. Nothing changed." -ForegroundColor Red
    Write-Host ""
    return
}

Save-Utf8NoBom $scriptPath $out

Write-Host ""
Write-Host "  Key built into script.js." -ForegroundColor Green
Write-Host "  Reload the extension at chrome://extensions for it to take effect."
Write-Host ""
Write-Host "  This edits build output. Running 'npm run build' puts the file back," -ForegroundColor Yellow
Write-Host "  and so does running this again and typing  remove  - do that before" -ForegroundColor Yellow
Write-Host "  sharing the folder, or your key goes with it." -ForegroundColor Yellow
Write-Host ""
