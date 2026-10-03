# Shadcn Components

> A modern TypeScript monorepo managed with pnpm and TurboRepo.

## 🚀 Getting Started

### Development

Build all packages:

```sh
pnpm build
```

Run tests:

```sh
pnpm test
```

Lint and format:

```sh
pnpm lint
pnpm format
```

### Create a New Package

Generate a new package in the monorepo:

```sh
pnpm run turbo:gen:init
```

## 📦 Packages

### [auto-crud](./packages/auto-crud/README.md)

Schema-first CRUD components with auto-generated tables and forms

### [auto-crud-server](./packages/auto-crud-server/README.md)

tRPC server utilities for auto-crud - automatic CRUD routers for Drizzle ORM

### [shadcn](./packages/shadcn/README.md)

A collection of reusable UI components built with shadcn/ui and Radix UI primitives.

### [shadcn-auth](./packages/shadcn-auth/README.md)

Authentication forms and components built with shadcn/ui.

### [shadcn-formily](./packages/shadcn-formily/README.md)

Formily integration for shadcn/ui components

### [shadcn-ui](./packages/shadcn-ui/README.md)

Custom UI components and utilities built with shadcn/ui.

## Styles

`@wordrhyme/shadcn`, `@wordrhyme/shadcn-ui`, `@wordrhyme/formily-shadcn`, and
`@wordrhyme/auto-crud` each provide two stylesheet entries. Choose one mode and
import only the highest-level package you use; its entry includes the component
dependency chain.

Both public entries are generated in `dist` during the package build. Their
import paths stay the same; workspace consumers must build the packages first.

### Tailwind CSS v4

Import the source entry in your application's Tailwind stylesheet:

```css
@import 'tailwindcss';
@import '@wordrhyme/auto-crud/tailwind.css';
```

`tailwind.css` registers the packages' published JavaScript for class detection.
Your application supplies the Tailwind compiler, theme, reset, and plugins needed
by the components. This entry only registers sources; it does not add a theme or
generate CSS itself.

### Without Tailwind CSS

Import the precompiled stylesheet once in your application entry:

```ts
import '@wordrhyme/auto-crud/styles.css';
```

`styles.css` includes component utilities, default theme variables, dark mode,
and animations. No Tailwind compiler is needed. It omits global Preflight and page
background rules; your application supplies native element normalization and
page fonts. The utility class names also apply elsewhere on the page.

Load theme overrides after this stylesheet (for example, override `--primary`
and `--primary-foreground` on `:root`). Add `dark` to `html` for dark mode.
Additional `className` values need your own CSS or inline styles.

AutoCrud's precompiled stylesheet also covers modal and menu primitives from
the `@wordrhyme/ui` peer installed at build time. Keep a supported version of that
JavaScript peer installed in your application.

## 🚢 Releases

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

## 📄 License

[MIT](LICENSE)
