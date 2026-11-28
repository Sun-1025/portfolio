param([switch]$PagesOnly)

$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
public struct CREDENTIAL {
    public uint Flags;
    public uint Type;
    public IntPtr TargetName;
    public IntPtr Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize;
    public IntPtr CredentialBlob;
    public uint Persist;
    public uint AttributeCount;
    public IntPtr Attributes;
    public IntPtr TargetAlias;
    public IntPtr UserName;
}

public static class CredReader {
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool CredReadW(string target, int type, int flags, out IntPtr credential);
    [DllImport("advapi32.dll", SetLastError = true)]
    static extern void CredFree(IntPtr cred);

    public static byte[] ReadBytes(string target) {
        IntPtr ptr = IntPtr.Zero;
        if (!CredReadW(target, 1, 0, out ptr)) throw new Exception("CredRead failed: " + Marshal.GetLastWin32Error());
        try {
            CREDENTIAL cred = Marshal.PtrToStructure<CREDENTIAL>(ptr);
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, bytes.Length);
            return bytes;
        } finally { CredFree(ptr); }
    }
}
'@

$token = [Text.Encoding]::UTF8.GetString([CredReader]::ReadBytes('GitHub - https://api.github.com/Sun-1025')).Trim([char]0)
$headers = @{
    Authorization = "Bearer $token"
    Accept = 'application/vnd.github+json'
    'User-Agent' = 'Doubao-Deploy'
    'X-GitHub-Api-Version' = '2022-11-28'
}

function Invoke-GH {
    param(
        [Parameter(Mandatory)] [string] $Method,
        [Parameter(Mandatory)] [string] $Uri,
        [object] $Body
    )
    $params = @{ Method = $Method; Uri = "https://api.github.com$Uri"; Headers = $headers; TimeoutSec = 60 }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
    }
    Invoke-RestMethod @params
}

function New-Blob {
    param([string] $Owner, [string] $Repo, [byte[]] $Bytes)
    Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/blobs" -Body @{
        content = [Convert]::ToBase64String($Bytes)
        encoding = 'base64'
    }
}

