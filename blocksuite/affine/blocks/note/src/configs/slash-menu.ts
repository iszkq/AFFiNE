import {
  formatBlockCommand,
  type TextFormatConfig,
  textFormatConfigs,
} from '@blocksuite/affine-inline-preset';
import {
  type TextAlignConfig,
  textAlignConfigs,
  type TextConversionConfig,
  textConversionConfigs,
} from '@blocksuite/affine-rich-text';
import {
  focusBlockEnd,
  getSelectedModelsCommand,
  getTextSelectionCommand,
} from '@blocksuite/affine-shared/commands';
import { isInsideBlockByFlavour } from '@blocksuite/affine-shared/utils';
import {
  type SlashMenuActionItem,
  type SlashMenuConfig,
  SlashMenuConfigExtension,
  type SlashMenuItem,
} from '@blocksuite/affine-widget-slash-menu';
import { HeadingsIcon } from '@blocksuite/icons/lit';
import { BlockSelection } from '@blocksuite/std';
import { Text } from '@blocksuite/store';

import { openBiblePicker } from '../bible-picker';
import { updateBlockAlign, updateBlockType } from '../commands';
import { tooltips } from './tooltips';

let basicIndex = 0;
const noteSlashMenuConfig: SlashMenuConfig = {
  items: [
    {
      name: '圣经经文',
      description: '按卷章或关键词搜索经文并插入文档。',
      searchAlias: ['bible', '经文', '圣经'],
      group: '4_Content & Media@0',
      action: ({ std, model }) => openBiblePicker(std, model),
    },
    {
      name: '卡片',
      description: '插入带标题、正文和颜色的卡片。',
      searchAlias: ['card', 'callout'],
      group: '4_Content & Media@1',
      action: ({ std, model }) => {
        const parent = std.store.getParent(model);
        if (!parent) return;
        const index = parent.children.indexOf(model);
        const cardId = std.store.addBlock(
          'affine:callout',
          { backgroundColorName: 'blue' },
          parent,
          index + 1
        );
        if (!cardId) return;
        const titleId = std.store.addBlock(
          'affine:paragraph',
          { type: 'h3', text: new Text('卡片标题') },
          cardId
        );
        const bodyId = std.store.addBlock(
          'affine:paragraph',
          { text: new Text('在这里输入卡片正文') },
          cardId
        );
        const focusId = bodyId || titleId;
        if (focusId) {
          std.host.updateComplete
            .then(() => {
              const paragraph = std.view.getBlock(focusId);
              if (paragraph)
                std.command.exec(focusBlockEnd, { focusBlock: paragraph });
            })
            .catch(console.error);
        }
      },
    },
    ...textConversionConfigs
      .filter(i => i.type && ['h1', 'h2', 'h3', 'text'].includes(i.type))
      .map(config => createConversionItem(config, `0_Basic@${basicIndex++}`)),
    {
      name: 'Other Headings',
      icon: HeadingsIcon(),
      group: `0_Basic@${basicIndex++}`,
      subMenu: textConversionConfigs
        .filter(i => i.type && ['h4', 'h5', 'h6'].includes(i.type))
        .map(config => createConversionItem(config)),
    },
    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:code')
      .map(config => createConversionItem(config, `0_Basic@${basicIndex++}`)),

    ...textConversionConfigs
      .filter(i => i.type && ['divider', 'quote'].includes(i.type))
      .map(
        config =>
          ({
            ...createConversionItem(config, `0_Basic@${basicIndex++}`),
            when: ({ model }) =>
              model.store.schema.flavourSchemaMap.has(config.flavour) &&
              !isInsideBlockByFlavour(
                model.store,
                model,
                'affine:edgeless-text'
              ),
          }) satisfies SlashMenuActionItem
      ),

    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:list')
      .map((config, index) =>
        createConversionItem(config, `1_List@${index++}`)
      ),

    ...textAlignConfigs.map((config, index) =>
      createAlignItem(config, `2_Align@${index++}`)
    ),

    ...textFormatConfigs
      .filter(i => !['Code', 'Link'].includes(i.name))
      .map((config, index) =>
        createTextFormatItem(config, `2_Style@${index++}`)
      ),
  ],
};

function createConversionItem(
  config: TextConversionConfig,
  group?: SlashMenuItem['group']
): SlashMenuActionItem {
  const { name, description, icon, flavour, type, searchAlias = [] } = config;
  return {
    name,
    group,
    description,
    icon,
    searchAlias,
    tooltip: tooltips[name],
    when: ({ model }) => model.store.schema.flavourSchemaMap.has(flavour),
    action: ({ std }) => {
      std.command.exec(updateBlockType, {
        flavour,
        props: { type },
      });
    },
  };
}

function createAlignItem(
  config: TextAlignConfig,
  group?: SlashMenuItem['group']
): SlashMenuActionItem {
  const { textAlign, name, icon } = config;
  return {
    name,
    group,
    icon,
    action: ({ std }) => {
      std.command
        .chain()
        .pipe(getTextSelectionCommand)
        .pipe(getSelectedModelsCommand, { types: ['text'] })
        .pipe(updateBlockAlign, { textAlign })
        .run();
    },
  };
}

function createTextFormatItem(
  config: TextFormatConfig,
  group?: SlashMenuItem['group']
): SlashMenuActionItem {
  const { name, icon, id, action } = config;
  return {
    name,
    icon,
    group,
    tooltip: tooltips[name],
    action: ({ std, model }) => {
      const { host } = std;

      if (model.text?.length !== 0) {
        std.command.exec(formatBlockCommand, {
          blockSelections: [
            std.selection.create(BlockSelection, {
              blockId: model.id,
            }),
          ],
          styles: { [id]: true },
        });
      } else {
        // like format bar when the line is empty
        action(host);
      }
    },
  };
}

export const NoteSlashMenuConfigExtension = SlashMenuConfigExtension(
  'affine:note',
  noteSlashMenuConfig
);
