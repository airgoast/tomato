@echo off
echo ========================================
echo       Git 一键提交推送工具
echo ========================================
echo.

REM 检查是否有变更
git status | findstr "nothing to commit" >nul
if %errorlevel% == 0 (
    echo [提示] 没有需要提交的变更
    pause
    exit /b
)

REM 设置提交信息
set /p message=请输入提交信息（默认：更新代码）:
if "%message%"=="" set message=更新代码

echo.
echo [1/3] 添加文件到暂存区...
git add .

echo [2/3] 提交更改...
git commit -m "%message%"

echo [3/3] 推送到远程仓库...
git push

echo.
echo ========================================
echo       完成！
echo ========================================
pause
