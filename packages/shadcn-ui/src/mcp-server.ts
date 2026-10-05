#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { startComponentMcpServer } from '@internal/mcp/server';
import { mcpRegistry } from './generated/mcp-registry';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

startComponentMcpServer({
  packageName: '@wordrhyme/shadcn-ui',
  packageVersion: packageJson.version,
  registry: mcpRegistry,
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to start @wordrhyme/shadcn-ui MCP server: ${message}\n`);
  process.exit(1);
});
