/**
 * 编辑器适配器
 * 提供 Toast UI Editor 和 Editor.js 的统一接口
 */

// 模拟图片上传函数
async function uploadToYourStore(blob) {
    // 模拟上传延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 模拟返回图片URL
    const mockUrl = `https://example.com/uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${blob.type.split('/')[1]}`;
    
    console.log('模拟上传图片:', {
        size: blob.size,
        type: blob.type,
        url: mockUrl
    });
    
    return {
        success: 1,
        file: {
            url: mockUrl
        }
    };
}

/**
 * Toast UI Editor 适配器
 */
class ToastAdapter {
    constructor() {
        this.editor = null;
        this.Editor = null;
    }

    async init(el, initialValue = '') {
        try {
            // 动态导入本地 Toast UI Editor
            const toastUI = await import('/plugins/toast-ui-editor/dist/toastui-editor.js');
            this.Editor = toastUI.default || toastUI.Editor;
            
            // 初始化编辑器
            this.editor = new this.Editor({
                el: el,
                height: '800px',
                initialEditType: 'markdown',
                previewStyle: 'vertical',
                usageStatistics: false,
                initialValue: initialValue,
                toolbarItems: [
                    ['heading', 'bold', 'italic', 'strike'],
                    ['hr', 'quote'],
                    ['ul', 'ol', 'task', 'indent', 'outdent'],
                    ['table', 'image', 'link'],
                    ['code', 'codeblock'],
                    ['scrollSync']
                ],
                events: {
                    change: () => {
                        // 内容变化时的处理
                    }
                }
            });

            console.log('Toast UI Editor 初始化成功');
            return this.editor;
        } catch (error) {
            console.error('Toast UI Editor 初始化失败:', error);
            throw error;
        }
    }

    get() {
        if (!this.editor) {
            throw new Error('编辑器未初始化');
        }
        return this.editor.getMarkdown();
    }

    set(value) {
        if (!this.editor) {
            throw new Error('编辑器未初始化');
        }
        this.editor.setMarkdown(value);
    }

    destroy() {
        if (this.editor && typeof this.editor.destroy === 'function') {
            this.editor.destroy();
            this.editor = null;
            console.log('Toast UI Editor 已销毁');
        }
    }
}

/**
 * Editor.js 适配器
 */
class EJAdapter {
    constructor() {
        this.editor = null;
        this.EditorJS = null;
        this.tools = {};
    }

    async init(el, initialValue = '') {
        try {
            // 动态导入 Editor.js 及其工具
            const [editorjs, header, list, image] = await Promise.all([
                import('../@editor-js/dist/editorjs.mjs'),
                import('https://cdn.jsdelivr.net/npm/@editorjs/header@2.7.0/dist/bundle.js'),
                import('https://cdn.jsdelivr.net/npm/@editorjs/list@1.8.0/dist/bundle.js'),
                import('https://cdn.jsdelivr.net/npm/@editorjs/image@2.8.1/dist/bundle.js')
            ]);

            this.EditorJS = editorjs.default || editorjs.EditorJS;
            this.tools = {
                header: header.default || header.Header,
                list: list.default || list.List,
                image: {
                    class: image.default || image.Image,
                    config: {
                        uploader: {
                            uploadByFile: async (file) => {
                                return await uploadToYourStore(file);
                            },
                            uploadByUrl: async (url) => {
                                // 对于URL上传，先获取图片blob
                                const response = await fetch(url);
                                const blob = await response.blob();
                                return await uploadToYourStore(blob);
                            }
                        }
                    }
                }
            };

            // 解析初始值
            let initialData = {};
            if (initialValue) {
                try {
                    initialData = JSON.parse(initialValue);
                } catch (e) {
                    // 如果不是JSON格式，创建简单的文本块
                    initialData = {
                        blocks: [
                            {
                                type: 'paragraph',
                                data: {
                                    text: initialValue
                                }
                            }
                        ]
                    };
                }
            }

            // 初始化编辑器
            this.editor = new this.EditorJS({
                holder: el,
                tools: this.tools,
                data: initialData,
                placeholder: '开始编写内容...',
                onChange: () => {
                    // 内容变化时的处理
                }
            });

            console.log('Editor.js 初始化成功');
            return this.editor;
        } catch (error) {
            console.error('Editor.js 初始化失败:', error);
            throw error;
        }
    }

    async get() {
        if (!this.editor) {
            throw new Error('编辑器未初始化');
        }
        
        try {
            const outputData = await this.editor.save();
            return JSON.stringify(outputData, null, 2);
        } catch (error) {
            console.error('获取 Editor.js 内容失败:', error);
            throw error;
        }
    }

    async set(value) {
        if (!this.editor) {
            throw new Error('编辑器未初始化');
        }
        
        try {
            let data = {};
            if (value) {
                try {
                    data = JSON.parse(value);
                } catch (e) {
                    // 如果不是JSON格式，创建简单的文本块
                    data = {
                        blocks: [
                            {
                                type: 'paragraph',
                                data: {
                                    text: value
                                }
                            }
                        ]
                    };
                }
            }
            
            await this.editor.render(data);
        } catch (error) {
            console.error('设置 Editor.js 内容失败:', error);
            throw error;
        }
    }

    destroy() {
        if (this.editor && typeof this.editor.destroy === 'function') {
            this.editor.destroy();
            this.editor = null;
            console.log('Editor.js 已销毁');
        }
    }
}

// 导出适配器
export { ToastAdapter, EJAdapter };
