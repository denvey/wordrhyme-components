import React, { useContext, Fragment, useRef, useLayoutEffect } from 'react';
import { each } from '@wordrhyme/designable-shared';
import { DesignerLayoutContext } from '../context';
import { IDesignerLayoutProps } from '../types';
import cls from 'classnames';

export const Layout: React.FC<IDesignerLayoutProps> = (props) => {
  const {
    children,
    position = 'fixed',
    prefixCls = 'dn-',
    theme = 'light',
    variables,
  } = props;
  const layout = useContext(DesignerLayoutContext);
  const ref = useRef<HTMLDivElement>();

  useLayoutEffect(() => {
    if (ref.current) {
      each(variables, (value, key) => {
        ref.current.style.setProperty(`--${key}`, value);
      });
    }
  }, []);

  if (layout) {
    return <Fragment>{children}</Fragment>;
  }
  return (
    <div
      ref={ref}
      className={cls({
        [`${prefixCls}app`]: true,
        [`${prefixCls}${theme}`]: theme,
      })}
    >
      <DesignerLayoutContext.Provider
        value={{
          theme,
          prefixCls,
          position,
        }}
      >
        {children}
      </DesignerLayoutContext.Provider>
    </div>
  );
};

Layout.defaultProps = {
  theme: 'light',
  prefixCls: 'dn-',
  position: 'fixed',
};
