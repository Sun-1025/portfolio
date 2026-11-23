# 停止个人站服务
# 用法：powershell -ExecutionPolicy Bypass -File deploy\stop-server.ps1

$port = if ($env:PORT) { [int]$env:PORT } else { 8080 }
$connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
  Write-Host "端口 $port 没有监听中的服务。"
  exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
  try {
    Stop-Process -Id $procId -Force
    Write-Host "已停止 PID=$procId"
  } catch {
    Write-Host "停止 PID=$procId 失败：$($_.Exception.Message)"
  }
}
