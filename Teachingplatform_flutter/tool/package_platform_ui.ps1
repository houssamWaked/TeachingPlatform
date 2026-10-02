param(
  [switch]$SkipDependencyInstall
)

$ErrorActionPreference = 'Stop'
$flutterRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$platformUiRoot = Join-Path $flutterRoot 'platform_ui'
$dist = Join-Path $platformUiRoot 'dist'
$assetsRoot = Join-Path $flutterRoot 'assets'
$platformAssets = Join-Path $assetsRoot 'platform'

if (-not (Test-Path (Join-Path $platformUiRoot 'package-lock.json'))) {
  throw "Packaged platform UI source was not found at $platformUiRoot"
}

Push-Location $platformUiRoot
try {
  if (-not $SkipDependencyInstall -or -not (Test-Path 'node_modules')) {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
  }

  & npm run build
  if ($LASTEXITCODE -ne 0) { throw 'The React production build failed.' }
} finally {
  Pop-Location
}

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw "The React build did not produce $dist\index.html"
}

New-Item -ItemType Directory -Path $assetsRoot -Force | Out-Null
if (Test-Path -LiteralPath $platformAssets) {
  $resolvedAssets = (Resolve-Path -LiteralPath $platformAssets).Path
  if (-not $resolvedAssets.StartsWith($assetsRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to replace assets outside the Flutter project's assets folder: $resolvedAssets"
  }
  Remove-Item -LiteralPath $resolvedAssets -Recurse -Force
}

New-Item -ItemType Directory -Path $platformAssets -Force | Out-Null
Copy-Item -Path (Join-Path $dist '*') -Destination $platformAssets -Recurse -Force

$manifest = Get-ChildItem -LiteralPath $platformAssets -File -Recurse |
  Where-Object { $_.Name -ne 'asset-manifest.json' } |
  ForEach-Object { $_.FullName.Substring($platformAssets.Length + 1).Replace('\', '/') } |
  Sort-Object
$manifestJson = ConvertTo-Json -InputObject @($manifest) -Depth 2
$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText(
  (Join-Path $platformAssets 'asset-manifest.json'),
  $manifestJson,
  $encoding
)

# Flutter includes files directly under a declared asset directory, but it
# does not automatically include nested folders. List each packaged web file
# explicitly so the WebView server can load every JavaScript, CSS, font, and
# image referenced by index.html.
$pubspecPath = Join-Path $flutterRoot 'pubspec.yaml'
$pubspec = [System.IO.File]::ReadAllText($pubspecPath)
$newline = if ($pubspec.Contains("`r`n")) { "`r`n" } else { "`n" }
$assetRows = [System.Collections.Generic.List[string]]::new()
$assetRows.Add('    - assets/platform/asset-manifest.json')
foreach ($asset in $manifest) {
  $assetRows.Add("    - assets/platform/$asset")
}
$assetBlock = "  assets:$newline" + [string]::Join($newline, $assetRows) + $newline
$assetBlockPattern = '(?m)^  assets:\r?\n(?:    - assets/platform/[^\r\n]*\r?\n?)+'
$assetBlockRegex = [System.Text.RegularExpressions.Regex]::new($assetBlockPattern)
if (-not $assetBlockRegex.IsMatch($pubspec)) {
  throw "Could not find the platform asset entry in $pubspecPath"
}
$updatedPubspec = $assetBlockRegex.Replace($pubspec, $assetBlock, 1)
[System.IO.File]::WriteAllText($pubspecPath, $updatedPubspec, $encoding)

Write-Output "Packaged $($manifest.Count) React files into $platformAssets"
Write-Output "Declared $($manifest.Count + 1) Flutter assets in pubspec.yaml"
