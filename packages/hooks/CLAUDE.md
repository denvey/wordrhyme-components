[根目录](../../../CLAUDE.md) > [shadcn-components](../../CLAUDE.md) > [packages](../) > **hooks**

# @internal/hooks

> 共享 React Hooks 库，提供项目内部使用的通用 Hooks。

## 模块职责

本模块提供 shadcn-components monorepo 内部共享的 React Hooks：

- `useControlled` - 受控/非受控组件状态管理

## 入口与启动

### 入口文件

- **主入口**: `src/index.ts`

**注意**: 这是一个内部包（private: true），不发布到 npm。

### 开发命令

```bash
pnpm test           # 测试
pnpm typecheck      # 类型检查
```

## 对外接口

### Hooks 导出

```typescript
export { useControlled } from './use-controlled';
```

### 使用示例

```typescript
import { useControlled } from '@internal/hooks';

function MyComponent({ value, defaultValue, onChange }) {
  const [internalValue, setInternalValue] = useControlled({
    controlled: value,
    default: defaultValue,
    name: 'MyComponent',
  });

  const handleChange = (newValue) => {
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <input
      value={internalValue}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
```

## 组件目录结构

```
src/
├── index.ts
└── use-controlled.ts
```

## 相关文件清单

| 类别  | 关键文件                        |
| ----- | ------------------------------- |
| 入口  | `src/index.ts`                  |
| Hooks | `src/use-controlled.ts`         |
| 配置  | `package.json`, `tsconfig.json` |

## 变更记录 (Changelog)

### 2026-01-14

- 初始化模块文档
