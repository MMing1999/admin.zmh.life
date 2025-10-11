const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const yaml = require('js-yaml');

const app = express();
const PORT = 3000;

// 配置
const CODING_PATH = '/Users/zhangminghua/My_Projects/mywebsite/zmh.life-main';
const ENTRIES_PATH = path.join(CODING_PATH, 'src/entries');
const PICS_PATH = path.join(CODING_PATH, 'src/assets/Pics');

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加JSON请求体大小限制
app.use(express.urlencoded({ limit: '50mb', extended: true })); // 增加URL编码请求体大小限制
app.use(express.static('public'));
app.use('/font', express.static('font'));
app.use('/pics', express.static('pics'));
app.use('/node_modules', express.static('node_modules'));
app.use('/plugins', express.static('../plugins'));
app.use('/assets', express.static(path.join(CODING_PATH, 'src/assets')));

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `image-${timestamp}${ext}`);
  }
});

const upload = multer({ storage: storage });

// Section配置
const SECTIONS = {
  'zhi': { name: 'zhi', displayName: '知识分享', description: '技术文章、学习笔记、经验分享' },
  'xing': { name: 'xing', displayName: '作品展示', description: '设计作品、开发项目、创意展示' },
  'he': { name: 'he', displayName: '合作项目', description: '团队合作、商业项目、客户作品' },
  'yi': { name: 'yi', displayName: '个人项目', description: '个人实验、兴趣爱好、生活记录' }
};

// 确保目录存在
async function ensureDirectories() {
  const sections = Object.keys(SECTIONS);
  for (const section of sections) {
    await fs.ensureDir(path.join(ENTRIES_PATH, section));
    await fs.ensureDir(path.join(PICS_PATH, section));
  }
  await fs.ensureDir('uploads');
  await fs.ensureDir('temp'); // 确保临时文件目录存在
}

// 图片处理配置
const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_WIDTH = 1920;  // 16:9 比例
const MAX_HEIGHT = 1080; // 16:9 比例

// 版权信息
const COPYRIGHT_INFO = {
  Creator: 'Zhang Minghua',
  'Copyright Notice': '© 2025 Zhang Minghua. All Rights Reserved. 版权所有，禁止未经许可的使用。',
  'Rights Usage Terms': '仅限个人浏览和学习，禁止商用或修改。For personal viewing and study only. Commercial use prohibited without permission.',
  'Contact Info': 'minghua.work@gmail.com'
};

