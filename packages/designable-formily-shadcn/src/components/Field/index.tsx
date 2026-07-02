import React from 'react';
import { FormPath } from '@formily/core';
import { toJS } from '@formily/reactive';
import {
  ArrayField,
  Field as InternalField,
  ObjectField,
  VoidField,
  observer,
  type ISchema,
  Schema,
} from '@formily/react';
import { each, reduce } from '@formily/shared';
import { createBehavior, type TreeNode } from '@wordrhyme/designable-core';
import {
  type DnFC,
  useComponents,
  useDesigner,
  useTreeNode,
} from '@wordrhyme/designable-react';
import { isArr, isStr } from '@wordrhyme/designable-shared';
import { Container } from '../../common/Container';
import { AllLocales } from '../../locales';

export * from './schema';

Schema.silent(true);

export interface DesignableFormItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  children?: React.ReactNode;
  description?: React.ReactNode;
  label?: React.ReactNode;
  title?: React.ReactNode;
  asterisk?: boolean;
  required?: boolean;
}

export const FormItem: React.FC<DesignableFormItemProps> = ({
  asterisk,
  children,
  className,
  description,
  label,
  required,
  title,
  ...props
}) => {
  const resolvedLabel = label ?? title;
  return (
    <div data-slot="form-item" {...props} className={`space-y-1.5 ${className ?? ''}`}>
      {resolvedLabel && (
        <label className="text-sm font-medium leading-none text-foreground">
          {resolvedLabel}
          {(asterisk || required) && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
};

const SchemaStateMap = {
  title: 'title',
  description: 'description',
  default: 'value',
  enum: 'dataSource',
  readOnly: 'readOnly',
  writeOnly: 'editable',
  required: 'required',
  'x-content': 'content',
  'x-value': 'value',
  'x-editable': 'editable',
  'x-disabled': 'disabled',
  'x-read-pretty': 'readPretty',
  'x-read-only': 'readOnly',
  'x-visible': 'visible',
  'x-hidden': 'hidden',
  'x-display': 'display',
  'x-pattern': 'pattern',
};

const NeedShownExpression = {
  title: true,
  description: true,
  default: true,
  'x-content': true,
  'x-value': true,
};

const isExpression = (value: unknown) => isStr(value) && /^\{\{.*\}\}$/.test(value);

const filterExpression = (value: any): any => {
  if (typeof value === 'object' && value !== null) {
    const isArray = isArr(value);
    return reduce(
      value,
      (buffer: any, item, key) => {
        if (isExpression(item)) return buffer;
        const result = filterExpression(item);
        if (result === undefined || result === null) return buffer;
        if (isArray) return buffer.concat([result]);
        buffer[key] = result;
        return buffer;
      },
      isArray ? [] : {},
    );
  }
  if (isExpression(value)) return undefined;
  return value;
};

const composeMouseDownCapture = (
  props: Record<string, any>,
  node: TreeNode,
  clickStopPropagationAttrName: string,
) => {
  const original = props.onMouseDownCapture;

  props.onMouseDownCapture = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest?.(`*[${clickStopPropagationAttrName}]`)) {
      node.operation.selection.select(node);
    }
    original?.(event);
  };

  return props;
};

const DesignableFieldShell: React.FC<{
  children: React.ReactNode;
  clickStopPropagationAttrName: string;
  node: TreeNode;
  nodeIdAttrName: string;
}> = ({ children, clickStopPropagationAttrName, node, nodeIdAttrName }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const selectNode = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(`*[${clickStopPropagationAttrName}]`)) return;
      node.operation.selection.select(node);
    };

    element.addEventListener('pointerdown', selectNode, true);

    return () => {
      element.removeEventListener('pointerdown', selectNode, true);
    };
  }, [clickStopPropagationAttrName, node]);

  return (
    <div ref={ref} {...{ [nodeIdAttrName]: node.id }}>
      {children}
    </div>
  );
};

const toDesignableFieldProps = (
  schema: ISchema,
  components: Record<string, any>,
  nodeIdAttrName: string,
  clickStopPropagationAttrName: string,
  node: TreeNode,
) => {
  const results: Record<string, any> = {};
  each(SchemaStateMap, (fieldKey, schemaKey) => {
    const value = schema[schemaKey];
    if (isExpression(value)) {
      if (!NeedShownExpression[schemaKey]) return;
      results[fieldKey] = value;
    } else if (value !== undefined && value !== null && value !== '') {
      results[fieldKey] = filterExpression(value);
    }
  });

  if (!components.FormItem) {
    components.FormItem = FormItem;
  }

  const decorator =
    schema['x-decorator'] && FormPath.getIn(components, schema['x-decorator']);
  const component =
    schema['x-component'] && FormPath.getIn(components, schema['x-component']);
  const decoratorProps = schema['x-decorator-props'] || {};
  const componentProps = schema['x-component-props'] || {};
  const designableProps = {
    [nodeIdAttrName]: node.id,
  };

  if (decorator) {
    results.decorator = [
      decorator,
      composeMouseDownCapture(
        {
          ...toJS(decoratorProps),
          ...designableProps,
        },
        node,
        clickStopPropagationAttrName,
      ),
    ];
  }
  if (component) {
    results.component = [
      component,
      decorator
        ? toJS(componentProps)
        : composeMouseDownCapture(
            {
              ...toJS(componentProps),
              ...designableProps,
            },
            node,
            clickStopPropagationAttrName,
          ),
    ];
  }
  results.title = results.title && (
    <span data-content-editable="title">{results.title}</span>
  );
  results.description = results.description && (
    <span data-content-editable="description">{results.description}</span>
  );
  return results;
};

export const Field: DnFC<ISchema> = observer((props) => {
  const designer = useDesigner();
  const components = useComponents();
  const node = useTreeNode();
  if (!node) return null;
  const fieldProps = toDesignableFieldProps(
    props,
    components,
    designer.props.nodeIdAttrName,
    designer.props.clickStopPropagationAttrName,
    node,
  );
  const shellProps = {
    clickStopPropagationAttrName: designer.props.clickStopPropagationAttrName,
    node,
    nodeIdAttrName: designer.props.nodeIdAttrName,
  };
  if (props.type === 'object') {
    return (
      <DesignableFieldShell {...shellProps}>
        <Container>
          <ObjectField {...fieldProps} name={node.id}>
            {props.children}
          </ObjectField>
        </Container>
      </DesignableFieldShell>
    );
  }
  if (props.type === 'array') {
    return (
      <DesignableFieldShell {...shellProps}>
        <ArrayField {...fieldProps} name={node.id} />
      </DesignableFieldShell>
    );
  }
  if (node.props.type === 'void') {
    return (
      <DesignableFieldShell {...shellProps}>
        <VoidField {...fieldProps} name={node.id}>
          {props.children}
        </VoidField>
      </DesignableFieldShell>
    );
  }
  return (
    <DesignableFieldShell {...shellProps}>
      <InternalField {...fieldProps} name={node.id} />
    </DesignableFieldShell>
  );
});

Field.Behavior = createBehavior({
  name: 'Field',
  selector: 'Field',
  designerLocales: AllLocales.Field,
});
