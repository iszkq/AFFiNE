import {
  Button,
  Checkbox,
  DragHandle,
  IconButton,
  Input,
  Menu,
  MenuItem,
  Switch,
} from '@affine/component';
import { useI18n } from '@affine/i18n';
import { MoreHorizontalIcon } from '@blocksuite/icons/rc';
import { useEffect, useState } from 'react';

import * as styles from './index.css';
import { byokT } from './metadata';
import { ModelEditorModal } from './model-editor-modal';
import {
  capabilitiesForUseCases,
  type catalogModels,
  type ModelDeclaration,
  modelUseCases,
  useCases,
} from './model-utils';
import type { ByokKey } from './types';

const emptyDiscoveredModels: Array<{
  modelId: string;
  displayName?: string | null;
}> = [];

export const ModelSelector = ({
  customEndpoint,
  catalog,
  models,
  validation,
  onChange,
  discoveredModels = emptyDiscoveredModels,
}: {
  customEndpoint: boolean;
  catalog: ReturnType<typeof catalogModels>;
  models: ModelDeclaration[];
  validation?: ByokKey['validation'];
  onChange: (models: ModelDeclaration[]) => void;
  discoveredModels?: Array<{ modelId: string; displayName?: string | null }>;
}) => {
  const t = useI18n();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [selectedDiscoveredIds, setSelectedDiscoveredIds] = useState<string[]>(
    []
  );
  const [discoveredQuery, setDiscoveredQuery] = useState('');
  useEffect(() => {
    setSelectedDiscoveredIds([]);
    setDiscoveredQuery('');
  }, [discoveredModels]);
  const availableDiscoveredModels = discoveredModels.filter(
    model => !models.some(item => item.modelId === model.modelId)
  );
  const visibleDiscoveredModels = availableDiscoveredModels.filter(model => {
    const query = discoveredQuery.trim().toLocaleLowerCase();
    return (
      !query ||
      model.modelId.toLocaleLowerCase().includes(query) ||
      model.displayName?.toLocaleLowerCase().includes(query)
    );
  });

  const update = (index: number, model: ModelDeclaration) => {
    onChange(models.map((current, i) => (i === index ? model : current)));
  };
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= models.length) return;
    const next = [...models];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const drop = (targetIndex: number) => {
    if (draggingIndex === null || draggingIndex === targetIndex) return;
    const next = [...models];
    const [dragged] = next.splice(draggingIndex, 1);
    next.splice(targetIndex, 0, dragged);
    onChange(next);
    setDraggingIndex(null);
  };
  const evidence = (modelId: string) => {
    const checks = validation?.models.find(
      model => model.modelId === modelId
    )?.checks;
    if (!checks?.length) return byokT(t, 'model.status.not-tested');
    const verified = checks.filter(
      check => check.status.kind === 'verified'
    ).length;
    if (verified === checks.length) return byokT(t, 'model.status.verified');
    if (verified === 0) return byokT(t, 'model.status.failed');
    return byokT(t, 'model.status.partially-verified', {
      verified,
      total: checks.length,
    });
  };

  return (
    <>
      <div className={styles.modelToolbar}>
        <span className={styles.description}>
          {byokT(t, 'models.description.order')}
        </span>
        <Button
          variant="secondary"
          onClick={() => {
            setEditingIndex(null);
            setEditorOpen(true);
          }}
        >
          {byokT(t, 'action.add-model')}
        </Button>
      </div>
      {customEndpoint && availableDiscoveredModels.length ? (
        <div className={styles.catalogChoices}>
          {availableDiscoveredModels.length > 6 ? (
            <Input
              size="large"
              value={discoveredQuery}
              onChange={setDiscoveredQuery}
              placeholder={byokT(t, 'placeholder.search-models')}
            />
          ) : null}
          {visibleDiscoveredModels.map(model => (
            <label
              className={styles.catalogChoice}
              data-selected={selectedDiscoveredIds.includes(model.modelId)}
              key={model.modelId}
            >
              <Checkbox
                className={styles.modelCheckbox}
                aria-label={model.displayName ?? model.modelId}
                checked={selectedDiscoveredIds.includes(model.modelId)}
                onChange={(_, checked) =>
                  setSelectedDiscoveredIds(
                    checked
                      ? [...selectedDiscoveredIds, model.modelId]
                      : selectedDiscoveredIds.filter(id => id !== model.modelId)
                  )
                }
              />
              <span className={styles.catalogModelCopy}>
                <strong>{model.displayName ?? model.modelId}</strong>
                {model.displayName ? <small>{model.modelId}</small> : null}
              </span>
            </label>
          ))}
          <Button
            variant="secondary"
            disabled={!selectedDiscoveredIds.length}
            onClick={() => {
              const selected = availableDiscoveredModels.filter(model =>
                selectedDiscoveredIds.includes(model.modelId)
              );
              onChange([
                ...models,
                ...selected.map(model => ({
                  modelId: model.modelId,
                  enabled: true,
                  capabilities: capabilitiesForUseCases(null, ['chat']),
                })),
              ]);
              setSelectedDiscoveredIds([]);
            }}
          >
            {byokT(t, 'action.add-discovered-models', {
              count: selectedDiscoveredIds.length,
            })}
          </Button>
        </div>
      ) : null}
      {models.length ? (
        <ol className={styles.selectedModels}>
          {models.map((model, index) => {
            const catalogModel = catalog.find(
              item => item.modelId === model.modelId
            );
            const selected = modelUseCases(model);
            return (
              <li
                className={`${styles.selectedModel} ${
                  model.enabled ? '' : styles.selectedModelDisabled
                }`}
                key={model.modelId}
                onDragOver={event => event.preventDefault()}
                onDrop={event => {
                  event.preventDefault();
                  drop(index);
                }}
              >
                <div
                  className={styles.modelDragHandle}
                  draggable
                  title={byokT(t, 'action.reorder')}
                  onDragStart={() => setDraggingIndex(index)}
                  onDragEnd={() => setDraggingIndex(null)}
                >
                  <DragHandle dragging={draggingIndex === index} />
                </div>
                <div className={styles.modelCopy}>
                  <strong>{catalogModel?.displayName ?? model.modelId}</strong>
                  {catalogModel?.displayName ? (
                    <small>{model.modelId}</small>
                  ) : null}
                  <span className={styles.tags}>
                    {selected.slice(0, 3).map(useCase => {
                      const item = useCases.find(item => item.id === useCase);
                      return item ? (
                        <span className={styles.tag} key={useCase}>
                          {byokT(t, item.labelKey)}
                        </span>
                      ) : null;
                    })}
                    {selected.length > 3 ? (
                      <span className={styles.tag}>+{selected.length - 3}</span>
                    ) : null}
                  </span>
                </div>
                <span className={styles.modelStatus}>
                  {model.enabled
                    ? evidence(model.modelId)
                    : byokT(t, 'model.status.disabled')}
                </span>
                <Switch
                  checked={model.enabled}
                  aria-label={byokT(
                    t,
                    model.enabled
                      ? 'action.disable-model'
                      : 'action.enable-model',
                    { model: catalogModel?.displayName ?? model.modelId }
                  )}
                  onChange={enabled => update(index, { ...model, enabled })}
                />
                <Menu
                  items={
                    <>
                      {customEndpoint ? (
                        <MenuItem
                          onSelect={() => {
                            setEditingIndex(index);
                            setEditorOpen(true);
                          }}
                        >
                          {byokT(t, 'action.edit')}
                        </MenuItem>
                      ) : null}
                      <MenuItem
                        disabled={index === 0}
                        onSelect={() => move(index, -1)}
                      >
                        {byokT(t, 'action.move-up')}
                      </MenuItem>
                      <MenuItem
                        disabled={index === models.length - 1}
                        onSelect={() => move(index, 1)}
                      >
                        {byokT(t, 'action.move-down')}
                      </MenuItem>
                      <MenuItem
                        type="danger"
                        onSelect={() =>
                          onChange(models.filter((_, i) => i !== index))
                        }
                      >
                        {byokT(t, 'action.remove')}
                      </MenuItem>
                    </>
                  }
                >
                  <IconButton
                    size="20"
                    title={byokT(t, 'action.model-options', {
                      model: catalogModel?.displayName ?? model.modelId,
                    })}
                    icon={<MoreHorizontalIcon />}
                  />
                </Menu>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className={styles.modelEmpty}>{byokT(t, 'models.empty')}</div>
      )}
      <ModelEditorModal
        open={editorOpen}
        customEndpoint={customEndpoint}
        catalog={catalog}
        models={models}
        editingModel={editingIndex === null ? null : models[editingIndex]}
        onOpenChange={open => {
          setEditorOpen(open);
          if (!open) setEditingIndex(null);
        }}
        onSubmit={next => {
          if (editingIndex === null) {
            onChange([...models, ...next]);
          } else if (next[0]) {
            update(editingIndex, next[0]);
          }
          setEditingIndex(null);
        }}
      />
    </>
  );
};
