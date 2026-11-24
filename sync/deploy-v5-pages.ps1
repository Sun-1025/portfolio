param(
  [string] $Owner = 'Sun-1025',
  [string] $Repo = 'Sun-1025.github.io',
  [string] $Branch = 'main'
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
    'User-Agent' = 'Doubao-Deploy'
    'X-GitHub-Api-Version' = '2022-11-28'
}

function Invoke-GH {
    param(
        [Parameter(Mandatory)] [string] $Method,
        [Parameter(Mandatory)] [string] $Uri,
        [object] $Body
    )
    $params = @{ Method = $Method; Uri = "https://api.github.com$Uri"; Headers = $headers; TimeoutSec = 90 }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 100 -Compress)
    }
    Invoke-RestMethod @params
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $root 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $dist 'index.html'))) { throw "dist/index.html missing" }

Write-Output "Repo: $Owner/$Repo ($Branch)"
$ref = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/ref/heads/$Branch"
$baseCommit = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/commits/$($ref.object.sha)"
$baseTree = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/trees/$($baseCommit.tree.sha)?recursive=1"
Write-Output "Base commit: $($ref.object.sha)"
Write-Output "Base tree: $($baseCommit.tree.sha) ($($baseTree.tree.Count) entries)"

$entries = @()
$files = Get-ChildItem -LiteralPath $dist -Recurse -File -Force
foreach ($file in $files) {
    $remote = $file.FullName.Substring($dist.Length + 1).Replace('\', '/')
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $blob = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/blobs" -Body @{
        content = [Convert]::ToBase64String($bytes)
        encoding = 'base64'
    }
    $entries += @{ path = $remote; mode = '100644'; type = 'blob'; sha = $blob.sha }
    Write-Output ("  {0} {1} B {2}" -f $remote, $bytes.Length, $blob.sha.Substring(0, 8))
}

$cname = $baseTree.tree | Where-Object { $_.path -eq 'CNAME' -and $_.type -eq 'blob' } | Select-Object -First 1
if ($cname) {
    $entries += @{ path = 'CNAME'; mode = '100644'; type = 'blob'; sha = $cname.sha }
    Write-Output "  CNAME (preserved) $($cname.sha.Substring(0, 8))"
}

$tree = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/trees" -Body @{
    tree = $entries
}
$newCommit = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/commits" -Body @{
    message = 'feat: rebuild portfolio v5 — clean static package, real photos, archive classic'
    tree = $tree.sha
    parents = @($ref.object.sha)
}
Write-Output "New tree: $($tree.sha)"
Write-Output "New commit: $($newCommit.sha)"
$updated = Invoke-GH -Method Patch -Uri "/repos/$Owner/$Repo/git/refs/heads/$Branch" -Body @{
    sha = $newCommit.sha
    force = $false
}
Write-Output "Updated $Branch -> $($updated.object.sha)"
