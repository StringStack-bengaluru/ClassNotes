import fs from 'node:fs';
import type { Plugin, ViteDevServer } from 'vite';
import { buildManifest, paths, writeManifest } from './buildManifest.mjs';

function serveManifest(server: ViteDevServer): void {
  server.middlewares.use('/api/book-manifest.json', (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    try {
      const manifest = buildManifest();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(manifest));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Manifest error' }));
    }
  });
}

function notifyChaptersUpdated(server: ViteDevServer): void {
  server.ws.send({ type: 'custom', event: 'chapters-updated' });
}

export function bookChaptersPlugin(): Plugin {
  return {
    name: 'book-chapters',
    configureServer(server) {
      if (!fs.existsSync(paths.CHAPTERS_DIR)) {
        fs.mkdirSync(paths.CHAPTERS_DIR, { recursive: true });
      }

      serveManifest(server);

      server.watcher.add(paths.CHAPTERS_DIR);
      server.watcher.on('add', (file) => {
        const lower = file.toLowerCase();
        if (!lower.endsWith('.pdf') && !lower.endsWith('.docx') && !lower.endsWith('.content.json')) {
          return;
        }
        writeManifest();
        notifyChaptersUpdated(server);
        server.config.logger.info(`Chapter source added: ${file}`, { timestamp: true });
      });
      server.watcher.on('change', (file) => {
        const lower = file.toLowerCase();
        if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) return;
        writeManifest();
        notifyChaptersUpdated(server);
      });
      server.watcher.on('unlink', (file) => {
        const lower = file.toLowerCase();
        if (!lower.endsWith('.pdf') && !lower.endsWith('.docx') && !lower.endsWith('.content.json')) {
          return;
        }
        writeManifest();
        notifyChaptersUpdated(server);
        server.config.logger.info(`Chapter source removed: ${file}`, { timestamp: true });
      });
    },
    buildStart() {
      writeManifest();
    },
  };
}
