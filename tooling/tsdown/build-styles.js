import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import postcss from 'postcss';

/**
 * @param {import('tsdown').BuildContext} ctx
 * @param {string} [dependency] Component dependency with a public Tailwind entry.
 * @param {string} [buildSource] Additional package-relative source used only for compilation.
 */
export async function buildStyles({ options }, dependency, buildSource) {
  const cwd = options.cwd ?? process.cwd();
  const outDir = path.resolve(cwd, options.outDir ?? 'dist');
  const sourceEntry = path.join(outDir, 'tailwind.css');
  const source = `${dependency ? `@import '${dependency}/tailwind.css';\n\n` : ''}@source "./**/*.{js,cjs}";\n`;
  await writeFile(sourceEntry, source);

  const from = fileURLToPath(new URL('./component-styles.css', import.meta.url));
  const to = path.join(outDir, 'styles.css');
  const css = await readFile(from, 'utf8');
  const extraSource = buildSource
    ? `@source ${JSON.stringify(path.resolve(cwd, buildSource))};\n`
    : '';
  const result = await postcss([tailwindcss({ optimize: true })]).process(
    `@import ${JSON.stringify(sourceEntry)};\n${extraSource}${css}`,
    { from, to },
  );
  await writeFile(to, result.css);
}
