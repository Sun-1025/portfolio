param(
  [string] $Owner = 'Sun-1025',
  [string] $Repo = 'portfolio',
  [string] $Branch = 'main',
  [string] $Message = 'feat: 兴趣相册合并为旅行，全站正文首行缩进'
)

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
    'User-Agent' = 'Doubao-Source'
    'X-GitHub-Api-Version' = '2022-11-28'
}
function Invoke-GH {
    param([string] $Method, [string] $Uri, [object] $Body)
    $params = @{ Method = $Method; Uri = "https://api.github.com$Uri"; Headers = $headers; TimeoutSec = 90 }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 100 -Compress)
    }
    Invoke-RestMethod @params
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$paths = @(
    'README.md', 'CHANGELOG.md', 'package.json', 'package-lock.json', 'server.js', '.env.example', '.gitignore',
    'data/site.json',
    'scripts/export-static.js', 'scripts/init-admin.js', 'scripts/migrate-content.js',
    'sync/deploy-v5-pages.ps1', 'sync/deploy-v6-pages.ps1', 'sync/clean-pages.ps1', 'sync/push-source.ps1'
)
# 只发布仓库文档目录中的当前版 ASCII 文档；旧版中文名文档不再进入远端 tree，避免出现 ???? 文件名。
Get-ChildItem -LiteralPath (Join-Path $root 'docs') -File -Filter '*.md' -Force |
    Where-Object { $_.Name -match '^0[0-9]-' } |
    ForEach-Object {
        $paths += 'docs/' + $_.Name
    }
$dirs = @('src', 'public', 'ai-server')
foreach ($dir in $dirs) {
    Get-ChildItem -LiteralPath (Join-Path $root $dir) -Recurse -File -Force | ForEach-Object {
        $rel = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
        # 保留 ai-server/.env.example；其余环境文件、依赖、构建产物、上传目录均排除。
        if ($rel -match 'node_modules|\.next|/uploads/|tsconfig\.tsbuildinfo$') {
            return
        }
        if ($rel -match '(^|/)\.env\.local$|(^|/)\.env$') {
            return
        }
        $paths += $rel
    }
}
$paths = $paths | Sort-Object -Unique

# 发布前硬性隐私检查：不允许用户数据、密钥、备份、私密目录进入 tree。
$forbidden = @(
    'data/users.json', 'data/.jwt-secret', 'data/guestbook.json',
    'private/', 'qa/', '_shots/', '_backup/'
)
foreach ($rel in $paths) {
    foreach ($prefix in $forbidden) {
        if ($rel -eq $prefix.TrimEnd('/') -or $rel.StartsWith($prefix)) {
            throw "forbidden path in publish list: $rel"
        }
    }
}
foreach ($rel in $paths) {
    $file = Join-Path $root ($rel.Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $file)) { throw "missing source file: $rel" }
    $hit = Select-String -LiteralPath $file -Pattern 'ADMIN_PASSWORD\s*=\s*(?!replace-with-a-strong-password)[A-Za-z0-9!@#$%^&*()_+=-]{8,}|LLM_API_KEY\s*=\s*sk-(?!your-server-side-key)[A-Za-z0-9]|Bearer\s+[A-Za-z0-9]{20,}' -ErrorAction SilentlyContinue
    if ($hit) { throw "possible secret in publish file: $rel" }
}

Write-Output "Repo: $Owner/$Repo ($Branch), files: $($paths.Count)"
$ref = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/ref/heads/$Branch"
$commit = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/commits/$($ref.object.sha)"
$baseTree = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/trees/$($commit.tree.sha)?recursive=1"
Write-Output "Base commit: $($ref.object.sha)"

function Get-GitBlobSha {
    param([byte[]] $Bytes)
    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    try {
        $header = [Text.Encoding]::UTF8.GetBytes("blob $($Bytes.Length)`0")
        $buffer = New-Object byte[] ($header.Length + $Bytes.Length)
        [Array]::Copy($header, 0, $buffer, 0, $header.Length)
        [Array]::Copy($Bytes, 0, $buffer, $header.Length, $Bytes.Length)
        $hash = $sha1.ComputeHash($buffer)
        return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $sha1.Dispose()
    }
}

$existing = @{}
foreach ($item in $baseTree.tree) { if ($item.type -eq 'blob') { $existing[$item.path] = $item.sha } }

$entries = @()
foreach ($rel in $paths) {
    $file = Join-Path $root ($rel.Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $file)) { throw "missing source file: $rel" }
    $bytes = [IO.File]::ReadAllBytes($file)
    $localSha = Get-GitBlobSha -Bytes $bytes
    if ($existing.ContainsKey($rel) -and $existing[$rel] -eq $localSha) {
        $blobSha = $localSha
        Write-Output ("  = {0} {1} B (unchanged)" -f $rel, $bytes.Length)
    } else {
        $blobSha = (Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/blobs" -Body @{
            content = [Convert]::ToBase64String($bytes)
            encoding = 'base64'
        }).sha
        Write-Output ("  + {0} {1} B {2}" -f $rel, $bytes.Length, $blobSha.Substring(0, 8))
    }
    $entries += @{ path = $rel; mode = '100644'; type = 'blob'; sha = $blobSha }
}
$tree = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/trees" -Body @{ tree = $entries }
$newCommit = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/commits" -Body @{
    message = $Message
    tree = $tree.sha
    parents = @($ref.object.sha)
}
$updated = Invoke-GH -Method Patch -Uri "/repos/$Owner/$Repo/git/refs/heads/$Branch" -Body @{
    sha = $newCommit.sha
    force = $false
}
Write-Output "Tree: $($tree.sha)"
Write-Output "Commit: $($newCommit.sha)"
Write-Output "Updated $Branch -> $($updated.object.sha)"

