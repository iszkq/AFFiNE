import type { BlockStdScope } from '@blocksuite/std';
import type { BlockModel } from '@blocksuite/store';
import { Text } from '@blocksuite/store';

import bible from './data/bible.json';

type BibleVerse = (typeof bible)[number];

const style = `
  .affine-bible-picker { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 35%); font-family: system-ui, sans-serif; }
  .affine-bible-dialog { width: min(760px, calc(100vw - 32px)); max-height: min(760px, calc(100vh - 32px)); display: flex; flex-direction: column; overflow: hidden; background: var(--affine-white-100, #fff); color: var(--affine-text-primary-color, #222); border-radius: 12px; box-shadow: 0 16px 60px rgb(0 0 0 / 25%); }
  .affine-bible-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--affine-border-color, #eee); }
  .affine-bible-head h2 { margin: 0; font-size: 18px; }
  .affine-bible-controls { display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 8px; padding: 12px 20px; }
  .affine-bible-controls input, .affine-bible-controls select { min-width: 0; height: 34px; padding: 0 10px; border: 1px solid var(--affine-border-color, #ddd); border-radius: 6px; background: transparent; color: inherit; }
  .affine-bible-results { flex: 1; min-height: 120px; overflow: auto; padding: 0 20px 12px; }
  .affine-bible-result { display: grid; grid-template-columns: 24px 120px 1fr; gap: 8px; align-items: start; padding: 9px 0; border-bottom: 1px solid var(--affine-border-color, #f0f0f0); cursor: pointer; }
  .affine-bible-ref { color: var(--affine-text-secondary-color, #777); font-size: 13px; }
  .affine-bible-text { line-height: 1.55; }
  .affine-bible-empty { padding: 24px 0; color: var(--affine-text-secondary-color, #777); text-align: center; }
  .affine-bible-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--affine-border-color, #eee); }
  .affine-bible-actions button, .affine-bible-close { height: 34px; padding: 0 14px; border: 0; border-radius: 6px; cursor: pointer; }
  .affine-bible-actions button { background: #1683e8; color: #fff; }
  .affine-bible-actions button.secondary, .affine-bible-close { background: var(--affine-hover-color, #f3f3f3); color: inherit; }
`;

function verseLabel(verse: BibleVerse) {
  return `${verse.book} ${verse.chapter}:${verse.verse}`;
}

function versesForQuery(book: string, chapter: string, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return bible
    .filter(verse => {
      if (book && verse.book !== book) return false;
      if (chapter && String(verse.chapter) !== chapter) return false;
      const haystack =
        `${verse.book} ${verse.chapter}:${verse.verse} ${verse.content}`.toLocaleLowerCase();
      return terms.every(term => haystack.includes(term));
    })
    .slice(0, 300);
}

export function openBiblePicker(std: BlockStdScope, model: BlockModel) {
  const root = document.createElement('div');
  root.className = 'affine-bible-picker';
  const books = [...new Set(bible.map(verse => verse.book))];
  const bookSelect = document.createElement('select');
  bookSelect.innerHTML = '<option value="">全部卷</option>';
  books.forEach(book => {
    const option = document.createElement('option');
    option.value = book;
    option.textContent = book;
    bookSelect.append(option);
  });
  const chapterInput = document.createElement('input');
  chapterInput.placeholder = '章（可选）';
  chapterInput.inputMode = 'numeric';
  const searchInput = document.createElement('input');
  searchInput.placeholder = '关键词，空格分隔';
  const resultList = document.createElement('div');
  resultList.className = 'affine-bible-results';
  const selected = new Set<string>();
  let results: BibleVerse[] = [];

  const renderResults = () => {
    results = versesForQuery(
      bookSelect.value,
      chapterInput.value,
      searchInput.value
    );
    resultList.replaceChildren();
    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'affine-bible-empty';
      empty.textContent = '没有找到经文';
      resultList.append(empty);
      return;
    }
    results.forEach(verse => {
      const key = `${verse.bookNo}:${verse.chapter}:${verse.verse}`;
      const label = document.createElement('label');
      label.className = 'affine-bible-result';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.has(key);
      checkbox.addEventListener('change', () => {
        checkbox.checked ? selected.add(key) : selected.delete(key);
      });
      const ref = document.createElement('span');
      ref.className = 'affine-bible-ref';
      ref.textContent = verseLabel(verse);
      const text = document.createElement('span');
      text.className = 'affine-bible-text';
      text.textContent = verse.content;
      label.append(checkbox, ref, text);
      resultList.append(label);
    });
  };

  const close = () => root.remove();
  const copySelected = async () => {
    const selectedVerses = bible.filter(verse =>
      selected.has(`${verse.bookNo}:${verse.chapter}:${verse.verse}`)
    );
    if (!selectedVerses.length) return;
    try {
      await navigator.clipboard?.writeText(
        selectedVerses
          .map(verse => `${verseLabel(verse)} ${verse.content}`)
          .join('\n')
      );
    } catch (error) {
      console.error('复制经文失败', error);
    }
  };
  const insertSelected = () => {
    const selectedVerses = bible.filter(verse =>
      selected.has(`${verse.bookNo}:${verse.chapter}:${verse.verse}`)
    );
    if (!selectedVerses.length) return;
    const parent = std.store.getParent(model);
    if (!parent) return;
    const index = parent.children.indexOf(model);
    std.store.transact(() => {
      selectedVerses.forEach((verse, offset) => {
        std.store.addBlock(
          'affine:paragraph',
          { text: new Text(`${verseLabel(verse)} ${verse.content}`) },
          parent,
          index + 1 + offset
        );
      });
    });
    close();
  };

  const sheet = document.createElement('div');
  sheet.className = 'affine-bible-dialog';
  const head = document.createElement('div');
  head.className = 'affine-bible-head';
  const title = document.createElement('h2');
  title.textContent = '圣经经文';
  const closeButton = document.createElement('button');
  closeButton.className = 'affine-bible-close';
  closeButton.textContent = '关闭';
  closeButton.onclick = close;
  head.append(title, closeButton);
  const controls = document.createElement('div');
  controls.className = 'affine-bible-controls';
  controls.append(bookSelect, chapterInput, searchInput);
  const actions = document.createElement('div');
  actions.className = 'affine-bible-actions';
  const copyButton = document.createElement('button');
  copyButton.className = 'secondary';
  copyButton.textContent = '复制选中经文';
  copyButton.onclick = () => void copySelected();
  const insertButton = document.createElement('button');
  insertButton.textContent = '插入文档';
  insertButton.onclick = insertSelected;
  actions.append(copyButton, insertButton);
  sheet.append(head, controls, resultList, actions);
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
  [bookSelect, chapterInput, searchInput].forEach(input =>
    input.addEventListener('input', renderResults)
  );
  renderResults();
  searchInput.focus();
}
