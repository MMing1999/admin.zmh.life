# 编辑器适配器使用说明

## 文件结构

- `editor-adapters.js` - 主要的适配器文件，包含 ToastAdapter 和 EJAdapter 类
- `editor-example.html` - 完整的使用示例页面
- `test-adapters.html` - 简单的测试页面
- `index.html` - 已集成适配器的主编辑器页面

## 适配器功能

### ToastAdapter (Toast UI Editor)

**依赖**: `@toast-ui/editor` (通过 CDN 动态加载)

**方法**:
- `init(el, initialValue)` - 初始化 Markdown 编辑器
- `get()` - 获取 Markdown 格式内容
- `set(value)` - 设置 Markdown 内容
- `destroy()` - 销毁编辑器实例

### EJAdapter (Editor.js)

**依赖**: 
- `@editorjs/editorjs` (主编辑器)
- `@editorjs/header` (标题工具)
- `@editorjs/list` (列表工具)
- `@editorjs/image` (图片工具)

**方法**:
- `init(el, initialValue)` - 初始化 Block 编辑器
- `get()` - 获取 JSON 格式内容
- `set(value)` - 设置 JSON 内容
- `destroy()` - 销毁编辑器实例

## 使用示例

### 基本使用

```javascript
import { ToastAdapter, EJAdapter } from './editor-adapters.js';

// 创建适配器实例
const toastAdapter = new ToastAdapter();
const ejAdapter = new EJAdapter();

// 初始化 Toast UI Editor
await toastAdapter.init(document.getElementById('editor'), '# 初始内容');

// 获取内容
const content = await toastAdapter.get();

// 设置内容
toastAdapter.set('# 新内容');

// 销毁编辑器
toastAdapter.destroy();
```

### 编辑器切换

```javascript
// 切换到 Editor.js
await ejAdapter.init(document.getElementById('editor'), initialContent);
currentAdapter = ejAdapter;

// 切换到 Toast UI Editor
await toastAdapter.init(document.getElementById('editor'), initialContent);
currentAdapter = toastAdapter;
```

## 图片上传

适配器使用统一的 `uploadToYourStore(blob)` 函数处理图片上传，目前是模拟实现：

```javascript
async function uploadToYourStore(blob) {
    // 模拟上传延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 返回模拟的图片URL
    return {
        success: 1,
        file: {
            url: `https://example.com/uploads/${Date.now()}.${blob.type.split('/')[1]}`
        }
    };
}
```

## 动态导入

所有依赖都通过 `await import()` 动态加载，支持懒加载：

```javascript
// Toast UI Editor
const toastUI = await import('https://cdn.jsdelivr.net/npm/@toast-ui/editor@3.2.2/dist/toastui-editor.js');

// Editor.js
const editorjs = await import('https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.28.2/dist/editorjs.min.js');
```

## 测试页面

访问以下页面进行测试：

- `http://localhost:3000/test-adapters.html` - 简单测试页面
- `http://localhost:3000/editor-example.html` - 完整示例页面
- `http://localhost:3000/` - 主编辑器页面（已集成适配器）

## 注意事项

1. 所有异步方法都需要使用 `await` 调用
2. 编辑器切换时会自动保存当前内容
3. 图片上传目前是模拟实现，需要根据实际需求修改
4. 动态导入的 CDN 链接可能需要根据网络环境调整
5. 确保在调用适配器方法前先初始化编辑器

## 错误处理

适配器包含完整的错误处理机制：

```javascript
try {
    await adapter.init(container, content);
} catch (error) {
    console.error('编辑器初始化失败:', error);
}
```

所有方法都会抛出详细的错误信息，便于调试和问题排查。

