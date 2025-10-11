#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: '../../.env.local' });

// Notion API 配置
const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const IDEAS_DATABASE_ID = process.env.IDEAS_DATABASE_ID;
const QUESTIONS_DATABASE_ID = process.env.QUESTIONS_DATABASE_ID;

// 验证必需的环境变量
if (!NOTION_API_TOKEN) {
  throw new Error("Missing NOTION_API_TOKEN (check .env.local / GitHub Secrets / Vercel).");
}

// 数据存储路径
const DATA_DIR = path.join(__dirname, '../src/_data');
const IDEAS_FILE = path.join(DATA_DIR, 'notion-ideas.js');
const QUESTIONS_FILE = path.join(DATA_DIR, 'notion-questions.js');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 模拟 Notion API 调用（实际使用时需要替换为真实的 Notion API）
async function fetchNotionData() {
  console.log('🔄 开始从 Notion 获取数据...');
  
  try {
    // 这里应该调用真实的 Notion API
    // 目前使用模拟数据
    const mockIdeas = [
      {
        id: '1',
        content: '设计一个更直观的用户界面，让用户能够快速找到所需功能',
        date: new Date('2025-01-01T10:00:00Z'),
        tags: ['设计', 'UI/UX']
      },
      {
        id: '2', 
        content: '探索新的交互模式，提升用户体验',
        date: new Date('2025-01-02T14:30:00Z'),
        tags: ['交互设计', '创新']
      },
      {
        id: '3',
        content: '研究色彩心理学在界面设计中的应用',
        date: new Date('2025-01-03T16:45:00Z'),
        tags: ['色彩', '心理学', '设计理论']
      }
    ];

    const mockQuestions = [
      {
        id: '1',
        content: '如何平衡功能丰富性和界面简洁性？',
        date: new Date('2025-01-01T09:00:00Z'),
        tags: ['设计思考']
      },
      {
        id: '2',
        content: '用户在不同设备上的使用习惯有什么差异？',
        date: new Date('2025-01-02T11:15:00Z'),
        tags: ['用户研究', '多端适配']
      },
      {
        id: '3',
        content: '如何设计无障碍访问功能？',
        date: new Date('2025-01-03T13:20:00Z'),
        tags: ['无障碍设计', '包容性']
      },
      {
        id: '4',
        content: '数据可视化如何更好地传达信息？',
        date: new Date('2025-01-04T15:30:00Z'),
        tags: ['数据可视化', '信息设计']
      }
    ];

    // 生成 JavaScript 数据文件
    const ideasContent = `// Notion 想法数据
// 这个文件由 scripts/fetch-notion-data.js 自动生成
module.exports = ${JSON.stringify(mockIdeas, null, 2)};`;

    const questionsContent = `// Notion 问题数据
// 这个文件由 scripts/fetch-notion-data.js 自动生成
module.exports = ${JSON.stringify(mockQuestions, null, 2)};`;

    // 保存数据到文件
    fs.writeFileSync(IDEAS_FILE, ideasContent);
    fs.writeFileSync(QUESTIONS_FILE, questionsContent);

    console.log('✅ Notion 数据获取完成');
    console.log(`📝 想法数量: ${mockIdeas.length}`);
    console.log(`❓ 问题数量: ${mockQuestions.length}`);
    
  } catch (error) {
    console.error('❌ 获取 Notion 数据失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fetchNotionData();
}

module.exports = { fetchNotionData };
