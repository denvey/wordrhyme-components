# @internal/ui

## Usage Add usage instructions here.

## Tailwind CSS v4

Import the public source entry in the application's Tailwind CSS stylesheet:

```css
@import 'tailwindcss';
@import '@wordrhyme/shadcn/tailwind.css';
```

The entry registers this package's published `dist/**/*.js` and `dist/**/*.cjs`
files for class detection. It contains only a `@source` directive; the application
provides the Tailwind reset, theme, and utility output. No application-specific
`node_modules` paths are needed. The root `tailwind.css` file is included directly
in the published package and does not depend on the JavaScript build.
