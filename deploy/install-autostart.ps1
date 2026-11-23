# 注册开机/登录自启（当前用户登录时启动，无需管理员权限）
# 用法：powershell -ExecutionPolicy Bypass -File deploy\install-autostart.ps1

$root = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $root 'deploy\start-server.ps1'
$taskName = 'PortfolioV2-Server'

# 用当前正在运行的 PowerShell 解释器路径，兼容 pwsh 7 与 Windows PowerShell 5.1
$shell = (Get-Process -Id $PID).Path
$action = "`"$shell`" -NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
schtasks /Create /SC ONLOGON /TN $taskName /TR $action /F

Write-Host ''
Write-Host "已注册计划任务：$taskName"
Write-Host '下次登录 Windows 会自动启动服务。'
Write-Host "立即测试：schtasks /Run /TN $taskName"
Write-Host "取消自启：powershell -ExecutionPolicy Bypass -File deploy\uninstall-autostart.ps1"