function Update-Repo {
    param(
        [string] $Owner,
        [string] $Repo,
        [string] $Branch,
        [string] $Message,
        [array] $Files
    )

    $ref = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/ref/heads/$Branch"
    $commit = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/commits/$($ref.object.sha)"
    $entries = @()
    foreach ($file in $Files) {
        if (-not (Test-Path -LiteralPath $file.Local)) { throw "Missing local file: $($file.Local)" }
        $bytes = [IO.File]::ReadAllBytes($file.Local)
        $blob = New-Blob -Owner $Owner -Repo $Repo -Bytes $bytes
        $entries += @{ path = $file.Remote; mode = '100644'; type = 'blob'; sha = $blob.sha }
        "  blob $($file.Remote) $($bytes.Length) B -> $($blob.sha.Substring(0,8))"
    }

    $tree = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/trees" -Body @{
        base_tree = $commit.tree.sha
        tree = $entries
    }
    $newCommit = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/commits" -Body @{
        message = $Message
        tree = $tree.sha
        parents = @($ref.object.sha)
    }
    "  new commit $($newCommit.sha) parent $($ref.object.sha)"
    $updated = Invoke-GH -Method Patch -Uri "/repos/$Owner/$Repo/git/refs/heads/$Branch" -Body @{
        sha = $newCommit.sha
        force = $false
    }
    "commit $($updated.object.sha)"
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $PagesOnly) {
"Source repo"
Update-Repo -Owner 'Sun-1025' -Repo 'portfolio' -Branch 'main' `
    -Message 'feat: anonymous guestbook, QQ contact, locked placeholders' `
    -Files @(
        @{ Local = (Join-Path $root 'public/index.html'); Remote = 'public/index.html' },
        @{ Local = (Join-Path $root 'public/classic/index.html'); Remote = 'public/classic/index.html' },
        @{ Local = (Join-Path $root 'public/assets/css/app.css'); Remote = 'public/assets/css/app.css' },
        @{ Local = (Join-Path $root 'public/assets/css/tailwind.css'); Remote = 'public/assets/css/tailwind.css' },
        @{ Local = (Join-Path $root 'public/assets/css/app-v4.css'); Remote = 'public/assets/css/app-v4.css' },
        @{ Local = (Join-Path $root 'public/assets/css/app-ios27.css'); Remote = 'public/assets/css/app-ios27.css' },
        @{ Local = (Join-Path $root 'public/assets/js/app.js'); Remote = 'public/assets/js/app.js' },
        @{ Local = (Join-Path $root 'public/assets/js/ai-dock.js'); Remote = 'public/assets/js/ai-dock.js' },
        @{ Local = (Join-Path $root 'public/assets/ai-logo.svg'); Remote = 'public/assets/ai-logo.svg' },
        @{ Local = (Join-Path $root 'public/assets/ai-logo-light.svg'); Remote = 'public/assets/ai-logo-light.svg' },
        @{ Local = (Join-Path $root 'public/assets/favicon.svg'); Remote = 'public/assets/favicon.svg' },
        @{ Local = (Join-Path $root 'public/assets/signal-core.webp'); Remote = 'public/assets/signal-core.webp' },
        @{ Local = (Join-Path $root 'public/assets/illustrations/cover-voice.webp'); Remote = 'public/assets/illustrations/cover-voice.webp' },
        @{ Local = (Join-Path $root 'public/assets/illustrations/cover-library.webp'); Remote = 'public/assets/illustrations/cover-library.webp' },
        @{ Local = (Join-Path $root 'public/assets/illustrations/cover-physics.webp'); Remote = 'public/assets/illustrations/cover-physics.webp' },
        @{ Local = (Join-Path $root 'src/tailwind.css'); Remote = 'src/tailwind.css' },
        @{ Local = (Join-Path $root 'src/routes/guestbook.js'); Remote = 'src/routes/guestbook.js' },
        @{ Local = (Join-Path $root 'server.js'); Remote = 'server.js' },
        @{ Local = (Join-Path $root '.gitignore'); Remote = '.gitignore' },
        @{ Local = (Join-Path $root 'ai-server/package.json'); Remote = 'ai-server/package.json' },
        @{ Local = (Join-Path $root 'ai-server/package-lock.json'); Remote = 'ai-server/package-lock.json' },
        @{ Local = (Join-Path $root 'ai-server/tsconfig.json'); Remote = 'ai-server/tsconfig.json' },
        @{ Local = (Join-Path $root 'ai-server/next-env.d.ts'); Remote = 'ai-server/next-env.d.ts' },
        @{ Local = (Join-Path $root 'ai-server/.env.example'); Remote = 'ai-server/.env.example' },
        @{ Local = (Join-Path $root 'ai-server/.gitignore'); Remote = 'ai-server/.gitignore' },
        @{ Local = (Join-Path $root 'ai-server/profile.json'); Remote = 'ai-server/profile.json' },
        @{ Local = (Join-Path $root 'ai-server/README.md'); Remote = 'ai-server/README.md' },
        @{ Local = (Join-Path $root 'ai-server/app/layout.tsx'); Remote = 'ai-server/app/layout.tsx' },
        @{ Local = (Join-Path $root 'ai-server/app/page.tsx'); Remote = 'ai-server/app/page.tsx' },
        @{ Local = (Join-Path $root 'ai-server/app/api/chat/route.ts'); Remote = 'ai-server/app/api/chat/route.ts' },
        @{ Local = (Join-Path $root 'public/tools/convert-core.js'); Remote = 'public/tools/convert-core.js' },
        @{ Local = (Join-Path $root 'public/tools/converter.js'); Remote = 'public/tools/converter.js' },
        @{ Local = (Join-Path $root 'public/tools/docs-core.js'); Remote = 'public/tools/docs-core.js' },
        @{ Local = (Join-Path $root 'public/tools/data-core.js'); Remote = 'public/tools/data-core.js' },
        @{ Local = (Join-Path $root 'public/tools/model-core.js'); Remote = 'public/tools/model-core.js' },
        @{ Local = (Join-Path $root 'public/tools/vendor/pdf.min.mjs'); Remote = 'public/tools/vendor/pdf.min.mjs' },
        @{ Local = (Join-Path $root 'public/tools/vendor/pdf.worker.min.mjs'); Remote = 'public/tools/vendor/pdf.worker.min.mjs' },
        @{ Local = (Join-Path $root 'public/tools/vendor/pdf-lib.min.js'); Remote = 'public/tools/vendor/pdf-lib.min.js' },
        @{ Local = (Join-Path $root 'public/tools/vendor/mammoth.browser.min.js'); Remote = 'public/tools/vendor/mammoth.browser.min.js' },
        @{ Local = (Join-Path $root 'public/tools/vendor/xlsx.full.min.js'); Remote = 'public/tools/vendor/xlsx.full.min.js' },
        @{ Local = (Join-Path $root 'public/tools/vendor/jszip.min.js'); Remote = 'public/tools/vendor/jszip.min.js' },
        @{ Local = (Join-Path $root 'public/tools/vendor/js-yaml.min.js'); Remote = 'public/tools/vendor/js-yaml.min.js' },
        @{ Local = (Join-Path $root 'public/tools/vendor/turndown.js'); Remote = 'public/tools/vendor/turndown.js' },
        @{ Local = (Join-Path $root 'public/tools/vendor/lame.min.js'); Remote = 'public/tools/vendor/lame.min.js' },
        @{ Local = (Join-Path $root 'data/site.json'); Remote = 'data/site.json' },
        @{ Local = (Join-Path $root 'README.md'); Remote = 'README.md' },
        @{ Local = (Join-Path $root 'docs/copy-v4.md'); Remote = 'docs/copy-v4.md' },
        @{ Local = (Join-Path $root 'CHANGELOG.md'); Remote = 'CHANGELOG.md' },
        @{ Local = (Join-Path $root 'package.json'); Remote = 'package.json' },
        @{ Local = (Join-Path $root 'scripts/export-static.js'); Remote = 'scripts/export-static.js' },
        @{ Local = (Join-Path $root 'qa/test-convert-core.mjs'); Remote = 'qa/test-convert-core.mjs' },
        @{ Local = (Join-Path $root 'qa/test-model-core.mjs'); Remote = 'qa/test-model-core.mjs' },
        @{ Local = (Join-Path $root 'qa/test-converter-ui.cjs'); Remote = 'qa/test-converter-ui.cjs' },
        @{ Local = (Join-Path $root 'qa/test-docs-ui.cjs'); Remote = 'qa/test-docs-ui.cjs' },
        @{ Local = (Join-Path $root 'qa/test-all-formats.cjs'); Remote = 'qa/test-all-formats.cjs' },
        @{ Local = (Join-Path $root 'qa/test-audio-mp3.cjs'); Remote = 'qa/test-audio-mp3.cjs' },
        @{ Local = (Join-Path $root 'qa/make-docs-fixtures.cjs'); Remote = 'qa/make-docs-fixtures.cjs' }
    )
}

