Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Git 一键提交推送工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否有变更
$status = git status
if ($status -match "nothing to commit") {
    Write-Host "[提示] 没有需要提交的变更" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit
}

# 设置提交信息
$message = Read-Host "请输入提交信息（默认：更新代码）"
if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "更新代码"
}

Write-Host ""
Write-Host "[1/3] 添加文件到暂存区..." -ForegroundColor Green
git add .

Write-Host "[2/3] 提交更改..." -ForegroundColor Green
git commit -m $message

Write-Host "[3/3] 推送到远程仓库..." -ForegroundColor Green
git push

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Read-Host "按回车键退出"
