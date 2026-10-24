'use client';

import { z } from 'zod';
import { useRef } from 'react';
import { FormModal, type ModalVariant } from './form-modal';
import { AutoForm, type AutoFormProps, type AutoFormRef } from './auto-form';
import { Button } from '@wordrhyme/shadcn';
import type { FormSchemaOverrides } from '@/lib/schema-bridge/types';
import type { AutoCrudLocale } from '@/i18n/locale';
import { zhCN } from '@/i18n/locale';
import type { JsonSchemaFormScope } from '@wordrhyme/formily-shadcn';

interface CrudFormModalProps<T extends z.ZodObject<z.ZodRawShape>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: T;
  initialValues?: Partial<z.infer<T>>;
  loading?: boolean;
  variant?: ModalVariant;
  overrides?: FormSchemaOverrides;
  scope?: JsonSchemaFormScope;
  title?: string;
  locale?: AutoCrudLocale['formModal'];
  gridColumns?: number;
  /** Label 对齐方式 */
  labelAlign?: AutoFormProps<T>['labelAlign'];
  /** Label 宽度（labelAlign 为 left 或 right 时有效） */
  labelWidth?: AutoFormProps<T>['labelWidth'];
  /** 弹窗自定义样式 */
  className?: string;
}

type CrudFormModalMode<T extends z.ZodObject<z.ZodRawShape>> =
  | { mode: 'view'; onSubmit?: never }
  | { mode: 'create' | 'edit'; onSubmit: NonNullable<AutoFormProps<T>['onSubmit']> };

export function CrudFormModal<T extends z.ZodObject<z.ZodRawShape>>({
  open,
  onOpenChange,
  mode,
  schema,
  initialValues,
  onSubmit,
  loading = false,
  variant = 'dialog',
  overrides,
  scope,
  title,
  locale = zhCN.formModal,
  gridColumns,
  labelAlign,
  labelWidth,
  className,
}: CrudFormModalProps<T> & CrudFormModalMode<T>) {
  const defaultTitle =
    mode === 'create'
      ? locale.createTitle
      : mode === 'edit'
        ? locale.editTitle
        : zhCN.viewModal.title;
  const formRef = useRef<AutoFormRef>(null);

  const handleSubmit = async () => {
    await formRef.current?.submit();
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? defaultTitle}
      variant={variant}
      className={className}
      footer={
        mode !== 'view' ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {locale.cancel}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading
                ? locale.submitting
                : mode === 'create'
                  ? locale.create
                  : locale.save}
            </Button>
          </div>
        ) : undefined
      }
    >
      <AutoForm
        ref={formRef}
        schema={schema}
        {...(mode === 'view' ? { mode } : { mode, onSubmit })}
        initialValues={initialValues}
        loading={loading}
        overrides={overrides}
        scope={scope}
        gridColumns={gridColumns}
        labelAlign={labelAlign}
        labelWidth={labelWidth}
        showSubmitButton={false}
      />
    </FormModal>
  );
}
