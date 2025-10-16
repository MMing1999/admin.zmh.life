#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class UpdateLogSync {
  constructor() {
    this.adminRepoPath = '/Users/zhangminghua/My_Projects/admin.zmh.life';
    this.websiteRepoPath = '/Users/zhangminghua/My_Projects/zmh.life';
    this.updateLogPath = path.join(this.adminRepoPath, 'data', 'update-log.json');
    this.targetPath = path.join(this.websiteRepoPath, 'src', 'assets', 'data', 'update-log.json');
  }
  
  async syncToWebsite() {
    try {
      console.log('🔄 开始同步更新日志到网站仓库...');
      
      // 检查源文件是否存在
      if (!fs.existsSync(this.updateLogPath)) {
        throw new Error(`更新日志文件不存在: ${this.updateLogPath}`);
      }
      
      // 复制文件
      fs.copyFileSync(this.updateLogPath, this.targetPath);
      console.log('✅ 文件复制完成');
      
      // 检查目标仓库是否存在
      if (!fs.existsSync(this.websiteRepoPath)) {
        console.log('⚠️  网站仓库不存在，跳过 Git 操作');
        return;
      }
      
      // 提交到网站仓库
      console.log('📝 提交到网站仓库...');
      execSync(`cd ${this.websiteRepoPath} && git add src/assets/data/update-log.json`, { stdio: 'inherit' });
      
      const commitMessage = `Update articles log - ${new Date().toISOString()}`;
      execSync(`cd ${this.websiteRepoPath} && git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      
      console.log('✅ 提交完成');
      
      // 推送到远程（可选）
      const shouldPush = process.argv.includes('--push');
      if (shouldPush) {
        console.log('🚀 推送到远程仓库...');
        execSync(`cd ${this.websiteRepoPath} && git push`, { stdio: 'inherit' });
        console.log('✅ 推送完成');
      } else {
        console.log('💡 提示：使用 --push 参数可以自动推送到远程仓库');
      }
      
      console.log('🎉 同步完成！');
      
    } catch (error) {
      console.error('❌ 同步失败:', error.message);
      process.exit(1);
    }
  }
  
  async validateUpdateLog() {
    try {
      console.log('🔍 验证更新日志文件...');
      
      const data = JSON.parse(fs.readFileSync(this.updateLogPath, 'utf8'));
      
      // 基本验证
      if (!data.version || !data.lastUpdated || !data.articles) {
        throw new Error('更新日志文件格式不正确');
      }
      
      console.log(`📊 统计信息:`);
      console.log(`   - 总文章数: ${data.totalArticles}`);
      console.log(`   - 观察文章: ${data.statistics.byType.observation || 0}`);
      console.log(`   - 写作文章: ${data.statistics.byType.writing || 0}`);
      console.log(`   - 阅读文章: ${data.statistics.byType.reading || 0}`);
      console.log(`   - 最后更新: ${data.lastUpdated}`);
      
      // 验证文章数据
      const requiredFields = ['id', 'slug', 'title', 'type', 'publishDate', 'url'];
      for (const article of data.articles) {
        for (const field of requiredFields) {
          if (!article[field]) {
            throw new Error(`文章 ${article.id || 'unknown'} 缺少必需字段: ${field}`);
          }
        }
      }
      
      console.log('✅ 更新日志文件验证通过');
      return true;
      
    } catch (error) {
      console.error('❌ 验证失败:', error.message);
      return false;
    }
  }
}

// 主函数
async function main() {
  const sync = new UpdateLogSync();
  
  // 验证更新日志
  const isValid = await sync.validateUpdateLog();
  if (!isValid) {
    process.exit(1);
  }
  
  // 同步到网站
  await sync.syncToWebsite();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = UpdateLogSync;