// 优化的图片处理函数：压缩到2MB以内，转换为PNG，添加版权信息
async function processImageOptimized(inputPath, outputPath, title, altText) {
  let quality = 90;
  let currentSize = 0;
  
  // 循环调整质量直到文件大小符合要求
  while (quality >= 10) {
    try {
      await sharp(inputPath)
        .resize({
          width: MAX_WIDTH,
          height: MAX_HEIGHT,
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
        .png({ 
          quality: quality,
          compressionLevel: 9,
          adaptiveFiltering: true
        })
        .withMetadata({
          exif: {
            IFD0: {
              Artist: COPYRIGHT_INFO.Creator,
              Copyright: COPYRIGHT_INFO['Copyright Notice'],
              ImageDescription: COPYRIGHT_INFO['Rights Usage Terms'],
              Software: 'ZMH Portfolio Editor'
            }
          }
        })
        .toFile(outputPath);
      
      // 检查文件大小
      const stats = await fs.stat(outputPath);
      currentSize = stats.size;
      
      console.log(`图片处理: 质量${quality}%, 大小${(currentSize / 1024 / 1024).toFixed(2)}MB`);
      
      if (currentSize <= MAX_FILE_SIZE_BYTES) {
        console.log(`✅ 图片优化成功: ${(currentSize / 1024 / 1024).toFixed(2)}MB`);
        break;
      }
      
      // 如果还是太大，降低质量
      quality -= 10;
      
    } catch (error) {
      console.error('图片处理失败:', error);
      throw error;
    }
  }
  
  if (currentSize > MAX_FILE_SIZE_BYTES) {
    console.warn(`⚠️ 图片仍然过大: ${(currentSize / 1024 / 1024).toFixed(2)}MB，但已达到最低质量限制`);
  }
  
  return outputPath;
}

// 生成slug
function generateSlug(title) {
  if (!title) return 'untitled';
  
  return title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '') // 保留中文字符
    .replace(/\s+/g, '-')
    .trim() || 'untitled'; // 如果结果为空，使用默认名称
}

// 生成项目内容
function generateProjectContent(data) {
  const sectionConfig = SECTIONS[data.section];
  
  // 根据layout选择对应的CSS文件
  let pageCSS;
  if (data.layout === 'project') {
    pageCSS = '/assets/Css/project.css';
  } else if (data.layout === 'observation') {
    pageCSS = '/assets/Css/observation.css';
  } else {
    pageCSS = '/assets/Css/site.css';
  }
  
  const frontmatter = {
    section: data.section,
    layout: `layouts/${data.layout}.njk`,
    pageCSS: pageCSS,
    title: data.title,
    summary: data.summary,
    date: data.date,
    categories: data.categories,
    tags: data.tags,
    cover: data.cover || '',
  };
  
  // 根据布局添加不同的字段
  if (data.layout === 'project') {
    frontmatter.period = data.period || '';
    frontmatter.tools = data.tools || [];
    frontmatter.client = data.client || '';
    frontmatter.collaborators = data.collaborators || '';
    frontmatter.fee = data.fee || '';
    frontmatter.links = data.links || {};
  } else if (data.layout === 'observation') {
    frontmatter.location = data.location || '';
    frontmatter.equipment = data.equipment || '';
    frontmatter.technique = data.technique || '';
    frontmatter.inspiration = data.inspiration || '';
  }

  const yamlContent = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${key}:\n  ${Object.entries(value).map(([k, v]) => `${k}: "${v}"`).join('\n  ')}`;
      }
      if (Array.isArray(value)) {
        return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
      }
      return `${key}: "${value}"`;
    })
    .join('\n');

  return `---\n${yamlContent}\n---\n`;
}

// API路由

// 获取所有sections
app.get('/api/sections', (req, res) => {
  res.json(Object.values(SECTIONS));
});

// 创建新项目
app.post('/api/projects', async (req, res) => {
    try {
        console.log('收到创建项目请求:', req.body);
        
        const { 
            section, 
            layout, 
            title, 
            summary, 
            date, 
            categories, 
            tags, 
            period, 
            tools, 
            client, 
            collaborators, 
            fee, 
            links 
        } = req.body;
        
        if (!section || !title || !summary) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const fileName = generateSlug(title) + '.md';
        const filePath = path.join(ENTRIES_PATH, section, fileName);
        
        // 检查文件是否已存在
        if (await fs.pathExists(filePath)) {
            return res.status(400).json({ error: '项目文件已存在' });
        }

        const content = generateProjectContent({
            section,
            layout: layout || 'project',
            title,
            summary,
            date: date || new Date().toISOString().split('T')[0],
            categories: categories || [],
            tags: tags || [],
            period: period || '',
            tools: tools ? tools.split(',').map(t => t.trim()) : [],
            client: client || '',
            collaborators: collaborators ? collaborators.split(',').map(c => c.trim()) : [],
            fee: fee || '',
            links: links || {}
        });
        
        await fs.writeFile(filePath, content, 'utf8');

        res.json({ 
            success: true, 
            message: '项目创建成功',
            filePath: filePath,
            fileName: fileName
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取草稿列表
app.get('/api/drafts', async (req, res) => {
  try {
    const drafts = [];
    const sections = Object.keys(SECTIONS);

    for (const section of sections) {
      const sectionPath = path.join(ENTRIES_PATH, section);
      if (await fs.pathExists(sectionPath)) {
        const files = await fs.readdir(sectionPath);
        
        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = path.join(sectionPath, file);
            try {
              const content = await fs.readFile(filePath, 'utf8');
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              
              if (frontmatterMatch) {
                const frontmatterText = frontmatterMatch[1];
                const frontmatter = {};
                
                frontmatterText.split('\n').forEach(line => {
                  const colonIndex = line.indexOf(':');
                  if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    let value = line.substring(colonIndex + 1).trim();
                    
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                      value = value.slice(1, -1);
                    }
                    
                    frontmatter[key] = value;
                  }
                });

                // 检查是否有内容（除了frontmatter）
                const contentAfterFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
                const hasContent = contentAfterFrontmatter.length > 0;

                drafts.push({
                  fileName: file,
                  filePath: filePath,
                  section: section,
                  title: frontmatter.title || '无标题',
                  summary: frontmatter.summary || '无描述',
                  date: frontmatter.date || new Date().toISOString().split('T')[0],
                  categories: frontmatter.categories || [],
                  tags: frontmatter.tags || [],
                  layout: frontmatter.layout || 'project',
                  hasContent: hasContent,
                  isDraft: !hasContent, // 没有内容的是草稿
                  isPublished: hasContent // 有内容的是已发布
                });
              }
            } catch (error) {
              console.error(`解析文件失败 ${filePath}:`, error);
            }
          }
        }
      }
    }

    // 按日期排序
    drafts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(drafts);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个项目详情
app.get('/api/projects/:section/:fileName', async (req, res) => {
  try {
    const { section, fileName } = req.params;
    const filePath = path.join(ENTRIES_PATH, section, fileName);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const content = await fs.readFile(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      return res.status(400).json({ error: '文件格式错误' });
    }

    const frontmatterText = frontmatterMatch[1];
    const frontmatter = {};
    
    frontmatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        frontmatter[key] = value;
      }
    });

    const contentAfterFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

    res.json({
      fileName: fileName,
      filePath: filePath,
      section: section,
      title: frontmatter.title || '无标题',
      summary: frontmatter.summary || '无描述',
      date: frontmatter.date || new Date().toISOString().split('T')[0],
      categories: frontmatter.categories || [],
      tags: frontmatter.tags || [],
      layout: frontmatter.layout || 'project',
      content: contentAfterFrontmatter,
      hasContent: contentAfterFrontmatter.length > 0
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新项目状态（锁定、隐藏等）
app.put('/api/projects/:section/:fileName/status', async (req, res) => {
  try {
    const { section, fileName } = req.params;
    const { isLocked, isHidden } = req.body;
    const filePath = path.join(ENTRIES_PATH, section, fileName);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const content = await fs.readFile(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      return res.status(400).json({ error: '文件格式错误' });
    }

    const frontmatterText = frontmatterMatch[1];
    const contentAfterFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    
    // 解析现有frontmatter
    const frontmatter = {};
    frontmatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        frontmatter[key] = value;
      }
    });

    // 更新状态
    if (isLocked !== undefined) {
      frontmatter.isLocked = isLocked;
    }
    if (isHidden !== undefined) {
      frontmatter.isHidden = isHidden;
    }

    // 重新生成frontmatter
    const newFrontmatter = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${key}:\n  ${Object.entries(value).map(([k, v]) => `${k}: "${v}"`).join('\n  ')}`;
        }
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        return `${key}: "${value}"`;
      })
      .join('\n');

    const newContent = `---\n${newFrontmatter}\n---\n${contentAfterFrontmatter}`;
    
    await fs.writeFile(filePath, newContent, 'utf8');

    res.json({ 
      success: true, 
      message: '状态更新成功',
      isLocked: frontmatter.isLocked || false,
      isHidden: frontmatter.isHidden || false
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除项目
app.delete('/api/projects/:section/:fileName', async (req, res) => {
  try {
    const { section, fileName } = req.params;
    const filePath = path.join(ENTRIES_PATH, section, fileName);
    
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      res.json({ success: true, message: '项目删除成功' });
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传图片
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const { section, projectTitle, alt } = req.body;
    
    if (!section || !projectTitle) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 生成文件名
    const timestamp = Date.now();
    const slug = generateSlug(projectTitle);
    const fileName = `${slug}-${timestamp}.png`; // 统一使用PNG格式
    const targetPath = path.join(PICS_PATH, section, fileName);

    // 使用优化的图片处理函数
    await processImageOptimized(req.file.path, targetPath, projectTitle, 'cover');

    // 删除临时文件
    await fs.remove(req.file.path);

    const relativePath = `/assets/Pics/${section}/${fileName}`;

    res.json({
      success: true,
      message: '图片上传成功',
      fileName: fileName,
      relativePath: relativePath,
      eleventyCode: `{% image "${relativePath}" "${alt || ''}" [400, 800] %}`,
      markdownCode: `<figure class="media">\n  <img src="${relativePath}" alt="${alt || ''}">\n  <figcaption>图注：${alt || ''}</figcaption>\n</figure>`
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 保存文章API - 覆盖保存到原文件
app.post('/api/save-article', async (req, res) => {
  try {
    const { section, fileName, content, title, summary, categories, tags, layout, period, tools, client, collaborators, fee, links } = req.body;
    
    if (!section || !fileName || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const filePath = path.join(ENTRIES_PATH, section, fileName);
    
    // 检查文件是否存在
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 读取现有文件内容
    const existingContent = await fs.readFile(filePath, 'utf8');
    
    // 解析front matter
    const frontmatterMatch = existingContent.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return res.status(400).json({ error: '文件格式错误' });
    }
    
    let frontmatter;
    try {
      frontmatter = yaml.load(frontmatterMatch[1]);
    } catch (error) {
      console.error('解析frontmatter失败:', error);
      return res.status(400).json({ error: 'frontmatter格式错误' });
    }
    
    // 更新frontmatter
    frontmatter.title = title;
    frontmatter.summary = summary;
    frontmatter.categories = categories || [];
    frontmatter.tags = tags || [];
    frontmatter.layout = layout || 'project';
    frontmatter.date = frontmatter.date || new Date().toISOString().split('T')[0];
    frontmatter.isDraft = false; // 保存时标记为非草稿
    frontmatter.period = period || '';
    frontmatter.tools = tools || '';
    frontmatter.client = client || '';
    frontmatter.collaborators = collaborators || '';
    frontmatter.fee = fee || '';
    frontmatter.links = links || [];
    
    // 处理内容中的图片上传
    const processedContent = await processImagesInContent(content, section, title);
    
    // 重新组合文件内容
    const newContent = `---\n${yaml.dump(frontmatter)}---\n\n${processedContent}`;
    
    // 写入文件
    await fs.writeFile(filePath, newContent, 'utf8');

    res.json({ 
      success: true, 
      message: '文章保存成功',
      fileName: fileName,
      filePath: filePath
    });

  } catch (error) {
    console.error('保存文章失败:', error);
    res.status(500).json({ error: '保存文章失败: ' + error.message });
  }
});

// 发布内容到GitHub
app.post('/api/publish-content', async (req, res) => {
  try {
    const { section, fileName, content, title } = req.body;
    
    if (!section || !fileName || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const filePath = path.join(ENTRIES_PATH, section, fileName);
    
    // 检查文件是否存在
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: '项目文件不存在，请先创建项目' });
    }

    // 读取现有文件内容
    const existingContent = await fs.readFile(filePath, 'utf8');
    
    // 解析front matter
    const frontmatterMatch = existingContent.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return res.status(400).json({ error: '文件格式错误' });
    }
    
    const frontmatter = frontmatterMatch[1];
    
    // 处理内容中的图片上传
    const processedContent = await processImagesInContent(content, section, title);
    
    // 重新组合文件内容
    const newContent = `---\n${frontmatter}\n---\n\n${processedContent}`;
    
    // 写入文件
    await fs.writeFile(filePath, newContent, 'utf8');

    // 提交到GitHub
    const timestamp = new Date().toLocaleString('zh-CN');
    const commitMessage = `发布项目: ${title} - ${timestamp}`;
    await pushToGitHub(commitMessage);

    res.json({ 
      success: true, 
      message: '发布成功！网站将自动更新',
      filePath: filePath
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Git推送函数
async function pushToGitHub(commitMessage) {
  const git = simpleGit(CODING_PATH);
  
  // 添加所有更改
  await git.add('.');
  
  // 提交
  const timestamp = new Date().toLocaleString('zh-CN');
  const finalCommitMessage = commitMessage || `更新项目内容 - ${timestamp}`;
  await git.commit(finalCommitMessage);
  
  // 推送
  console.log('开始推送到GitHub...');
  
  // 添加重试机制
  let pushSuccess = false;
  let lastError = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`推送尝试 ${attempt}/3...`);
      
      const pushPromise = git.push('origin', 'main').catch(async () => {
        // 如果main分支不存在，尝试master分支
        console.log('main分支推送失败，尝试master分支...');
        return await git.push('origin', 'master');
      });
      
      // 减少超时时间到15秒
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('GitHub推送超时')), 15000);
      });
      
      await Promise.race([pushPromise, timeoutPromise]);
      console.log('GitHub推送成功');
      pushSuccess = true;
      break;
      
    } catch (error) {
      lastError = error;
      console.log(`推送尝试 ${attempt} 失败:`, error.message);
      
      if (attempt < 3) {
        console.log('等待2秒后重试...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  if (!pushSuccess) {
    throw new Error(`GitHub推送失败 (3次尝试): ${lastError.message}`);
  }
}

// 处理内容中的图片
async function processImagesInContent(content, section, title) {
  // 查找所有图片引用
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let processedContent = content;
  let match;
  
  while ((match = imageRegex.exec(content)) !== null) {
    const [fullMatch, altText, imagePath] = match;
    
    // 如果是base64图片，需要处理
    if (imagePath.startsWith('data:image/')) {
      try {
        const processedImagePath = await uploadBase64Image(imagePath, section, title, altText);
        processedContent = processedContent.replace(fullMatch, `<img src="${processedImagePath}" alt="${altText}">`);
      } catch (error) {
        console.error('处理图片失败:', error);
      }
    }
  }
  
  return processedContent;
}

// 上传base64图片（使用优化处理）
async function uploadBase64Image(base64Data, section, title, altText) {
  try {
    // 解析base64数据
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('无效的base64图片数据');
    }
    
    const [, imageType, base64String] = matches;
    const imageBuffer = Buffer.from(base64String, 'base64');
    
    // 生成文件名（清理altText中的扩展名）
    const timestamp = Date.now();
    const slug = generateSlug(title);
    const cleanAltText = (altText || 'image').replace(/\.[^/.]+$/, ''); // 移除扩展名
    const fileName = `${slug}-${timestamp}-${cleanAltText}.png`; // 统一使用PNG格式
    const targetPath = path.join(PICS_PATH, section, fileName);
    
    // 创建临时文件
    const tempPath = path.join(__dirname, 'temp', `temp-${timestamp}.${imageType}`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeFile(tempPath, imageBuffer);
    
    // 使用优化的图片处理函数
    await processImageOptimized(tempPath, targetPath, title, cleanAltText);
    
    // 清理临时文件
    await fs.remove(tempPath);
    
    const relativePath = `/assets/Pics/${section}/${fileName}`;
    return relativePath;
    
  } catch (error) {
    console.error('上传base64图片失败:', error);
    throw error;
  }
}

// 部署到GitHub
app.post('/api/deploy', async (req, res) => {
  try {
    const git = simpleGit(CODING_PATH);
    
    // 检查是否有更改
    const status = await git.status();
    if (status.files.length === 0) {
      return res.json({ success: true, message: '没有检测到任何更改' });
    }

    // 使用公共推送函数
    await pushToGitHub();

    res.json({ success: true, message: '成功部署到GitHub！' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
async function startServer() {
  await ensureDirectories();
  
  app.listen(PORT, () => {
    console.log(`🚀 ZMH Portfolio Editor 已启动！`);
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`📁 项目路径: ${CODING_PATH}`);
  });
}

startServer().catch(console.error);
