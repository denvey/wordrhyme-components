import React, { Fragment, useRef, useMemo } from "react";
import { FormItem, IFormItemProps } from "@formily/antd";
import { useField, observer } from "@formily/react";
import { observable } from "@formily/reactive";
import { IconWidget, usePrefix } from "@wordrhyme/designable-react";
import cls from "classnames";
import "./styles.less";

const ExpandedMap = new Map<string, boolean>();

export const FoldItem: React.FC<IFormItemProps> & {
  Base?: React.FC;
  Extra?: React.FC;
} = observer(({ className, style, children, ...props }) => {
  const prefix = usePrefix("fold-item");
  const field = useField();
  const expand = useMemo(
    () => observable.ref(ExpandedMap.get(field.address.toString())),
    []
  );
  const slots = useRef<{ base: React.ReactNode; extra: React.ReactNode }>({
    base: null,
    extra: null,
  });
  React.Children.forEach(children, (node) => {
    if (React.isValidElement(node)) {
      const element = node as React.ReactElement<{
        children?: React.ReactNode;
      }>;
      const type = element.type as { displayName?: string };
      if (type.displayName === "FoldItem.Base") {
        slots.current.base = element.props.children;
      }
      if (type.displayName === "FoldItem.Extra") {
        slots.current.extra = element.props.children;
      }
    }
  });
  return (
    <div className={cls(prefix, className)}>
      <div
        className={prefix + "-base"}
        onClick={() => {
          expand.value = !expand.value;
          ExpandedMap.set(field.address.toString(), expand.value);
        }}
      >
        <FormItem.BaseItem
          {...props}
          label={
            <span
              className={cls(prefix + "-title", {
                expand: expand.value,
              })}
            >
              {slots.current.extra && <IconWidget infer="Expand" size={10} />}
              {props.label}
            </span>
          }
        >
          <div
            style={{ width: "100%" }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {slots.current.base}
          </div>
        </FormItem.BaseItem>
      </div>
      {expand.value && slots.current.extra && (
        <div className={prefix + "-extra"}>{slots.current.extra}</div>
      )}
    </div>
  );
});

const Base: React.FC = () => {
  return <Fragment />;
};

Base.displayName = "FoldItem.Base";

const Extra: React.FC = () => {
  return <Fragment />;
};

Extra.displayName = "FoldItem.Extra";

FoldItem.Base = Base;
FoldItem.Extra = Extra;
