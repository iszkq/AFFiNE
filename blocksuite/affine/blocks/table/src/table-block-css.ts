import { css } from '@emotion/css';

const externalRangeSelectionSelector =
  'affine-table[data-external-range-selection]';
const hiddenSelectionBackground = '#fff';

export const tableContainer = css({
  display: 'block',
  padding: '10px 0 18px 10px',
  overflowX: 'auto',
  overflowY: 'visible',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  '& *': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  [`${externalRangeSelectionSelector} &::selection`]: {
    backgroundColor: hiddenSelectionBackground,
  },
  [`${externalRangeSelectionSelector} & *::selection`]: {
    backgroundColor: hiddenSelectionBackground,
  },
  [`${externalRangeSelectionSelector} & rich-text::selection`]: {
    backgroundColor: hiddenSelectionBackground,
  },
  [`${externalRangeSelectionSelector} & rich-text *::selection`]: {
    backgroundColor: hiddenSelectionBackground,
  },
  '::-webkit-scrollbar': {
    height: '8px',
  },
  '::-webkit-scrollbar-thumb:horizontal': {
    borderRadius: '4px',
    backgroundColor: 'transparent',
  },
  '::-webkit-scrollbar-track:horizontal': {
    backgroundColor: 'transparent',
    height: '8px',
  },
  '&:hover::-webkit-scrollbar-thumb:horizontal': {
    borderRadius: '4px',
    backgroundColor: 'var(--affine-black-30)',
  },
  '&:hover::-webkit-scrollbar-track:horizontal': {
    backgroundColor: 'var(--affine-hover-color)',
    height: '8px',
  },
});

export const tableWrapper = css({
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'row',
  gap: '8px',
  position: 'relative',
  width: 'max-content',
});

export const table = css({});

export const rowStyle = css({});

export const tableSelectionActions = css({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  position: 'absolute',
  top: '-34px',
  left: '10px',
  zIndex: 5,
  padding: '4px',
  borderRadius: '8px',
  backgroundColor: 'var(--affine-layer-background-overlay-panel, #fff)',
});

export const tableSelectionAction = css({
  height: '26px',
  padding: '0 8px',
  border: '1px solid var(--affine-border-color, #ddd)',
  borderRadius: '5px',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: '12px',
  ':hover': { backgroundColor: 'var(--affine-hover-color, #f5f5f5)' },
  ':disabled': { opacity: 0.45, cursor: 'default' },
});
