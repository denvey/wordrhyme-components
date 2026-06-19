#!/bin/bash

# auto-crud 代码提取脚本
# 从 tablecn 项目提取相关代码到 shadcn-components/packages/auto-crud

set -e

SOURCE_DIR="/Users/denvey/Workspace/Coding/Personal/wordrhyme-crud/tablecn/src"
TARGET_DIR="/Users/denvey/Workspace/Coding/Personal/wordrhyme-crud/shadcn-components/packages/auto-crud/src"

echo "🚀 开始提取 auto-crud 代码..."

# 1. 复制 auto-crud 组件
echo "📦 复制 auto-crud 组件..."
cp -r "$SOURCE_DIR/components/auto-crud" "$TARGET_DIR/components/"

# 2. 复制 data-table 组件
echo "📦 复制 data-table 组件..."
cp -r "$SOURCE_DIR/components/data-table" "$TARGET_DIR/components/"

# 3. UI 组件已迁移到 @wordrhyme/shadcn 和 @wordrhyme/shadcn-ui
echo "📦 跳过 UI 组件复制，使用共享 UI 包..."

# 4. 复制 hooks
echo "📦 复制 hooks..."
cp -r "$SOURCE_DIR/hooks/"* "$TARGET_DIR/hooks/" 2>/dev/null || true

# 5. 复制 lib/schema-bridge
echo "📦 复制 schema-bridge..."
cp -r "$SOURCE_DIR/lib/schema-bridge" "$TARGET_DIR/lib/"

# 6. 复制其他 lib 工具
echo "📦 复制工具函数..."
cp "$SOURCE_DIR/lib/utils.ts" "$TARGET_DIR/lib/" 2>/dev/null || true
cp "$SOURCE_DIR/lib/format.ts" "$TARGET_DIR/lib/" 2>/dev/null || true
cp "$SOURCE_DIR/lib/data-table.ts" "$TARGET_DIR/lib/" 2>/dev/null || true

# 7. 复制 types
echo "📦 复制类型定义..."
cp -r "$SOURCE_DIR/types/"* "$TARGET_DIR/types/" 2>/dev/null || true

# 8. 创建主入口文件
echo "📝 创建入口文件..."
cat > "$TARGET_DIR/index.ts" << 'EOF'
// Auto-CRUD Components
export { AutoCrudTable } from "./components/auto-crud/auto-crud-table";
export { AutoForm } from "./components/auto-crud/auto-form";
export { AutoTable } from "./components/auto-crud/auto-table";
export { AutoTableActionBar } from "./components/auto-crud/auto-table-action-bar";
export { AutoTableSimpleFilters } from "./components/auto-crud/auto-table-simple-filters";
export { CrudFormModal } from "./components/auto-crud/crud-form-modal";

// Data Table Components
export { DataTable } from "./components/data-table/data-table";
export { DataTableAdvancedToolbar } from "./components/data-table/data-table-advanced-toolbar";
export { DataTableColumnHeader } from "./components/data-table/data-table-column-header";
export { DataTableFacetedFilter } from "./components/data-table/data-table-faceted-filter";
export { DataTableFloatingBar } from "./components/data-table/data-table-floating-bar";
export { DataTablePagination } from "./components/data-table/data-table-pagination";
export { DataTableToolbar } from "./components/data-table/data-table-toolbar";
export { DataTableViewOptions } from "./components/data-table/data-table-view-options";

// Hooks
export { useAutoCrudResource } from "./hooks/use-auto-crud-resource";
export { useDataTable } from "./hooks/use-data-table";

// Schema Bridge
export { parseZodField, zodToFormilySchema } from "./lib/schema-bridge/zod-to-formily";
export { zodToColumns } from "./lib/schema-bridge/zod-to-columns";
export type { FieldsConfig, FieldConfig, FormFieldConfig, TableFieldConfig } from "./lib/schema-bridge/field-config";

// Utils
export { cn } from "./lib/utils";
export { formatDate } from "./lib/format";

// Types
export type * from "./types/data-table";
EOF

echo "✅ 代码提取完成！"
echo "📁 目标目录: $TARGET_DIR"
