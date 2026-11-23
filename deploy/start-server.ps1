# 启动个人站服务（Windows / PowerShell 7）
# 用法：powershell -ExecutionPolicy Bypass -File deploy\start-server.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules'))) {
  Write-Host '未找到 node_modules，正在安装依赖…'
  npm install
}

$port = if ($env:PORT) { [int]$env:PORT } else { 8080 }
$existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "端口 $port 已有服务在监听，PID=$($existing[0].OwningProcess)。"
  exit 0
}

$out = Join-Path $root 'server.out.log'
$err = Join-Path $root 'server.err.log'
$process = Start-Process -FilePath 'node' -ArgumentList 'server.js' `
  -WorkingDirectory $root `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err `
  -WindowStyle Hidden -PassThru

Start-Sleep -Seconds 2
Write-Host "已启动，PID=$($process.Id)"
Write-Host "本机：http://localhost:$port"
Write-Host "后台：http://localhost:$port/admin"
Write-Host "日志：$out / $err"
