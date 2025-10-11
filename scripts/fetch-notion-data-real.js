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

// 格式化时间函数
function formatDateTime(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

// 使用模拟数据的函数
async function useMockData() {
  const mockIdeas = [
    {
      id: '1',
      content: 'idea1',
      date: new Date('2025-10-03T20:36:00Z'),
      tags: ['想法']
    },
    {
      id: '2', 
      content: 'ahiiiii书呜呜呜哈呜哈',
      date: new Date('2025-10-03T20:40:00Z'),
      tags: ['想法']
    },
    {
      id: '3',
      content: '页脚- 订阅更新功能,需要数据库+定期发送邮件工作流',
      date: new Date('2025-10-03T22:53:00Z'),
      tags: ['功能设计', '邮件系统']
    },
    {
      id: '4',
      content: 'idea1 (1)',
      date: new Date('2025-10-03T23:01:00Z'),
      tags: ['想法']
    },
    {
      id: '5',
      content: 'ahiiiii书呜呜呜哈呜哈 (1)',
      date: new Date('2025-10-03T23:01:00Z'),
      tags: ['想法']
    }
  ];

  const mockQuestions = [
    {
      id: '1',
      content: '如何实现订阅更新功能的邮件工作流？',
      date: new Date('2025-10-03T20:36:00Z'),
      tags: ['技术问题', '邮件系统']
    },
    {
      id: '2',
      content: '数据库设计需要考虑哪些因素？',
      date: new Date('2025-10-03T20:40:00Z'),
      tags: ['数据库', '架构设计']
    },
    {
      id: '3',
      content: '如何优化用户订阅体验？',
      date: new Date('2025-10-03T22:53:00Z'),
      tags: ['用户体验', '产品设计']
    }
  ];

  // 生成 JavaScript 数据文件
  const ideasContent = `// Notion 想法数据（模拟数据）
// 这个文件由 scripts/fetch-notion-data-real.js 自动生成
module.exports = ${JSON.stringify(mockIdeas, null, 2)};`;

  const questionsContent = `// Notion 问题数据（模拟数据）
// 这个文件由 scripts/fetch-notion-data-real.js 自动生成
module.exports = ${JSON.stringify(mockQuestions, null, 2)};`;

  // 保存数据到文件
  fs.writeFileSync(IDEAS_FILE, ideasContent);
  fs.writeFileSync(QUESTIONS_FILE, questionsContent);

  console.log('✅ 模拟数据生成完成');
  console.log(`📝 想法数量: ${mockIdeas.length}`);
  console.log(`❓ 问题数量: ${mockQuestions.length}`);
  
  // 显示获取到的数据
  console.log('\n📋 获取到的想法:');
  mockIdeas.forEach((idea, index) => {
    console.log(`  ${index + 1}. ${idea.content} (${formatDateTime(idea.date)})`);
  });
  
  console.log('\n❓ 获取到的问题:');
  mockQuestions.forEach((question, index) => {
    console.log(`  ${index + 1}. ${question.content} (${formatDateTime(question.date)})`);
  });
}

// 真实的 Notion API 调用函数
async function fetchNotionDataReal() {
  console.log('🔄 开始从 Notion API 获取真实数据...');
  
  // 如果数据库 ID 未设置，先使用模拟数据
  if (!IDEAS_DATABASE_ID || !QUESTIONS_DATABASE_ID) {
    console.log('⚠️  数据库 ID 未设置，使用模拟数据');
    await useMockData();
    return;
  }
  
  try {
    const { Client } = require('@notionhq/client');
    const notion = new Client({
      auth: NOTION_API_TOKEN,
    });

    // 查询想法数据库
    const ideasResponse = await notion.databases.query({
      database_id: IDEAS_DATABASE_ID,
    });

    // 查询问题数据库  
    const questionsResponse = await notion.databases.query({
      database_id: QUESTIONS_DATABASE_ID,
    });

    const ideas = [];
    const questions = [];

    // 处理想法查询结果
    for (const page of ideasResponse.results) {
      const properties = page.properties;
      
      // 获取页面标题（假设有一个名为 "Name" 或 "Title" 的字段）
      let content = '';
      if (properties.Name?.title) {
        content = properties.Name.title.map(t => t.plain_text).join('');
      } else if (properties.Title?.title) {
        content = properties.Title.title.map(t => t.plain_text).join('');
      } else if (properties['Aa name']?.title) {
        content = properties['Aa name'].title.map(t => t.plain_text).join('');
      }
      
      // 获取创建时间
      let createTime = page.created_time;
      if (properties['L createTime']?.created_time) {
        createTime = properties['L createTime'].created_time;
      } else if (properties['createTime']?.created_time) {
        createTime = properties['createTime'].created_time;
      }
      
      if (content) {
        const item = {
          id: page.id,
          content: content,
          date: new Date(createTime),
          tags: ['Notion数据']
        };

        ideas.push(item);
      }
    }

    // 处理问题查询结果
    for (const page of questionsResponse.results) {
      const properties = page.properties;
      
      // 获取页面标题
      let content = '';
      if (properties.Name?.title) {
        content = properties.Name.title.map(t => t.plain_text).join('');
      } else if (properties.Title?.title) {
        content = properties.Title.title.map(t => t.plain_text).join('');
      } else if (properties['Aa name']?.title) {
        content = properties['Aa name'].title.map(t => t.plain_text).join('');
      }
      
      // 获取创建时间
      let createTime = page.created_time;
      if (properties['L createTime']?.created_time) {
        createTime = properties['L createTime'].created_time;
      } else if (properties['createTime']?.created_time) {
        createTime = properties['createTime'].created_time;
      }
      
      if (content) {
        const item = {
          id: page.id,
          content: content,
          date: new Date(createTime),
          tags: ['Notion数据']
        };

        questions.push(item);
      }
    }

    // 生成 JavaScript 数据文件
    const ideasContent = `// Notion 想法数据
// 这个文件由 scripts/fetch-notion-data-real.js 自动生成
module.exports = ${JSON.stringify(ideas, null, 2)};`;

    const questionsContent = `// Notion 问题数据
// 这个文件由 scripts/fetch-notion-data-real.js 自动生成
module.exports = ${JSON.stringify(questions, null, 2)};`;

    // 保存数据到文件
    fs.writeFileSync(IDEAS_FILE, ideasContent);
    fs.writeFileSync(QUESTIONS_FILE, questionsContent);

    console.log('✅ Notion API 数据获取完成');
    console.log(`📝 想法数量: ${ideas.length}`);
    console.log(`❓ 问题数量: ${questions.length}`);
    
    // 显示获取到的数据
    console.log('\n📋 获取到的想法:');
    ideas.forEach((idea, index) => {
      console.log(`  ${index + 1}. ${idea.content} (${formatDateTime(idea.date)})`);
    });
    
    console.log('\n❓ 获取到的问题:');
    questions.forEach((question, index) => {
      console.log(`  ${index + 1}. ${question.content} (${formatDateTime(question.date)})`);
    });
    
  } catch (error) {
    console.error('❌ 获取 Notion API 数据失败:', error.message);
    console.log('💡 请确保：');
    console.log('   1. Notion API Key 正确');
    console.log('   2. 数据库 ID 正确');
    console.log('   3. 数据库权限设置正确');
    console.log('   4. 数据库字段名称正确');
    
    // 如果 API 调用失败，使用模拟数据
    console.log('\n🔄 使用模拟数据...');
    await useMockData();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fetchNotionDataReal();
}

module.exports = { fetchNotionDataReal, formatDateTime };