"Pages repo"
$dist = Join-Path $root 'dist'
Update-Repo -Owner 'Sun-1025' -Repo 'Sun-1025.github.io' -Branch 'main' `
    -Message 'feat: publish anonymous guestbook + locked placeholders' `
    -Files @(
        @{ Local = (Join-Path $dist 'index.html'); Remote = 'index.html' },
        @{ Local = (Join-Path $dist 'classic/index.html'); Remote = 'classic/index.html' },
        @{ Local = (Join-Path $dist 'assets/css/app.css'); Remote = 'assets/css/app.css' },
        @{ Local = (Join-Path $dist 'assets/css/tailwind.css'); Remote = 'assets/css/tailwind.css' },
        @{ Local = (Join-Path $dist 'assets/css/app-v4.css'); Remote = 'assets/css/app-v4.css' },
        @{ Local = (Join-Path $dist 'assets/css/app-ios27.css'); Remote = 'assets/css/app-ios27.css' },
        @{ Local = (Join-Path $dist 'assets/js/app.js'); Remote = 'assets/js/app.js' },
        @{ Local = (Join-Path $dist 'assets/js/ai-dock.js'); Remote = 'assets/js/ai-dock.js' },
        @{ Local = (Join-Path $dist 'assets/ai-logo.svg'); Remote = 'assets/ai-logo.svg' },
        @{ Local = (Join-Path $dist 'assets/ai-logo-light.svg'); Remote = 'assets/ai-logo-light.svg' },
        @{ Local = (Join-Path $dist 'assets/favicon.svg'); Remote = 'assets/favicon.svg' },
        @{ Local = (Join-Path $dist 'assets/signal-core.webp'); Remote = 'assets/signal-core.webp' },
        @{ Local = (Join-Path $dist 'assets/illustrations/cover-voice.webp'); Remote = 'assets/illustrations/cover-voice.webp' },
        @{ Local = (Join-Path $dist 'assets/illustrations/cover-library.webp'); Remote = 'assets/illustrations/cover-library.webp' },
        @{ Local = (Join-Path $dist 'assets/illustrations/cover-physics.webp'); Remote = 'assets/illustrations/cover-physics.webp' },
        @{ Local = (Join-Path $dist 'data/site.json'); Remote = 'data/site.json' },
        @{ Local = (Join-Path $dist 'tools/convert-core.js'); Remote = 'tools/convert-core.js' },
        @{ Local = (Join-Path $dist 'tools/converter.js'); Remote = 'tools/converter.js' },
        @{ Local = (Join-Path $dist 'tools/docs-core.js'); Remote = 'tools/docs-core.js' },
        @{ Local = (Join-Path $dist 'tools/data-core.js'); Remote = 'tools/data-core.js' },
        @{ Local = (Join-Path $dist 'tools/model-core.js'); Remote = 'tools/model-core.js' },
        @{ Local = (Join-Path $dist 'tools/vendor/pdf.min.mjs'); Remote = 'tools/vendor/pdf.min.mjs' },
        @{ Local = (Join-Path $dist 'tools/vendor/pdf.worker.min.mjs'); Remote = 'tools/vendor/pdf.worker.min.mjs' },
        @{ Local = (Join-Path $dist 'tools/vendor/pdf-lib.min.js'); Remote = 'tools/vendor/pdf-lib.min.js' },
        @{ Local = (Join-Path $dist 'tools/vendor/mammoth.browser.min.js'); Remote = 'tools/vendor/mammoth.browser.min.js' },
        @{ Local = (Join-Path $dist 'tools/vendor/xlsx.full.min.js'); Remote = 'tools/vendor/xlsx.full.min.js' },
        @{ Local = (Join-Path $dist 'tools/vendor/jszip.min.js'); Remote = 'tools/vendor/jszip.min.js' },
        @{ Local = (Join-Path $dist 'tools/vendor/js-yaml.min.js'); Remote = 'tools/vendor/js-yaml.min.js' },
        @{ Local = (Join-Path $dist 'tools/vendor/turndown.js'); Remote = 'tools/vendor/turndown.js' },
        @{ Local = (Join-Path $dist 'tools/vendor/lame.min.js'); Remote = 'tools/vendor/lame.min.js' }
    )
