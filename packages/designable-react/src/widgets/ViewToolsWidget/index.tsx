import React from 'react';
import { Button } from 'antd';
import { observer } from '@formily/reactive-react';
import { WorkbenchTypes } from '@wordrhyme/designable-core';
import { IconWidget } from '../IconWidget';
import { usePrefix, useWorkbench } from '../../hooks';
import cls from 'classnames';

export interface IViewToolsWidget {
  use?: WorkbenchTypes[];
  style?: React.CSSProperties;
  className?: string;
}

const defaultViewTools: WorkbenchTypes[] = ['DESIGNABLE', 'JSONTREE', 'PREVIEW'];

export const ViewToolsWidget: React.FC<IViewToolsWidget> = observer(
  ({ use, style, className }) => {
    const tools = use ?? defaultViewTools;
    const workbench = useWorkbench();
    const prefix = usePrefix('view-tools');
    return (
      <Button.Group style={style} className={cls(prefix, className)}>
        {tools.includes('DESIGNABLE') && (
          <Button
            disabled={workbench.type === 'DESIGNABLE'}
            onClick={() => {
              workbench.type = 'DESIGNABLE';
            }}
            size="small"
          >
            <IconWidget infer="Design" />
          </Button>
        )}
        {tools.includes('JSONTREE') && (
          <Button
            disabled={workbench.type === 'JSONTREE'}
            onClick={() => {
              workbench.type = 'JSONTREE';
            }}
            size="small"
          >
            <IconWidget infer="JSON" />
          </Button>
        )}
        {tools.includes('MARKUP') && (
          <Button
            disabled={workbench.type === 'MARKUP'}
            onClick={() => {
              workbench.type = 'MARKUP';
            }}
            size="small"
          >
            <IconWidget infer="Code" />
          </Button>
        )}
        {tools.includes('PREVIEW') && (
          <Button
            disabled={workbench.type === 'PREVIEW'}
            onClick={() => {
              workbench.type = 'PREVIEW';
            }}
            size="small"
          >
            <IconWidget infer="Play" />
          </Button>
        )}
      </Button.Group>
    );
  },
);

ViewToolsWidget.defaultProps = {
  use: ['DESIGNABLE', 'JSONTREE', 'PREVIEW'],
};
