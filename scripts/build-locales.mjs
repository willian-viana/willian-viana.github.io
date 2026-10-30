import { mkdir, readFile, writeFile } from 'node:fs/promises';
const html = await readFile('dist/index.html', 'utf8');
for (const [path, lang] of [['pt', 'pt-BR'], ['en', 'en']]) {
  await mkdir(`dist/${path}`, { recursive: true });
  await writeFile(`dist/${path}/index.html`, html.replace('lang="pt-BR"', `lang="${lang}"`));
}
