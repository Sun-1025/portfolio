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
    'User-Agent' = 'Doubao-Clean'
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
$dist = Join-Path $root 'dist'
$distPaths = @(Get-ChildItem -LiteralPath $dist -Recurse -File -Force | ForEach-Object {
    $_.FullName.Substring($dist.Length + 1).Replace('\', '/')
})

$ref = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/ref/heads/$Branch"
$commit = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/commits/$($ref.object.sha)"
$tree = Invoke-GH -Method Get -Uri "/repos/$Owner/$Repo/git/trees/$($commit.tree.sha)?recursive=1"
$byPath = @{}
foreach ($entry in $tree.tree) { $byPath[$entry.path] = $entry }

Write-Output "Current commit: $($ref.object.sha)"
Write-Output "Tree blobs: $(($tree.tree | Where-Object { $_.type -eq 'blob' }).Count)"
$hasCname = $byPath.ContainsKey('CNAME') -and $byPath['CNAME'].type -eq 'blob'
Write-Output "CNAME present: $hasCname"

$keep = $distPaths
if ($hasCname) { $keep += 'CNAME' }
$entries = @()
foreach ($path in ($keep | Sort-Object -Unique)) {
    if (-not $byPath.ContainsKey($path)) { throw "Missing blob for $path" }
    $entry = $byPath[$path]
    $entries += @{ path = $path; mode = '100644'; type = 'blob'; sha = $entry.sha }
}
if (-not $hasCname) { Write-Output 'WARN: CNAME not present; custom domain may not persist.' }

$cleanTree = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/trees" -Body @{ tree = $entries }
$newCommit = Invoke-GH -Method Post -Uri "/repos/$Owner/$Repo/git/commits" -Body @{
    message = 'chore: remove stale v4 assets from Pages'
    tree = $cleanTree.sha
    parents = @($ref.object.sha)
}
$updated = Invoke-GH -Method Patch -Uri "/repos/$Owner/$Repo/git/refs/heads/$Branch" -Body @{
    sha = $newCommit.sha
    force = $false
}
Write-Output "Clean tree: $($cleanTree.sha)"
Write-Output "Commit: $($newCommit.sha)"
Write-Output "Updated $Branch -> $($updated.object.sha)"
