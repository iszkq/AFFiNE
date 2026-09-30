import type { DocMode } from '@blocksuite/affine/model';
import type { Chain, EditorHost, InitCommandCtx } from '@blocksuite/affine/std';
import type { TemplateResult } from 'lit';

export interface AIItemGroupConfig {
  name?: string;
  testId?: string;
  items: AIItemConfig[];
}

export interface AIItemConfig {
  name: string;
  testId: string;
  icon: TemplateResult | (() => HTMLElement);
  showWhen?: (
    chain: Chain<InitCommandCtx>,
    editorMode: DocMode,
    host: EditorHost
  ) => boolean;
  subItem?: AISubItemConfig[];
  subItemOffset?: [number, number];
  handler?: (host: EditorHost) => void;
  beta?: boolean;
}

export interface AISubItemConfig {
  type: string;
  testId?: string;
  handler?: (host: EditorHost) => void;
}

const aiNameTranslations: Record<string, string> = {
  'Ask AI': '询问 AI',
  'Action with above': '对上文执行操作',
  'Continue in AI Chat': '在 AI 聊天中继续',
  'Translate to': '翻译为',
  'Change tone to': '更改语气为',
  'Improve writing': '改进写作',
  'Make it longer': '扩写',
  'Make it shorter': '缩写',
  'Continue writing': '继续写作',
  'Write an article about this': '围绕此内容写文章',
  'Write a tweet about this': '围绕此内容写推文',
  'Write a poem about this': '围绕此内容写诗',
  'Write a blog post about this': '围绕此内容写博客',
  'Brainstorm ideas about this': '围绕此内容头脑风暴',
  'Explain this image': '解释此图片',
  'Explain this code': '解释此代码',
  'Check code error': '检查代码错误',
  'Fix spelling': '修正拼写',
  'Fix grammar': '修正语法',
  'Explain selection': '解释选中内容',
  Summarize: '总结',
  'Generate headings': '生成标题',
  'Generate outline': '生成大纲',
  'Generate an image': '生成图片',
  'Brainstorm ideas with mind map': '用思维导图头脑风暴',
  'Generate presentation': '生成演示文稿',
  'Make it real': '生成可执行内容',
  'Find actions': '查找操作',
  'Image processing': '图片处理',
  'AI image filter': 'AI 图片滤镜',
  'Generate a caption': '生成图片说明',
  Others: '其他',
  'review text': '校对文本',
  'review code': '校对代码',
  'review image': '校对图片',
  'edit text': '编辑文本',
  'generate from text': '根据文本生成',
  'draft from text': '根据文本起草',
  'touch up image': '图片润色',
  English: '英语',
  Chinese: '中文',
  Japanese: '日语',
  Korean: '韩语',
  French: '法语',
  German: '德语',
  Spanish: '西班牙语',
  Russian: '俄语',
};

export function translateAIName(name: string): string {
  return aiNameTranslations[name] ?? name;
}
