# @wordrhyme/shadcn-ui

## Usage Add usage instructions here.

## Tailwind CSS v4

Import the public source entry in the application's Tailwind CSS stylesheet:

```css
@import 'tailwindcss';
@import '@wordrhyme/shadcn-ui/tailwind.css';
```

The entry registers this package's published `dist/**/*.js` and `dist/**/*.cjs`
files for class detection and imports its component dependencies' source entries
transitively. It contains only `@source` and `@import` directives; the application
provides the Tailwind reset, theme, and utility output. No application-specific
`node_modules` paths are needed. The root `tailwind.css` file is included directly
in the published package and does not depend on the JavaScript build.

## Applications without Tailwind CSS

Import the precompiled stylesheet once from your application's entry point:

```tsx
import '@wordrhyme/shadcn-ui/styles.css';
```

This is regular browser CSS; no Tailwind compiler or plugins are required in the
application. It includes the components in this package and its transitive
component dependencies, default theme variables, class-based dark mode, and
animation utilities. The stylesheet is generated during the package build and
shipped in `dist/styles.css`.

Choose `styles.css` or the `tailwind.css` scanning entry according to your build;
avoid importing both. Import only the highest-level package's stylesheet to avoid
duplicating dependency styles.

The precompiled entry deliberately omits global Tailwind Preflight and page
background rules. Typography and native element normalization remain the
application's responsibility. It uses standard Tailwind utility class names, so
those class names also take effect elsewhere on the page.

Override the default theme with application CSS loaded after the stylesheet
(e.g. `:root { --primary: ...; --primary-foreground: ...; }`); add a `dark` class
to `html` for dark mode. Custom `className` values are not compiled at runtime:
provide your own CSS for additional classes or use inline styles.
