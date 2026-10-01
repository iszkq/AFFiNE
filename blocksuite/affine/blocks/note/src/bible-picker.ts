import type { BlockStdScope } from '@blocksuite/std';
import type { BlockModel } from '@blocksuite/store';
import { Text } from '@blocksuite/store';

import bible from './data/bible.json';

type BibleVerse = (typeof bible)[number];
const PAGE_SIZE = 40;

const style = `
  .affine-bible-picker { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 35%); font-family: system-ui, sans-serif; }
  .affine-bible-dialog { width: min(860px, calc(100vw - 32px)); max-height: min(820px, calc(100vh - 32px)); display: flex; flex-direction: column; overflow: hidden; background: var(--affine-white-100, #fff); color: var(--affine-text-primary-color, #222); border-radius: 12px; box-shadow: 0 16px 60px rgb(0 0 0 / 25%); }
  .affine-bible-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--affine-border-color, #eee); }
  .affine-bible-title { display: flex; align-items: center; gap: 8px; }
  .affine-bible-title-icon { display: inline-flex; width: 24px; height: 24px; color: #1683e8; }
  .affine-bible-head h2 { margin: 0; font-size: 18px; }
  .affine-bible-controls { display: grid; grid-template-columns: 1.2fr 1fr 2fr; gap: 8px; padding: 12px 20px 8px; }
  .affine-bible-controls input, .affine-bible-controls select { min-width: 0; height: 34px; padding: 0 10px; border: 1px solid var(--affine-border-color, #ddd); border-radius: 6px; background: transparent; color: inherit; }
  .affine-bible-controls select:disabled { opacity: .55; }
  .affine-bible-toolbar { display: flex; align-items: center; gap: 8px; padding: 0 20px 10px; color: var(--affine-text-secondary-color, #777); font-size: 12px; }
  .affine-bible-toolbar button, .affine-bible-nav button { height: 28px; padding: 0 9px; border: 1px solid var(--affine-border-color, #ddd); border-radius: 6px; background: var(--affine-hover-color, #f7f7f7); color: inherit; cursor: pointer; }
  .affine-bible-toolbar button:disabled, .affine-bible-nav button:disabled { opacity: .45; cursor: default; }
  .affine-bible-results { flex: 1; min-height: 180px; overflow: auto; padding: 0 20px 12px; }
  .affine-bible-result { display: grid; grid-template-columns: 24px 130px 1fr auto; gap: 8px; align-items: start; padding: 9px 6px; border-bottom: 1px solid var(--affine-border-color, #f0f0f0); cursor: pointer; border-radius: 5px; }
  .affine-bible-result:hover { background: var(--affine-hover-color, #f7f7f7); }
  .affine-bible-result.is-selected { background: rgb(22 131 232 / 12%); outline: 1px solid rgb(22 131 232 / 35%); }
  .affine-bible-ref { color: var(--affine-text-secondary-color, #777); font-size: 13px; }
  .affine-bible-text { line-height: 1.55; }
  .affine-bible-text mark { padding: 0 2px; border-radius: 2px; background: #ffe58f; color: inherit; }
  .affine-bible-jump { border: 0; background: transparent; color: #1683e8; cursor: pointer; font-size: 12px; white-space: nowrap; }
  .affine-bible-empty { padding: 24px 0; color: var(--affine-text-secondary-color, #777); text-align: center; }
  .affine-bible-nav { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 4px 20px 10px; font-size: 12px; color: var(--affine-text-secondary-color, #777); }
  .affine-bible-actions { display: flex; justify-content: space-between; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--affine-border-color, #eee); }
  .affine-bible-actions-left, .affine-bible-actions-right { display: flex; gap: 8px; }
  .affine-bible-actions button, .affine-bible-close { height: 34px; padding: 0 14px; border: 0; border-radius: 6px; cursor: pointer; }
  .affine-bible-actions button { background: #1683e8; color: #fff; }
  .affine-bible-actions button.secondary, .affine-bible-close { background: var(--affine-hover-color, #f3f3f3); color: inherit; }
`;

function verseKey(verse: BibleVerse) {
  return `${verse.bookNo}:${verse.chapter}:${verse.verse}`;
}

function verseLabel(verse: BibleVerse) {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}

function highlight(container: HTMLElement, content: string, query: string) {
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
  if (!terms.length) {
    container.textContent = content;
    return;
  }
  const escaped = terms.map(term =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  let last = 0;
  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    container.append(document.createTextNode(content.slice(last, index)));
    const mark = document.createElement('mark');
    mark.textContent = match[0];
    container.append(mark);
    last = index + match[0].length;
  }
  container.append(document.createTextNode(content.slice(last)));
}

