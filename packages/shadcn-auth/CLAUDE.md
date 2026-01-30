[根目录](../../../CLAUDE.md) > [shadcn-components](../../CLAUDE.md) > [packages](../) > **shadcn-auth**

# @pixpilot/shadcn-auth

> 认证表单组件库，提供登录、注册、密码重置等预构建表单。

## 模块职责

本模块提供开箱即用的认证相关 UI 组件：

- 登录表单（SignInForm）
- 注册表单（SignUpForm）
- 密码重置表单（ResetPasswordForm）
- Google 登录按钮（GoogleSignIn）
- 统一认证表单容器（AuthForms）

## 入口与启动

### 入口文件
- **主入口**: `src/index.ts`

### 开发命令

```bash
pnpm build          # 构建
pnpm build:watch    # 监听模式构建
pnpm test           # 测试
pnpm typecheck      # 类型检查
```

## 对外接口

### 组件导出

```typescript
export { AuthForms } from './AuthForms';
export { SignInForm } from './SignInForm';
export { SignUpForm } from './SignUpForm';
export { ResetPasswordForm } from './ResetPasswordForm';
export { GoogleSignIn } from './GoogleSignIn';
```

### 使用示例

```tsx
import { SignInForm } from '@pixpilot/shadcn-auth';

function LoginPage() {
  const handleSignIn = async (data: { email: string; password: string }) => {
    // 处理登录逻辑
  };

  return (
    <SignInForm
      onSubmit={handleSignIn}
      onForgotPassword={() => router.push('/forgot-password')}
      onSignUp={() => router.push('/signup')}
    />
  );
}
```

## 关键依赖与配置

### 核心依赖
| 包名 | 用途 |
|------|------|
| @pixpilot/shadcn | 基础 UI 组件 |
| @pixpilot/shadcn-ui | 扩展 UI 组件 |
| lucide-react | 图标 |

### Peer Dependencies
- react >= 18.0.0
- react-dom >= 18.0.0

## 组件目录结构

```
src/
├── AuthForms.tsx
├── GoogleSignIn.tsx
├── ResetPasswordForm.tsx
├── SignInForm.tsx
├── SignUpForm.tsx
└── index.ts
```

## Storybook

查看组件演示：
```bash
cd ../../../  # 返回 monorepo 根目录
pnpm storybook
```

Stories 文件位于 `stories/SignInForm.stories.tsx`。

## 相关文件清单

| 类别 | 关键文件 |
|------|---------|
| 入口 | `src/index.ts` |
| 组件 | `src/*.tsx` |
| Stories | `stories/*.stories.tsx` |
| 配置 | `package.json`, `tsconfig.json` |

## 变更记录 (Changelog)

### 2026-01-14
- 初始化模块文档

详细变更历史请查看 [CHANGELOG.md](./CHANGELOG.md)
