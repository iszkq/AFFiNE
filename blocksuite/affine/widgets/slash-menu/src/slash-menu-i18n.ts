const zhHansLabels: Record<string, string> = {
  'Ask AI': '询问 AI',
  Text: '文本',
  'Start typing with plain text.': '开始输入纯文本。',
  'Heading 1': '一级标题',
  'Headings in the largest font.': '字号最大的标题。',
  'Heading 2': '二级标题',
  'Headings in the 2nd font size.': '字号第二大的标题。',
  'Heading 3': '三级标题',
  'Headings in the 3rd font size.': '字号第三大的标题。',
  'Heading 4': '四级标题',
  'Headings in the 4th font size.': '字号第四大的标题。',
  'Heading 5': '五级标题',
  'Headings in the 5th font size.': '字号第五大的标题。',
  'Heading 6': '六级标题',
  'Headings in the 6th font size.': '字号第六大的标题。',
  'Heading #1': '一级标题',
  'Heading #2': '二级标题',
  'Heading #3': '三级标题',
  'Heading #4': '四级标题',
  'Heading #5': '五级标题',
  'Heading #6': '六级标题',
  'Other Headings': '其他标题',
  'Code Block': '代码块',
  'Code snippet with formatting.': '带格式的代码片段。',
  Quote: '引用',
  'Add a blockquote for emphasis.': '添加引用块以强调内容。',
  'Bulleted List': '无序列表',
  'Create a bulleted list.': '创建无序列表。',
  'Numbered List': '有序列表',
  'Create a numbered list.': '创建有序列表。',
  'To-do List': '待办列表',
  'Add tasks to a to-do list.': '将任务添加到待办列表。',
  Equation: '公式',
  'Formula block with LaTeX rendering.': '使用 LaTeX 渲染的公式块。',
  Callout: '标注',
  Divider: '分割线',
  'Visually separate content.': '用于分隔内容。',
  'Align left': '左对齐',
  'Align center': '居中对齐',
  'Align right': '右对齐',
  Bold: '粗体',
  Italic: '斜体',
  Underline: '下划线',
  Strikethrough: '删除线',
  Basic: '基础',
  List: '列表',
  Align: '对齐',
  Style: '样式',
  Date: '日期',
  Actions: '操作',
  'AFFiNE AI': 'AFFiNE AI',
  Today: '今天',
  Tomorrow: '明天',
  Yesterday: '昨天',
  Now: '现在',
  'Move Up': '上移',
  'Move Down': '下移',
  Copy: '复制',
  Duplicate: '创建副本',
  Delete: '删除',
  'Fix spelling': '修正拼写',
  'Fix grammar': '修正语法',
  Summarize: '总结',
  'Continue writing': '继续写作',
  'Action with above': '对上文执行操作',
  'Translate to': '翻译为',
  'Change tone to': '更改语气为',
  'Improve writing': '改进写作',
  'Make it longer': '扩写',
  'Make it shorter': '缩写',
  'Generate outline': '生成大纲',
  'Find actions': '查找行动项',
};

const isChinese = () => {
  const language = globalThis.document?.documentElement.lang ?? '';
  return language === 'zh' || language === 'zh-CN' || language === 'zh-Hans';
};

export function localizeSlashMenuText(text?: string) {
  if (!text || !isChinese()) return text;
  return zhHansLabels[text] ?? text;
}

export function localizeSlashMenuItemName(name: string) {
  if (!isChinese()) return name;

  const suffix = ' from above';
  if (name.endsWith(suffix)) {
    const baseName = name.slice(0, -suffix.length);
    return `${localizeSlashMenuText(baseName)}（上文）`;
  }

  return localizeSlashMenuText(name) ?? name;
}
