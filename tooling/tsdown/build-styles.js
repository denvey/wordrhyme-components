import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import postcss from 'postcss';

/**
 * @param {import('tsdown').BuildContext} ctx
 * @param {string} [entry]
 */
export async function buildStyles({ options }, entry = 'tailwind.css') {
  const cwd = options.cwd ?? process.cwd();
  const from = fileURLToPath(new URL('./component-styles.css', import.meta.url));
  const sourceEntry = path.resolve(cwd, entry);
  const to = path.resolve(cwd, options.outDir ?? 'dist', 'styles.css');
  const css = await readFile(from, 'utf8');
  const result = await postcss([tailwindcss({ optimize: true })]).process(
    `@import ${JSON.stringify(sourceEntry)};\n${css}`,
    { from, to },
  );
  await writeFile(to, result.css);
}
