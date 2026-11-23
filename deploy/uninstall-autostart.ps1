# 取消开机/登录自启
# 用法：powershell -ExecutionPolicy Bypass -File deploy\uninstall-autostart.ps1

$taskName = 'PortfolioV2-Server'
schtasks /Delete /TN $taskName /F
Write-Host "已删除计划任务：$taskName"
