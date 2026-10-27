import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const dir = await mkdtemp(join(tmpdir(), 'wma-render-'));
try {
  const output = join(dir, 'render.mjs');
  await build({entryPoints:['scripts/render.test.tsx'], bundle:true, platform:'node', format:'esm', outfile:output, loader:{'.css':'empty'}, banner:{js:"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"}});
  const result = spawnSync(process.execPath, [output], {stdio:'inherit'});
  process.exitCode = result.status ?? 1;
} finally { await rm(dir, {recursive:true,force:true}); }