export function openBiblePicker(std: BlockStdScope, model: BlockModel) {
  const root = document.createElement('div');
  root.className = 'affine-bible-picker';
  const books = [...new Set(bible.map(verse => verse.book))];
  const chaptersByBook = new Map<string, number[]>();
  for (const verse of bible) {
    const chapters = chaptersByBook.get(verse.book) ?? [];
    if (!chapters.includes(verse.chapter)) chapters.push(verse.chapter);
    chaptersByBook.set(verse.book, chapters);
  }
  const bookSelect = document.createElement('select');
  bookSelect.innerHTML = '<option value="">选择卷</option>';
  books.forEach(book => {
    const option = document.createElement('option');
    option.value = book;
    option.textContent = book;
    bookSelect.append(option);
  });
  const chapterSelect = document.createElement('select');
  chapterSelect.disabled = true;
  chapterSelect.innerHTML = '<option value="">选择章</option>';
  const searchInput = document.createElement('input');
  searchInput.placeholder = '关键词，空格分隔';
  const resultList = document.createElement('div');
  resultList.className = 'affine-bible-results';
  const selected = new Set<string>();
  let results: BibleVerse[] = [];
  let page = 0;
  const nav = document.createElement('div');
  nav.className = 'affine-bible-nav';

  const selectedVerses = () =>
    bible.filter(verse => selected.has(verseKey(verse)));
  const updateChapters = () => {
    const chapters = chaptersByBook.get(bookSelect.value) ?? [];
    chapterSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = bookSelect.value ? '选择章' : '先选择卷';
    chapterSelect.append(placeholder);
    chapters.forEach(chapter => {
      const option = document.createElement('option');
      option.value = String(chapter);
      option.textContent = `第 ${chapter} 章`;
      chapterSelect.append(option);
    });
    chapterSelect.disabled = !bookSelect.value;
    chapterSelect.value = '';
  };
  const queryResults = () => {
    const terms = searchInput.value
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    results = bible.filter(verse => {
      if (bookSelect.value && verse.book !== bookSelect.value) return false;
      if (chapterSelect.value && String(verse.chapter) !== chapterSelect.value)
        return false;
      if (!chapterSelect.value && !searchInput.value.trim()) return false;
      const haystack =
        `${verse.book} ${verse.chapter}:${verse.verse} ${verse.content}`.toLocaleLowerCase();
      return terms.every(term => haystack.includes(term));
    });
    page = Math.min(
      page,
      Math.max(0, Math.ceil(results.length / PAGE_SIZE) - 1)
    );
  };
  const makeButton = (text: string, disabled: boolean, onclick: () => void) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.disabled = disabled;
    button.onclick = onclick;
    return button;
  };
  const render = () => {
    queryResults();
    resultList.replaceChildren();
    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    page = Math.min(page, totalPages - 1);
    const pageResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'affine-bible-empty';
      empty.textContent = bookSelect.value
        ? '请选择章节，或输入关键词搜索'
        : '请选择卷或输入关键词搜索';
      resultList.append(empty);
    }
    pageResults.forEach(verse => {
      const key = verseKey(verse);
      const row = document.createElement('div');
      row.className = `affine-bible-result${selected.has(key) ? ' is-selected' : ''}`;
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.has(key);
      const toggle = () => {
        if (selected.has(key)) selected.delete(key);
        else selected.add(key);
        render();
      };
      checkbox.onclick = event => {
        event.stopPropagation();
        toggle();
      };
      const ref = document.createElement('span');
      ref.className = 'affine-bible-ref';
      ref.textContent = verseLabel(verse);
      const text = document.createElement('span');
      text.className = 'affine-bible-text';
      highlight(text, verse.content, searchInput.value);
      const jump = document.createElement('button');
      jump.className = 'affine-bible-jump';
      jump.textContent = '查看本章';
      jump.onclick = event => {
        event.stopPropagation();
        bookSelect.value = verse.book;
        updateChapters();
        chapterSelect.value = String(verse.chapter);
        searchInput.value = '';
        page = 0;
        updateChapterButtons();
        render();
      };
      row.onclick = toggle;
      row.append(checkbox, ref, text, jump);
      resultList.append(row);
    });
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `${results.length ? page + 1 : 0} / ${results.length ? totalPages : 0} 页 · 已选 ${selected.size} 节`;
    nav.replaceChildren(
      makeButton('上一页', page <= 0, () => {
        page -= 1;
        render();
      }),
      pageInfo,
      makeButton('下一页', page >= totalPages - 1, () => {
        page += 1;
        render();
      })
    );
  };
  const close = () => root.remove();
  const copySelected = async () => {
    const verses = selectedVerses();
    if (!verses.length) return;
    try {
      await navigator.clipboard?.writeText(
        verses.map(verse => `${verseLabel(verse)} ${verse.content}`).join('\n')
      );
    } catch (error) {
      console.error('复制经文失败', error);
    }
  };
  const insertSelected = () => {
    const verses = selectedVerses();
    if (!verses.length) return;
    const parent = std.store.getParent(model);
    if (!parent) return;
    const index = parent.children.indexOf(model);
    std.store.transact(() =>
      verses.forEach((verse, offset) =>
        std.store.addBlock(
          'affine:paragraph',
          { text: new Text(`${verseLabel(verse)} ${verse.content}`) },
          parent,
          index + 1 + offset
        )
      )
    );
    close();
  };

  const sheet = document.createElement('div');
  sheet.className = 'affine-bible-dialog';
  const head = document.createElement('div');
  head.className = 'affine-bible-head';
  const title = document.createElement('div');
  title.className = 'affine-bible-title';
  const icon = document.createElement('span');
  icon.className = 'affine-bible-title-icon';
  icon.textContent = '📖';
  const heading = document.createElement('h2');
  heading.textContent = '圣经经文';
  title.append(icon, heading);
  const closeButton = document.createElement('button');
  closeButton.className = 'affine-bible-close';
  closeButton.textContent = '关闭';
  closeButton.onclick = close;
  head.append(title, closeButton);
  const controls = document.createElement('div');
  controls.className = 'affine-bible-controls';
  controls.append(bookSelect, chapterSelect, searchInput);
  const toolbar = document.createElement('div');
  toolbar.className = 'affine-bible-toolbar';
  const clearButton = document.createElement('button');
  clearButton.textContent = '清除选中';
  clearButton.onclick = () => {
    selected.clear();
    render();
  };
  const previousChapter = document.createElement('button');
  previousChapter.textContent = '上一章';
  const nextChapter = document.createElement('button');
  nextChapter.textContent = '下一章';
  const chapterHint = document.createElement('span');
  chapterHint.textContent =
    '点击经文可选中/取消，支持多选；搜索结果中的关键词会高亮';
  const updateChapterButtons = () => {
    const chapters = chaptersByBook.get(bookSelect.value) ?? [];
    const current = chapters.indexOf(Number(chapterSelect.value));
    previousChapter.disabled = current <= 0;
    nextChapter.disabled = current < 0 || current >= chapters.length - 1;
    previousChapter.title = current <= 0 ? '已经是第一章' : '查看上一章';
    nextChapter.title =
      current < 0 || current >= chapters.length - 1
        ? '已经是最后一章'
        : '查看下一章';
  };
  const changeChapter = (offset: number) => {
    const chapters = chaptersByBook.get(bookSelect.value) ?? [];
    const current = chapters.indexOf(Number(chapterSelect.value));
    const next = chapters[current + offset];
    if (next === undefined) return;
    chapterSelect.value = String(next);
    page = 0;
    render();
  };
  previousChapter.onclick = () => changeChapter(-1);
  nextChapter.onclick = () => changeChapter(1);
  toolbar.append(clearButton, previousChapter, nextChapter, chapterHint);
  const actions = document.createElement('div');
  actions.className = 'affine-bible-actions';
  const left = document.createElement('div');
  left.className = 'affine-bible-actions-left';
  const copyButton = document.createElement('button');
  copyButton.className = 'secondary';
  copyButton.textContent = '复制选中经文';
  copyButton.onclick = () => void copySelected();
  left.append(copyButton);
  const right = document.createElement('div');
  right.className = 'affine-bible-actions-right';
  const insertButton = document.createElement('button');
  insertButton.textContent = '插入文档';
  insertButton.onclick = insertSelected;
  right.append(insertButton);
  actions.append(left, right);
  sheet.append(head, controls, toolbar, resultList, nav, actions);
  root.append(sheet);
  root.addEventListener('click', event => {
    if (event.target === root) close();
  });
  if (!document.getElementById('affine-bible-picker-style')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'affine-bible-picker-style';
    styleElement.textContent = style;
    document.head.append(styleElement);
  }
  document.body.append(root);
  bookSelect.onchange = () => {
    updateChapters();
    page = 0;
    updateChapterButtons();
    render();
  };
  chapterSelect.onchange = () => {
    page = 0;
    updateChapterButtons();
    render();
  };
  searchInput.oninput = () => {
    page = 0;
    render();
  };
  updateChapters();
  updateChapterButtons();
  render();
  searchInput.focus();
}
