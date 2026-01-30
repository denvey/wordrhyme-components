"use client";

import { z } from "zod";
import { useRef } from "react";
import { FormModal, type ModalVariant } from "./form-modal";
import { AutoForm, type AutoFormRef } from "./auto-form";
import { Button } from "@pixpilot/shadcn";
import type { FormSchemaOverrides } from "@/lib/schema-bridge/types";

interface CrudFormModalProps<T extends z.ZodObject<z.ZodRawShape>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  schema: T;
  initialValues?: Partial<z.infer<T>>;
  onSubmit: (values: z.infer<T>) => void | Promise<void>;
  loading?: boolean;
  variant?: ModalVariant;
  overrides?: FormSchemaOverrides;
  title?: string;
  /** Label 对齐方式 */
  labelAlign?: "left" | "top" | "right";
  /** Label 宽度（labelAlign 为 left 时有效） */
  labelWidth?: number | string;
}

export function CrudFormModal<T extends z.ZodObject<z.ZodRawShape>>({
  open,
  onOpenChange,
  mode,
  schema,
  initialValues,
  onSubmit,
  loading = false,
  variant = "dialog",
  overrides,
  title,
  labelAlign,
  labelWidth,
}: CrudFormModalProps<T>) {
  const defaultTitle = mode === "create" ? "新建" : "编辑";
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
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "处理中..." : mode === "create" ? "创建" : "保存"}
          </Button>
        </div>
      }
    >
      <AutoForm
        ref={formRef}
        schema={schema}
        mode={mode}
        initialValues={initialValues}
        loading={loading}
        onSubmit={onSubmit}
        overrides={overrides}
        labelAlign={labelAlign}
        labelWidth={labelWidth}
        showSubmitButton={false}
      />
    </FormModal>
  );
}
