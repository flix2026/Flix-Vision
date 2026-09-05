@echo off
title Flix Vision — Create Download Packages
cd /d "%~dp0"

echo.
echo  Creating Flix Vision download packages...
echo.

:: ── Verify Node isn't required for this script (pure PowerShell) ─────────────
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] PowerShell not found. This script requires PowerShell.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"& { ^
    $src    = Split-Path -Parent '%~f0'; ^
    $backup = Join-Path $src 'Backups\Flix USB'; ^
    $outDir = Join-Path $src 'download\downloads'; ^
    $tmp    = Join-Path $env:TEMP 'flix-pkg'; ^
    ^
    if (-not (Test-Path $backup)) { ^
        Write-Host '  [ERROR] Backups\Flix USB folder not found.' -ForegroundColor Red; ^
        exit 1 ^
    } ^
    ^
    if (-not (Test-Path $outDir)) { ^
        New-Item -ItemType Directory $outDir -Force | Out-Null ^
    } ^
    ^
    $common = @( ^
        'index.html', ^
        'trailer.html', ^
        'embed.html', ^
        'manifest.json', ^
        'sw.js', ^
        'server.js', ^
        'css\style.css', ^
        'js\api.js', ^
        'js\app.js', ^
        'js\player.js', ^
        'icons\icon.svg' ^
    ); ^
    ^
    $optIcons = @('icons\icon-192.png', 'icons\icon-512.png'); ^
    ^
    $packages = @( ^
        @{ name='flix-vision-windows'; launcher='run.bat';           readme='README-windows.txt' }, ^
        @{ name='flix-vision-mac';     launcher='start-mac.command'; readme='README-mac.txt'     }, ^
        @{ name='flix-vision-linux';   launcher='start-linux.sh';    readme='README-linux.txt'   } ^
    ); ^
    ^
    foreach ($pkg in $packages) { ^
        $zipPath = Join-Path $outDir ($pkg.name + '.zip'); ^
        if (Test-Path $zipPath) { Remove-Item $zipPath -Force } ^
        ^
        $stage = Join-Path $tmp ($pkg.name); ^
        if (Test-Path $stage) { Remove-Item $stage -Recurse -Force } ^
        ^
        $dest = Join-Path $stage 'flix-vision'; ^
        New-Item -ItemType Directory (Join-Path $dest 'css')   -Force | Out-Null; ^
        New-Item -ItemType Directory (Join-Path $dest 'js')    -Force | Out-Null; ^
        New-Item -ItemType Directory (Join-Path $dest 'icons') -Force | Out-Null; ^
        ^
        foreach ($f in $common) { ^
            $from = ''; ^
            if ($f -eq 'index.html' -or $f -eq 'trailer.html' -or $f -eq 'embed.html') { ^
                $from = Join-Path $backup $f ^
            } else { ^
                $from = Join-Path $src $f ^
            } ^
            if (Test-Path $from) { ^
                $to = Join-Path $dest $f; ^
                $toDir = Split-Path $to; ^
                if (-not (Test-Path $toDir)) { New-Item -ItemType Directory $toDir -Force | Out-Null } ^
                Copy-Item $from $to -Force ^
            } ^
        }; ^
        ^
        foreach ($f in $optIcons) { ^
            $from = Join-Path $src $f; ^
            if (Test-Path $from) { Copy-Item $from (Join-Path $dest $f) -Force } ^
        }; ^
        ^
        $launcherSrc = Join-Path $src $pkg.launcher; ^
        if (Test-Path $launcherSrc) { Copy-Item $launcherSrc (Join-Path $dest $pkg.launcher) -Force }; ^
        ^
        $readmeSrc = Join-Path $src 'download' ($pkg.readme); ^
        if (Test-Path $readmeSrc) { Copy-Item $readmeSrc (Join-Path $dest 'README.txt') -Force }; ^
        ^
        Compress-Archive -Path (Join-Path $stage 'flix-vision') -DestinationPath $zipPath -Force; ^
        Remove-Item $stage -Recurse -Force; ^
        ^
        $kb = [math]::Round((Get-Item $zipPath).Length / 1KB, 1); ^
        Write-Host ('  Created: ' + $pkg.name + '.zip  (' + $kb + ' KB)') -ForegroundColor Green ^
    } ^
    ^
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force } ^
    ^
    Write-Host ''; ^
    Write-Host '  All packages created in: download\downloads\' -ForegroundColor Cyan; ^
    Write-Host '' ^
}"

echo.
pause
