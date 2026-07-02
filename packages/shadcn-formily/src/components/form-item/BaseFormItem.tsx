/* eslint-disable react/no-clone-element */

import type {
  DescriptionPlacement,
  FormItemAlign,
  FormItemLabelProps,
  FormItemLayout,
  FormItemProps,
  FormItemSlots,
  LabelPlacement,
} from './form-item-types';
import type { SyncReactNode } from '../../types';
import { useField } from '@formily/react';
import { cn } from '@wordrhyme/shadcn';
import { getId } from '@wordrhyme/shadcn-ui';

import React from 'react';
import { useFormContext, useLabel } from '../../hooks';
import { FormItemLabel } from './FormItemLabel';
import { getSpacingConfig } from './spacing-config';

function resolveLegacyDescriptionPlacement(
  labelPlacement: LabelPlacement,
): Exclude<DescriptionPlacement, 'popover'> {
  return labelPlacement === 'top' ? 'top' : 'bottom';
}

function resolveLayoutLabelPlacement(
  layout: FormItemLayout | null | undefined,
): LabelPlacement | undefined {
  if (layout === 'vertical') return 'top';
  if (layout === 'horizontal' || layout === 'inline') return 'start';
  return undefined;
}

function resolveSpanWidth(span: number | undefined) {
  if (typeof span !== 'number' || span <= 0) return undefined;
  return `${(Math.min(span, 24) / 24) * 100}%`;
}

function resolveSize(value: number | string | undefined) {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') return value;
  return /^\d+$/u.test(value) ? `${value}px` : value;
}

function resolveAlignClassName(align: FormItemAlign | null | undefined) {
  if (align === 'right') return 'justify-end text-right';
  if (align === 'left') return 'justify-start text-left';
  return undefined;
}

function withColon(label: SyncReactNode, colon: boolean | undefined): SyncReactNode {
  if (!colon) return label;

  return (
    <>
      {label}
      <span aria-hidden="true">:</span>
    </>
  );
}

/*
 * BaseFormItem component serves as a decorator for Formily fields.
 * It provides label, error messages, and description display.
 */
