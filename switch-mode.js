const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../plugins/config.json');
const htmlPath = path.join(__dirname, 'public/index.html');

function switchMode(mode) {
    try {
        // 读取配置文件
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.mode = mode;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // 读取HTML文件
        const html = fs.readFileSync(htmlPath, 'utf8');
        const editorConfig = config['toast-ui-editor'][mode];
        
        // 替换CSS和JS引用
        let newHtml = html;
        
        // 替换CSS链接
        newHtml = newHtml.replace(
            /href="[^"]*toastui-editor[^"]*\.css"/g, 
            `href="${editorConfig.css}"`
        );
        
        // 替换JS脚本
        newHtml = newHtml.replace(
            /src="[^"]*toastui-editor[^"]*\.js"/g, 
            `src="${editorConfig.js}"`
        );
        
        // 写回HTML文件
        fs.writeFileSync(htmlPath, newHtml);
        
        console.log(`✅ 已切换到 ${mode} 模式`);
        console.log(`📁 CSS: ${editorConfig.css}`);
        console.log(`📁 JS:  ${editorConfig.js}`);
        
        // 检查文件是否存在（本地模式）
        if (mode === 'local') {
            const cssPath = path.join(__dirname, '..', editorConfig.css.replace('/plugins/', 'plugins/'));
            const jsPath = path.join(__dirname, '..', editorConfig.js.replace('/plugins/', 'plugins/'));
            
            if (!fs.existsSync(cssPath)) {
                console.log(`⚠️  警告: CSS文件不存在 ${cssPath}`);
            }
            if (!fs.existsSync(jsPath)) {
                console.log(`⚠️  警告: JS文件不存在 ${jsPath}`);
            }
        }
        
    } catch (error) {
        console.error('❌ 切换失败:', error.message);
        process.exit(1);
    }
}

function showStatus() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const editorConfig = config['toast-ui-editor'][config.mode];
        
        console.log(`📊 当前模式: ${config.mode}`);
        console.log(`📁 CSS: ${editorConfig.css}`);
        console.log(`📁 JS:  ${editorConfig.js}`);
        console.log(`📦 版本: ${config.version}`);
        
    } catch (error) {
        console.error('❌ 读取配置失败:', error.message);
    }
}

// 命令行参数处理
const command = process.argv[2];
const mode = process.argv[3];

switch (command) {
    case 'local':
        switchMode('local');
        break;
    case 'remote':
        switchMode('remote');
        break;
    case 'status':
        showStatus();
        break;
    default:
        console.log('🔄 Toast UI Editor 模式切换工具');
        console.log('');
        console.log('使用方法:');
        console.log('  node switch-mode.js local   # 切换到本地模式');
        console.log('  node switch-mode.js remote  # 切换到远程模式');
        console.log('  node switch-mode.js status  # 查看当前状态');
        console.log('');
        console.log('📥 首次使用请先下载编辑器:');
        console.log('  cd ../plugins');
        console.log('  chmod +x download-editor.sh');
        console.log('  ./download-editor.sh');
}

