#!/usr/bin/env node
// #1411: product photos go to S3, which a local API has no access to. This answers the few S3 calls a create makes, so a
// walk with a photo can save on a local API. Start the API with AWS_ENDPOINT_URL=http://127.0.0.1:<port> and fake keys.
// Local only: it binds 127.0.0.1 and keeps nothing on disk.
import { createServer } from 'node:http';

const port = Number(process.argv[2] || 3288);
const objects = new Map();

createServer((req, res) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const key = decodeURIComponent(req.url.split('?')[0]);
    const copyFrom = req.headers['x-amz-copy-source'];
    if (req.method === 'PUT' && copyFrom) {
      objects.set(key, objects.get(`/${decodeURIComponent(copyFrom).replace(/^\//, '')}`) ?? Buffer.alloc(0));
      res.writeHead(200, { 'content-type': 'application/xml' });
      res.end('<CopyObjectResult><ETag>"local"</ETag></CopyObjectResult>');
    } else if (req.method === 'PUT') {
      objects.set(key, Buffer.concat(chunks));
      res.writeHead(200, { ETag: '"local"' });
      res.end();
    } else if (req.method === 'DELETE') {
      objects.delete(key);
      res.writeHead(204);
      res.end();
    } else if (objects.has(key)) {
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      res.end(objects.get(key));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}).listen(port, '127.0.0.1', () => console.log(`fake S3 on http://127.0.0.1:${port}`));
