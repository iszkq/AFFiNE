const zhHansCategories: Record<string, string> = {
  Arrows: '箭头',
  'Cheeky Piggies': '俏皮小猪',
  'Contorted Stickers': '扭曲贴纸',
  Paper: '纸张',
  Brainstorming: '头脑风暴',
};

const isChinese = () => {
  const language = globalThis.document?.documentElement.lang ?? '';
  return language === 'zh' || language === 'zh-CN' || language === 'zh-Hans';
};

export function localizeTemplateCategory(category: string) {
  if (!isChinese()) return category;
  return zhHansCategories[category] ?? category;
}

export function templateSearchPlaceholder() {
  return isChinese() ? '搜索文件或其他内容……' : 'Search file or anything...';
}
