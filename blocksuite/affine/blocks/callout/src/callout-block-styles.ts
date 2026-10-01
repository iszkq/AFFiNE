import { css } from '@emotion/css';

export const calloutHostStyles = css({
  display: 'block',
  margin: '8px 0',
});

export const calloutBlockContainerStyles = css({
  display: 'flex',
  alignItems: 'flex-start',
  padding: '5px 10px',
  borderRadius: '8px',
  position: 'relative',
});

export const calloutEmojiContainerStyles = css({
  userSelect: 'none',
  fontSize: '1.2em',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // marginTop is dynamically set by JavaScript based on first child's height
  marginBottom: '10px',
  flexShrink: 0,
  position: 'relative',
});

export const calloutEmojiStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ':hover': {
    cursor: 'pointer',
    opacity: 0.7,
  },
});

export const calloutChildrenStyles = css({
  flex: 1,
  minWidth: 0,
  paddingLeft: '10px',
});

export const calloutColorPickerStyles = css({
  display: 'flex',
  gap: '4px',
  alignItems: 'center',
  position: 'absolute',
  top: '6px',
  right: '8px',
  opacity: 0.65,
  transition: 'opacity 120ms ease',
  ':hover': { opacity: 1 },
});

export const calloutColorButtonStyles = css({
  width: '14px',
  height: '14px',
  padding: 0,
  border: '1px solid rgb(0 0 0 / 18%)',
  borderRadius: '50%',
  cursor: 'pointer',
});

export const iconPickerContainerStyles = css({
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 1000,
  background: 'white',
  border: '1px solid #ccc',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  width: '390px',
  height: '400px',
});
