#!/bin/bash

echo "正在安装tui-editor依赖..."

# 进入项目目录
cd "$(dirname "$0")"

# 安装tui-editor
echo "安装 @toast-ui/editor..."
npm install @toast-ui/editor@3.2.2

# 检查安装结果
echo "检查安装结果..."
node test-editor.js

echo "安装完成！现在可以启动服务器测试编辑器了。"
echo "运行: npm start"

