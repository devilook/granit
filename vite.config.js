import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const SECTIONS = path.resolve(__dirname, 'src/sections');

/**
 * HTML partials: `<include src="hero.html" />` in index.html is replaced by
 * src/sections/hero.html. Includes may nest. Editing any partial reloads the
 * page in dev.
 */
function htmlPartials(dir) {
  const expand = (html, depth = 0) => {
    if (depth > 8) throw new Error('html-partials: includes nested too deep (cycle?)');
    return html.replace(/<include\s+src="([^"]+)"\s*\/>/g, (_, file) => {
      const full = path.resolve(dir, file);
      if (!fs.existsSync(full)) throw new Error(`html-partials: ${file} not found in src/sections/`);
      return expand(fs.readFileSync(full, 'utf8'), depth + 1);
    });
  };
  return {
    name: 'html-partials',
    transformIndexHtml: { order: 'pre', handler: (html) => expand(html) },
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on('change', (file) => {
        if (file.startsWith(dir) && file.endsWith('.html')) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

// `npm run build` → normal production build in dist/.
// `npm run build:single` → one self-contained HTML (for quick previews / sharing).
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700, // three.js is lazy-loaded after first paint
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
  },
  plugins: [htmlPartials(SECTIONS), ...(mode === 'single' ? [viteSingleFile()] : [])],
}));
