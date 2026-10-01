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
  .affine-bible-title-icon svg { width: 24px; height: 24px; }
  .affine-bible-head h2 { margin: 0; font-size: 18px; }
  .affine-bible-controls { display: grid; grid-template-columns: 1.2fr 1fr 2fr; gap: 8px; padding: 12px 20px 8px; }
  .affine-bible-controls input, .affine-bible-controls select { min-width: 0; height: 34px; padding: 0 10px; border: 1px solid var(--affine-border-color, #ddd); border-radius: 6px; background: transparent; color: inherit; }
  .affine-bible-controls select:disabled { opacity: .55; }
  .affine-bible-toolbar { display: flex; align-items: center; gap: 8px; padding: 0 20px 10px; color: var(--affine-text-secondary-color, #777); font-size: 12px; }
  .affine-bible-toolbar button, .affine-bible-nav button { height: 28px; padding: 0 9px; border: 1px solid var(--affine-border-color, #ddd); border-radius: 6px; background: var(--affine-hover-color, #f7f7f7); color: inherit; cursor: pointer; }
  .affine-bible-toolbar button:disabled, .affine-bible-nav button:disabled { opacity: .45; cursor: default; }
  .affine-bible-results { flex: 1; min-height: 180px; overflow: auto; padding: 0 20px 12px; }
  .affine-bible-result { display: grid; grid-template-columns: 130px 1fr auto; gap: 8px; align-items: start; padding: 9px 6px; border-bottom: 1px solid var(--affine-border-color, #f0f0f0); cursor: pointer; border-radius: 5px; }
  .affine-bible-result:hover { background: var(--affine-hover-color, #f7f7f7); }
  .affine-bible-result.is-selected { background: rgb(22 131 232 / 12%); outline: 1px solid rgb(22 131 232 / 35%); }
  .affine-bible-result.is-target { box-shadow: inset 3px 0 #1683e8; }
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
  .affine-bible-actions button:disabled { opacity: .45; cursor: default; }
  @media (max-width: 600px) { .affine-bible-controls { grid-template-columns: 1fr 1fr; } .affine-bible-controls input { grid-column: 1 / -1; } .affine-bible-result { grid-template-columns: 1fr auto; } .affine-bible-text { grid-column: 1 / -1; } .affine-bible-jump { grid-column: 2; grid-row: 1; } .affine-bible-toolbar { flex-wrap: wrap; } }
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

function createBibleLogo() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z"
      fill="currentColor" opacity=".18"/>
    <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Zm2.5 0a.5.5 0 0 0-.5.5v13.8c.16-.05.33-.08.5-.08H18V4H7.5Z"
      fill="currentColor"/>
    <path d="M11.5 6.25h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3Z" fill="currentColor"/>`;
  return svg;
}

export function openBiblePicker(std: BlockStdScope, model: BlockModel) {
  const root = document.createElement('div');
  document.querySelector('.affine-bible-picker')?.remove();
  root.className = 'affine-bible-picker';
  const books = [...new Set(bible.map(verse => verse.book))];
  const chaptersByBook = new Map<string, number[]>();
  for (const verse of bible) {
    const chapters = chaptersByBook.get(verse.book) ?? [];
    if (!chapters.includes(verse.chapter)) chapters.push(verse.chapter);
    chaptersByBook.set(verse.book, chapters);
  }
  const bookSelect = document.createElement('select');
  bookSelect.innerHTML = '<option value="">全部卷（搜索）</option>';
  bookSelect.setAttribute('aria-label', '选择卷');
  books.forEach(book => {
    const option = document.createElement('option');
    option.value = book;
    option.textContent = book;
    bookSelect.append(option);
  });
  const chapterSelect = document.createElement('select');
  chapterSelect.setAttribute('aria-label', '选择章');
  chapterSelect.disabled = true;
  chapterSelect.innerHTML = '<option value="">选择章</option>';
  const searchInput = document.createElement('input');
  searchInput.placeholder = '关键词，空格分隔';
  searchInput.setAttribute('aria-label', '搜索经文');
  const resultList = document.createElement('div');
  resultList.className = 'affine-bible-results';
  const selected = new Set<string>();
  let results: BibleVerse[] = [];
  let page = 0;
  let targetKey: string | undefined;
  const nav = document.createElement('div');
  nav.className = 'affine-bible-nav';

  const selectedVerses = () =>
    bible.filter(verse => selected.has(verseKey(verse)));
  const updateChapters = () => {
    const chapters = chaptersByBook.get(bookSelect.value) ?? [];
    chapterSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = bookSelect.value ? '全部章（搜索）' : '先选择卷';
    chapterSelect.append(placeholder);
    chapters.forEach(chapter => {
      const option = document.createElement('option');
      option.value = String(chapter);
      option.textContent = `第 ${chapter} 章`;
      chapterSelect.append(option);
    });
    chapterSelect.disabled = !bookSelect.value;
    chapterSelect.value = chapters.length ? String(chapters[0]) : '';
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
    updateChapterButtons();
    queryResults();
    const isSearchMode = searchInput.value.trim().length > 0;
    resultList.replaceChildren();
    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    page = Math.min(page, totalPages - 1);
    const pageResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'affine-bible-empty';
      empty.textContent = searchInput.value.trim()
        ? '没有找到包含全部关键词的经文'
        : '请选择卷和章，或输入关键词搜索';
      resultList.append(empty);
    }
    pageResults.forEach(verse => {
      const key = verseKey(verse);
      const row = document.createElement('div');
      row.className = `affine-bible-result${key === targetKey ? ' is-target' : ''}`;
      row.dataset.verseKey = key;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', verseLabel(verse));
      const toggle = () => {
        if (selected.has(key)) selected.delete(key);
        else selected.add(key);
        updateSelection();
      };
      const ref = document.createElement('span');
      ref.className = 'affine-bible-ref';
      ref.textContent = verseLabel(verse);
      const text = document.createElement('span');
      text.className = 'affine-bible-text';
      highlight(text, verse.content, searchInput.value);
      const jump = isSearchMode ? document.createElement('button') : undefined;
      if (jump) {
        jump.className = 'affine-bible-jump';
        jump.textContent = '跳转原文';
        jump.onclick = event => {
          event.stopPropagation();
          bookSelect.value = verse.book;
          updateChapters();
          chapterSelect.value = String(verse.chapter);
          searchInput.value = '';
          const chapterVerses = bible.filter(
            item => item.book === verse.book && item.chapter === verse.chapter
          );
          page = Math.floor(
            chapterVerses.findIndex(item => verseKey(item) === key) / PAGE_SIZE
          );
          targetKey = key;
          render();
          resultList
            .querySelector('.is-target')
            ?.scrollIntoView({ block: 'center' });
        };
      }
      row.onclick = toggle;
      row.onkeydown = event => {
        if (
          event.target === row &&
          (event.key === ' ' || event.key === 'Enter')
        ) {
          event.preventDefault();
          toggle();
        }
      };
      row.append(ref, text);
      if (jump) row.append(jump);
      resultList.append(row);
    });
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `${results.length ? page + 1 : 0} / ${results.length ? totalPages : 0} 页 · 共 ${results.length} 节`;
    nav.replaceChildren(
      makeButton('上一页', page <= 0, () => {
        page -= 1;
        render();
        resultList.scrollTop = 0;
      }),
      pageInfo,
      makeButton('下一页', page >= totalPages - 1, () => {
        page += 1;
        render();
        resultList.scrollTop = 0;
      })
    );
    updateSelection();
  };
  const originalFocus = document.activeElement;
  const close = () => {
    root.remove();
    if (originalFocus instanceof HTMLElement) originalFocus.focus();
  };
  const selectedText = () =>
    selectedVerses()
      .map(verse => `${verseLabel(verse)} ${verse.content}`)
      .join('\n');
  const copySelected = async () => {
    const text = selectedText();
    if (!text) return;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      selectionCount.textContent = `已复制 ${selected.size} 节`;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
      root.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      copyButton.focus();
      selectionCount.textContent = copied
        ? `已复制 ${selected.size} 节`
        : '复制失败，请选中后按 Ctrl+C';
    }
  };
  const insertSelected = () => {
    if (std.store.readonly) return;
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
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', '圣经经文');
  const head = document.createElement('div');
  head.className = 'affine-bible-head';
  const title = document.createElement('div');
  title.className = 'affine-bible-title';
  const icon = document.createElement('span');
  icon.className = 'affine-bible-title-icon';
  icon.append(createBibleLogo());
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
    updateSelection();
  };
  const previousChapter = document.createElement('button');
  previousChapter.textContent = '上一章';
  const nextChapter = document.createElement('button');
  nextChapter.textContent = '下一章';
  const chapterHint = document.createElement('span');
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
    chapterHint.textContent =
      current < 0
        ? '输入关键词搜索，空格分隔多个关键词'
        : `${bookSelect.value} 第 ${chapters[current]} 章${current === 0 ? ' · 已是第一章' : ''}${current === chapters.length - 1 ? ' · 已是最后一章' : ''}`;
  };
  const changeChapter = (offset: number) => {
    const chapters = chaptersByBook.get(bookSelect.value) ?? [];
    const current = chapters.indexOf(Number(chapterSelect.value));
    const next = chapters[current + offset];
    if (next === undefined) return;
    chapterSelect.value = String(next);
    searchInput.value = '';
    targetKey = undefined;
    page = 0;
    render();
    resultList.scrollTop = 0;
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
  const selectionCount = document.createElement('span');
  selectionCount.setAttribute('role', 'status');
  selectionCount.style.cssText = 'align-self:center;font-size:13px';
  left.append(copyButton, selectionCount);
  const right = document.createElement('div');
  right.className = 'affine-bible-actions-right';
  const insertButton = document.createElement('button');
  insertButton.textContent = '插入文档';
  insertButton.onclick = insertSelected;
  right.append(insertButton);
  actions.append(left, right);
  const updateSelection = () => {
    resultList
      .querySelectorAll<HTMLElement>('.affine-bible-result')
      .forEach(row => {
        const checked = selected.has(row.dataset.verseKey ?? '');
        row.classList.toggle('is-selected', checked);
        row.setAttribute('aria-pressed', String(checked));
      });
    selectionCount.textContent = `已选 ${selected.size} 节`;
    clearButton.disabled = selected.size === 0;
    copyButton.disabled = selected.size === 0;
    insertButton.disabled = selected.size === 0 || std.store.readonly;
  };
  root.addEventListener('copy', event => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      !selected.size
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    event.clipboardData?.setData('text/plain', selectedText());
  });
  root.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') close();
  });
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
    if (searchInput.value.trim()) chapterSelect.value = '';
    targetKey = undefined;
    page = 0;
    updateChapterButtons();
    render();
    resultList.scrollTop = 0;
  };
  chapterSelect.onchange = () => {
    searchInput.value = '';
    targetKey = undefined;
    page = 0;
    updateChapterButtons();
    render();
    resultList.scrollTop = 0;
  };
  searchInput.oninput = () => {
    chapterSelect.value = searchInput.value.trim()
      ? ''
      : String((chaptersByBook.get(bookSelect.value) ?? [])[0] ?? '');
    targetKey = undefined;
    page = 0;
    render();
    resultList.scrollTop = 0;
  };
  updateChapters();
  updateChapterButtons();
  render();
  searchInput.focus();
}
