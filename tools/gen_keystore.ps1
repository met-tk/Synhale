# Synhale 2 - Release Keystore Generator (one-shot, idempotent)
# Generates android/app/synhale-release.jks with a random strong password and
# writes android/keystore.properties (git-ignored). Never echoes the password.
$ErrorActionPreference = 'Stop'

$appDir  = Join-Path $PSScriptRoot '..\android\app'
$android = Join-Path $PSScriptRoot '..\android'
$ksPath  = Join-Path $appDir 'synhale-release.jks'
$props   = Join-Path $android 'keystore.properties'

if (Test-Path $ksPath) {
    Write-Host "[skip] keystore already exists: $ksPath"
    exit 0
}

# Locate keytool: prefer JAVA_HOME, otherwise resolve through the java shim.
$keytool = $null
if ($env:JAVA_HOME) {
    $candidate = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
    if (Test-Path $candidate) { $keytool = $candidate }
}
if (-not $keytool) {
    $javaCmd = Get-Command java -ErrorAction SilentlyContinue
    if ($javaCmd) {
        # Walk up from the javapath shim to the real JDK installation.
        $resolved = (Get-Item $javaCmd.Source).Target
        if (-not $resolved) { $resolved = $javaCmd.Source }
        $jdkBin = Split-Path $resolved
        $candidate = Join-Path $jdkBin 'keytool.exe'
        if (Test-Path $candidate) { $keytool = $candidate }
    }
}
if (-not $keytool) {
    # Last resort: scan common JDK install roots.
    $roots = @("$env:ProgramFiles\Java", "${env:ProgramFiles(x86)}\Java")
    foreach ($r in $roots) {
        if (Test-Path $r) {
            $hit = Get-ChildItem $r -Recurse -Filter keytool.exe -ErrorAction SilentlyContinue |
                   Select-Object -First 1
            if ($hit) { $keytool = $hit.FullName; break }
        }
    }
}
if (-not $keytool) { Write-Error 'keytool.exe not found on this system.'; exit 1 }
Write-Host "[ok] using keytool: $keytool"

$alphabet = (48..57) + (65..90) + (97..122)
$pass = -join ($alphabet | Get-Random -Count 40 | ForEach-Object { [char]$_ })

# keytool writes progress to stderr; PowerShell 5 with
# $ErrorActionPreference='Stop' promotes any stderr line into a terminating
# NativeCommandError. Locally downgrade to Continue around the native call
# and trust the process exit code instead.
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $keytool -genkeypair -v `
    -keystore $ksPath -alias synhale `
    -keyalg RSA -keysize 2048 -validity 10950 `
    -storepass $pass -keypass $pass `
    -dname "CN=Synhale, OU=Mobile, O=Synhale, L=Beijing, ST=Beijing, C=CN" `
    2>$null | Out-Null
$exit = $LASTEXITCODE
$ErrorActionPreference = $prevEap

if ($exit -ne 0 -or -not (Test-Path $ksPath)) {
    Write-Error "keytool failed (exit=$exit) or did not produce $ksPath"
    exit 1
}

# Persist credentials to a local properties file consumed by build.gradle.
# This file is excluded from VCS via android/.gitignore.
@"
storeFile=synhale-release.jks
storePassword=$pass
keyAlias=synhale
keyPassword=$pass
"@ | Out-File -FilePath $props -Encoding ascii -NoNewline

# Make sure the credential file is ignored by git.
$gitignore = Join-Path $android '.gitignore'
$entry = 'keystore.properties'
$existing = if (Test-Path $gitignore) { Get-Content $gitignore -Raw } else { '' }
if ($existing -notmatch [regex]::Escape($entry)) {
    Add-Content -Path $gitignore -Value "`r`n# Release signing credentials (local only)`r`n$entry`r`n*.jks"
}

# Wipe the password from this process before exiting.
$pass = $null
Write-Host "[ok] keystore generated at $ksPath"
Write-Host "[ok] credentials written to $props (git-ignored, keep it safe)"
