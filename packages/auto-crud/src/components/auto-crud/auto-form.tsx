"use client";

import { z } from "zod";
import { useMemo, useImperativeHandle, forwardRef } from "react";
import { createForm } from "@formily/core";
import { Form, JsonSchemaField } from "@pixpilot/formily-shadcn";
import { connect, mapProps } from "@formily/react";
import { Button } from "@pixpilot/shadcn";
import { Switch as UiSwitch } from "@pixpilot/shadcn";
import { createEditFormSchema } from "@/lib/schema-bridge/zod-to-formily";
import type { FormSchemaOverrides } from "@/lib/schema-bridge/types";

interface AutoFormProps<T extends z.ZodObject<z.ZodRawShape>> {
  schema: T;
  initialValues?: Partial<z.infer<T>>;
  onSubmit: (values: z.infer<T>) => void | Promise<void>;
  overrides?: FormSchemaOverrides;
  mode?: "create" | "edit";
  loading?: boolean;
  gridColumns?: number;
  /** Label 对齐方式 */
  labelAlign?: "left" | "top" | "right";
  /** Label 宽度（labelAlign 为 left 时有效） */
  labelWidth?: number | string;
  /** 是否显示提交按钮（默认 true） */
  showSubmitButton?: boolean;
}

export interface AutoFormRef {
  submit: () => Promise<void>;
}

// 使用与应用一致的 Switch 样式
const FormilySwitch = connect(
  UiSwitch,
  mapProps({
    value: "checked",
    onInput: "onCheckedChange",
  })
);

function AutoFormInner<T extends z.ZodObject<z.ZodRawShape>>(
  {
    schema: zodSchema,
    initialValues,
    onSubmit,
    overrides,
    mode = "create",
    loading = false,
    gridColumns = 1,
    labelAlign = "top",
    labelWidth,
    showSubmitButton = true,
  }: AutoFormProps<T>,
  ref: React.Ref<AutoFormRef>
) {
  const form = useMemo(
    () => createForm({ initialValues }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(initialValues)]
  );

  const formSchema = useMemo(
    () =>
      createEditFormSchema(zodSchema, {
        overrides,
        layout: "grid",
        gridColumns,
        labelAlign,
        labelWidth,
      }),
    [zodSchema, overrides, gridColumns, labelAlign, labelWidth]
  );

  const handleSubmit = async () => {
    await form.validate();
    if (form.valid) {
      await onSubmit(form.values as z.infer<T>);
    }
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }));

  return (
    <Form form={form}>
      <JsonSchemaField
        schema={formSchema}
        components={{ fields: { Switch: { component: FormilySwitch, decorator: "FormItem" } } }}
      />
      {showSubmitButton && (
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "处理中..." : mode === "create" ? "创建" : "保存"}
          </Button>
        </div>
      )}
    </Form>
  );
}

export const AutoForm = forwardRef(AutoFormInner) as <T extends z.ZodObject<z.ZodRawShape>>(
  props: AutoFormProps<T> & { ref?: React.Ref<AutoFormRef> }
) => ReturnType<typeof AutoFormInner>;
