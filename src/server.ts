import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { parseRequest, runExtract } from './server/extract';

// Load .env (LLM credentials) when present. Native Node loader, no dependency.
// Safe to ignore in environments without a .env file (e.g. production prerender).
try {
  (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
} catch {
  /* no .env file — fall back to heuristic extractor */
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * POST /api/extract — Copilot SDK powered utterance → structured schedule.
 * Falls back to the offline heuristic parser when no API key is configured
 * or the LLM call fails, so the demo always responds.
 */
app.post('/api/extract', express.json({ limit: '16kb' }), async (req, res) => {
  try {
    const input = parseRequest(req.body);
    const { result, source } = await runExtract(input);
    res.setHeader('X-Extract-Source', source);
    res.json(result);
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'invalid utterance') {
      res.status(400).json({ error: 'invalid utterance' });
      return;
    }
    console.error('[api/extract] error:', message);
    res.status(500).json({ error: 'extraction failed' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
