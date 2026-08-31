import { createServer } from 'http';
import { readFile } from 'fs/promises';
import getTokenHandler from './api/get-token.js';

const envText = await readFile('./.env.local', 'utf-8');
for (const line of envText.split('\n').filter(Boolean)) {
  const [k, ...rest] = line.split('=');
  process.env[k.trim()] = rest.join('=').trim();
}

const server = createServer(async (req, res) => {
  if (req.url === '/api/get-token') {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
    await getTokenHandler(req, res);
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    const html = await readFile('./index.html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

server.listen(3000, () => console.log('로컬 테스트 서버: http://localhost:3000'));
