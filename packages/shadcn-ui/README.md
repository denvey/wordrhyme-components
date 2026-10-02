# @wordrhyme/shadcn-ui

## Usage Add usage instructions here.

## Tailwind CSS v4

Import the public source entry in the application's Tailwind CSS stylesheet:

```css
@import "tailwindcss";
@import "@wordrhyme/shadcn-ui/tailwind.css";
```

The entry registers this package's published `dist/**/*.js` and `dist/**/*.cjs`
files for class detection and imports its component dependencies' source entries
transitively. It contains only `@source` and `@import` directives; the application
provides the Tailwind reset, theme, and utility output. No application-specific
`node_modules` paths are needed. The root `tailwind.css` file is included directly
in the published package and does not depend on the JavaScript build.
