# @wordrhyme/shadcn-ui

Custom UI components and utilities built with shadcn/ui.

## MCP Server

This package includes a local stdio MCP server for coding assistants that support
the Model Context Protocol.

Add the package to your MCP client configuration:

```json
{
  "mcpServers": {
    "shadcn-ui": {
      "command": "npx",
      "args": ["-y", "@wordrhyme/shadcn-ui"]
    }
  }
}
```

This works with Claude Code, Claude Desktop, GitHub Copilot, Cursor, Codex, and
any MCP-compatible client.

The MCP client launches and stops the server automatically. You do not need to
start the server manually.

The server exposes generated component metadata through:

- `list_components`
- `search_components`
- `get_component_details`

Component metadata is discovered from `src/**/mcp.ts` during the package build,
so adding a component to the MCP registry only requires adding that component's
metadata file.

## Styles

Choose one mode and import only the highest-level package you use.

With Tailwind CSS v4, in your application stylesheet:

```css
@import 'tailwindcss';
@import '@wordrhyme/shadcn-ui/tailwind.css';
```

Without Tailwind CSS, in your application entry:

```ts
import '@wordrhyme/shadcn-ui/styles.css';
```

See the [shared style guide](https://github.com/denvey/wordrhyme-components#styles)
for theme setup, dark mode, and custom classes.