export const BaseFormItem: React.FC<React.PropsWithChildren<FormItemProps>> = ({
  addonAfter,
  addonBefore,
  bordered,
  className,
  children,
  colon,
  label,
  description,
  descriptionPlacement,
  asterisk,
  feedbackLayout,
  feedbackStatus,
  feedbackText,
  fullness,
  gridSpan,
  inset,
  labelAlign,
  labelCol,
  labelWidth,
  labelWrap,
  layout: itemLayout,
  shallow: _shallow,
  size,
  slots,
  style,
  tooltip,
  tooltipLayout,
  wrapperAlign,
  wrapperCol,
  wrapperWidth,
  wrapperWrap,
  ...props
}) => {
  const field = useField();
  const fieldDecoratorProps = (field as unknown as { decoratorProps?: unknown })
    ?.decoratorProps as Record<string, unknown> | undefined;
  const fieldComponentProps = (field as unknown as { componentProps?: unknown })
    ?.componentProps as Record<string, unknown> | undefined;

  const fieldDecoratorSlots = fieldDecoratorProps?.slots as FormItemSlots | undefined;
  const fieldComponentSlots = fieldComponentProps?.slots as FormItemSlots | undefined;

  const fieldLabelProps: FormItemLabelProps | undefined =
    fieldDecoratorSlots?.label ??
    (fieldDecoratorProps?.labelProps as FormItemLabelProps | undefined) ??
    fieldComponentSlots?.label ??
    (fieldComponentProps?.labelProps as FormItemLabelProps | undefined);

  const effectiveLabel = useLabel(label);
  const effectiveDescription = description ?? tooltip;

  const { layout } = useFormContext();
  const itemComponentsProps = layout?.itemProps || {};
  const contextDescriptionPlacement = layout?.descriptionPlacement;
  const contextLabelPlacement = layout?.labelPlacement;

  const fieldLabelPlacement: LabelPlacement | undefined =
    fieldLabelProps?.placement ??
    (fieldDecoratorProps?.labelPlacement as LabelPlacement | undefined) ??
    (fieldComponentProps?.labelPlacement as LabelPlacement | undefined);

  const propLabelPlacement: LabelPlacement | undefined = slots?.label?.placement;
  const layoutLabelPlacement = resolveLayoutLabelPlacement(itemLayout);

  const effectiveLabelPlacement: LabelPlacement =
    fieldLabelPlacement ??
    propLabelPlacement ??
    layoutLabelPlacement ??
    contextLabelPlacement ??
    'top';

  const fieldDescriptionPlacement: DescriptionPlacement | undefined =
    (fieldComponentProps?.descriptionPlacement as DescriptionPlacement | undefined) ??
    (fieldDecoratorProps?.descriptionPlacement as DescriptionPlacement | undefined);

  const tooltipDescriptionPlacement: DescriptionPlacement | undefined =
    tooltip != null && tooltipLayout === 'icon' ? 'popover' : undefined;

  const effectiveDescriptionPlacement: DescriptionPlacement | undefined =
    fieldDescriptionPlacement ??
    descriptionPlacement ??
    tooltipDescriptionPlacement ??
    contextDescriptionPlacement;

  const resolvedDescriptionPlacement: DescriptionPlacement =
    effectiveDescriptionPlacement ??
    resolveLegacyDescriptionPlacement(effectiveLabelPlacement);

  const id =
    (field?.componentProps?.id as string) ??
    `form-${field?.address?.toString()?.replace(/\./gu, '-')}`;

  const descriptionId = getId(id, 'description');
  const feedbackId = getId(id, 'feedback');

  const descriptionRenderedInline =
    effectiveDescription != null && resolvedDescriptionPlacement !== 'popover';

  const spacingConfig = getSpacingConfig(
    resolvedDescriptionPlacement,
    descriptionRenderedInline,
  );

  const ariaDescribedBy = [
    descriptionRenderedInline ? descriptionId : undefined,
    feedbackText != null ? feedbackId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  const labelStyle: React.CSSProperties = {
    ...fieldLabelProps?.style,
    ...itemComponentsProps.label?.style,
    ...slots?.label?.style,
  };
  const resolvedLabelWidth = resolveSize(labelWidth) ?? resolveSpanWidth(labelCol);
  if (resolvedLabelWidth != null) {
    labelStyle.width = resolvedLabelWidth;
    labelStyle.flexBasis = resolvedLabelWidth;
  }

  const inputWrapperStyle: React.CSSProperties = {
    ...itemComponentsProps.inputWrapper?.style,
    ...slots?.inputWrapper?.style,
  };
  const resolvedWrapperWidth = resolveSize(wrapperWidth) ?? resolveSpanWidth(wrapperCol);
  if (resolvedWrapperWidth != null) {
    inputWrapperStyle.width = resolvedWrapperWidth;
    inputWrapperStyle.flexBasis = resolvedWrapperWidth;
  }
  if (fullness) {
    inputWrapperStyle.width = '100%';
  }

  const containerStyle: React.CSSProperties = {
    ...itemComponentsProps.container?.style,
    ...slots?.container?.style,
    ...style,
  };
  if (typeof gridSpan === 'number' && gridSpan > 0) {
    containerStyle.gridColumn = `span ${gridSpan} / span ${gridSpan}`;
  }

  const labelElement = effectiveLabel != null && (
    <FormItemLabel
      data-slot="form-item-label"
      id={id}
      label={withColon(effectiveLabel, colon)}
      asterisk={asterisk}
      error={feedbackStatus === 'error'}
      shrink={effectiveLabelPlacement === 'end' || effectiveLabelPlacement === 'start'}
      labelProps={{
        ...fieldLabelProps,
        ...itemComponentsProps.label,
        ...slots?.label,
        style: labelStyle,
        className: cn(
          effectiveLabelPlacement === 'top' ? spacingConfig.label : 'mb-0',
          resolveAlignClassName(labelAlign),
          labelWrap === false && 'whitespace-nowrap',
          fieldLabelProps?.className,
          itemComponentsProps.label?.className,
          slots?.label?.className,
        ),
      }}
      description={effectiveDescription}
      descriptionInPopover={
        resolvedDescriptionPlacement === 'popover' && effectiveDescription != null
      }
    />
  );

  const fieldControlElement = React.isValidElement<Record<string, unknown>>(children)
    ? React.cloneElement(children, {
        id,
        'aria-describedby': ariaDescribedBy || undefined,
        'aria-invalid': feedbackStatus === 'error' ? 'true' : undefined,
        ...(size != null && children.props?.size == null ? { size } : {}),
      } as Record<string, unknown>)
    : children;

  const inputWithAddons =
    addonBefore != null || addonAfter != null ? (
      <div data-slot="form-item-addon-group" className="flex w-full items-stretch">
        {addonBefore != null ? (
          <div
            data-slot="form-item-addon-before"
            className="border-input bg-muted text-muted-foreground inline-flex min-h-9 shrink-0 items-center rounded-l-md border border-r-0 px-3 text-sm"
          >
            {addonBefore}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">{fieldControlElement}</div>
        {addonAfter != null ? (
          <div
            data-slot="form-item-addon-after"
            className="border-input bg-muted text-muted-foreground inline-flex min-h-9 shrink-0 items-center rounded-r-md border border-l-0 px-3 text-sm"
          >
            {addonAfter}
          </div>
        ) : null}
      </div>
    ) : (
      fieldControlElement
    );

  const inputElement = (
    <div
      data-slot="form-item-input"
      {...itemComponentsProps.inputWrapper}
      {...slots?.inputWrapper}
      style={inputWrapperStyle}
      className={cn(
        'relative min-w-0',
        fullness && 'w-full',
        wrapperWrap === false && 'whitespace-nowrap',
        resolveAlignClassName(wrapperAlign),
        itemComponentsProps.inputWrapper?.className,
        slots?.inputWrapper?.className,
      )}
    >
      {inputWithAddons}
    </div>
  );

  const descriptionElement = descriptionRenderedInline ? (
    <p
      data-slot="form-item-description"
      {...itemComponentsProps.description}
      {...slots?.description}
      id={descriptionId}
      className={cn(
        'text-muted-foreground text-[0.8rem]',
        spacingConfig.description,
        itemComponentsProps.description?.className,
        slots?.description?.className,
      )}
    >
      {effectiveDescription}
    </p>
  ) : null;

  const contentElement = (
    <>
      {effectiveLabelPlacement === 'top' && labelElement}

      {resolvedDescriptionPlacement === 'top' && descriptionElement}

      {(effectiveLabelPlacement === 'start' || effectiveLabelPlacement === 'end') && (
        <div
          data-slot="form-item-content"
          className={cn(
            'flex items-center gap-2',
            effectiveLabelPlacement === 'start' && 'flex-row',
            // effectiveLabelPlacement === 'end' && 'flex-row-reverse',
            itemLayout === 'inline' && 'inline-flex',
            fullness && 'w-full',
          )}
        >
          {effectiveLabelPlacement === 'start' && labelElement}
          {inputElement}
          {effectiveLabelPlacement === 'end' && labelElement}
        </div>
      )}

      {effectiveLabelPlacement === 'top' && inputElement}

      {resolvedDescriptionPlacement === 'bottom' && descriptionElement}
    </>
  );

  return (
    <div
      data-slot="form-item"
      {...itemComponentsProps.container}
      {...slots?.container}
      {...props}
      style={containerStyle}
      className={cn(
        'flex flex-col',
        itemLayout === 'inline' && 'inline-flex align-middle',
        inset && 'px-3',
        bordered === true && 'rounded-md border border-border p-3',
        className,
        itemComponentsProps.container?.className,
        slots?.container?.className,
      )}
    >
      {contentElement}

      {feedbackLayout !== 'none' && Boolean(feedbackText) && (
        <p
          data-slot="form-item-feedback"
          {...itemComponentsProps.error}
          {...slots?.error}
          id={feedbackId}
          className={cn(
            'text-[0.8rem]',
            spacingConfig.feedback,
            feedbackStatus === 'error' && 'text-destructive font-medium',
            feedbackStatus === 'warning' && 'text-amber-600',
            feedbackStatus === 'success' && 'text-green-600',
            itemComponentsProps.error?.className,
            slots?.error?.className,
          )}
        >
          {typeof feedbackText === 'string'
            ? feedbackText.split('\n').map((line: string, index: number) => (
                // eslint-disable-next-line react/no-array-index-key
                <React.Fragment key={index}>
                  {line}
                  {index < feedbackText.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))
            : feedbackText}
        </p>
      )}
    </div>
  );
};
