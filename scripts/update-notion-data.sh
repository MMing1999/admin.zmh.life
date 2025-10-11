#!/bin/bash

# Notion 数据自动更新脚本
# 每6小时运行一次

echo "🔄 开始更新 Notion 数据..."

# 进入项目目录
cd "$(dirname "$0")/.."

# 运行数据获取脚本
node scripts/fetch-notion-data.js

# 检查是否成功
if [ $? -eq 0 ]; then
    echo "✅ Notion 数据更新成功"
    
    # 如果 Eleventy 服务器在运行，触发重新构建
    if pgrep -f "eleventy.*8085" > /dev/null; then
        echo "🔄 触发 Eleventy 重新构建..."
        # 这里可以添加触发重新构建的逻辑
        # 比如发送信号或调用 API
    fi
else
    echo "❌ Notion 数据更新失败"
    exit 1
fi

echo "⏰ 下次更新将在6小时后进行"
