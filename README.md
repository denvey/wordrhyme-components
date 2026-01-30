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


## 🚢 Releases

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

## 📄 License

[MIT](LICENSE)
