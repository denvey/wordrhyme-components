import React, { useEffect, useRef } from 'react';
import { Engine, GlobalRegistry } from '@wordrhyme/designable-core';
import { DesignerEngineContext } from '../context';
import { IDesignerProps } from '../types';
import { GhostWidget } from '../widgets';
import { useDesigner } from '../hooks';
import { Layout } from './Layout';
import * as icons from '../icons';

GlobalRegistry.registerDesignerIcons(icons);

export const Designer: React.FC<IDesignerProps> = (props) => {
  const {
    children,
    engine: engineProp,
    position,
    prefixCls = 'dn-',
    theme = 'light',
    variables,
  } = props;
  const engine = useDesigner();
  const ref = useRef<Engine>();
  useEffect(() => {
    if (engineProp) {
      if (engineProp && ref.current) {
        if (engineProp !== ref.current) {
          ref.current.unmount();
        }
      }
      engineProp.mount();
      ref.current = engineProp;
    }
    return () => {
      if (engineProp) {
        engineProp.unmount();
      }
    };
  }, [engineProp]);

  if (engine)
    throw new Error('There can only be one Designable Engine Context in the React Tree');

  return (
    <Layout position={position} prefixCls={prefixCls} theme={theme} variables={variables}>
      <DesignerEngineContext.Provider value={engineProp}>
        {children}
        <GhostWidget />
      </DesignerEngineContext.Provider>
    </Layout>
  );
};

Designer.defaultProps = {
  prefixCls: 'dn-',
  theme: 'light',
};
