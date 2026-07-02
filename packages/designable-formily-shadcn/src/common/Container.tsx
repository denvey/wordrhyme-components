import React from 'react';
import { observer } from '@formily/reactive-react';
import { DroppableWidget } from '@wordrhyme/designable-react';

export const Container: React.FC<React.PropsWithChildren> = observer((props) => {
  return <DroppableWidget>{props.children}</DroppableWidget>;
});

export const withContainer = (Target: React.JSXElementConstructor<any>) => {
  return function DesignableContainer(props: any) {
    return (
      <DroppableWidget>
        <Target {...props} />
      </DroppableWidget>
    );
  };
};
