import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');
const port = Number(process.env.PORT || 8080);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type':
      contentTypes[extension] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const requestPath = decodeURIComponent(url.pathname);
  const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(distDir, normalizedPath);

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isFile()) {
      sendFile(response, filePath);
      return;
    }
  } catch {}

  const fallbackPath = existsSync(indexFile) ? indexFile : null;
  if (!fallbackPath) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Missing frontend build output. Run "npm run build" first.');
    return;
  }

  sendFile(response, fallbackPath);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend server listening on port ${port}`);
});
