import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const directory = new URL('../dist/', import.meta.url);
const files = new Set((await readdir(directory)).filter((name) => name.endsWith('.js')));
const html = `<!doctype html><style>
html,body{margin:0}#host,#reference{position:absolute;top:0;width:50vw;height:700px;overflow:hidden}#reference{left:50vw}
.spinner{position:absolute;left:10px;top:10px;width:10px;height:10px;background:red;animation:spin 800ms linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.pattern{width:1000px;height:1000px;background:repeating-linear-gradient(90deg,#000 0px,#000 .5px,#fff .5px,#fff 1px);transform-origin:0 0}
</style><div id="host"></div><div id="reference"><div class="pattern"></div></div><script type="module">
import {createGpuCanvas} from '/index.js';
const canvas=await createGpuCanvas(document.getElementById('host'),{mode:'gpu',input:false,rasterQuality:'sharp'});
const node=document.createElement('div');node.className='pattern';
if(new URL(location.href).searchParams.has('animated'))node.innerHTML='<span class="spinner"></span>';
canvas.addNode(node,{x:0,y:0,width:1000,height:1000});canvas.setLiveNodes([node]);
window.fixture={canvas,reference:document.querySelector('#reference .pattern')};
</script>`;
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1);
  if (!name) {
    response.setHeader('Content-Type', 'text/html');
    response.end(html);
    return;
  }
  if (!files.has(name)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader('Content-Type', 'text/javascript');
  response.end(await readFile(new URL(name, directory)));
});
await new Promise((resolve) => server.listen(0, 'localhost', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: process.argv.includes('--wide') ? 4800 : 1200, height: 700 },
  deviceScaleFactor: 2,
});
const frames = (count) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(
    'http://localhost:' + address.port + (process.argv.includes('--animated') ? '/?animated' : ''),
  );
  await page.waitForFunction(
    () =>
      window.fixture?.canvas.getStats().visible === 1 &&
      window.fixture.canvas.getStats().pending === 0,
  );
  await frames(20);
  const before = await page.evaluate(() => window.fixture.canvas.getStats());
  const samples = [];
  for (const zoom of [1.05, 1.125, 1.5, 2, 3, 2, 1.5, 1]) {
    await page.evaluate((zoom) => {
      window.fixture.canvas.setCamera({ x: 0, y: 0, zoom });
      window.fixture.reference.style.transform = 'scale(' + zoom + ')';
    }, zoom);
    await frames(2);
    const screenshot = await page.screenshot({
      clip: { x: 0, y: 240, width: 1200, height: 8 },
      scale: 'device',
    });
    const contrast = await page.evaluate(async (png) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + png;
      await image.decode();
      const reader = document.createElement('canvas');
      reader.width = image.width;
      reader.height = image.height;
      const context = reader.getContext('2d');
      if (!context) throw new Error('Missing pixel reader');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, 1).data;
      const contrast = (start) => {
        const values = Array.from({ length: 400 }, (_, i) => pixels[(start + 40 + i) * 4]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(
          values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length,
        );
      };
      return { gpu: contrast(0), native: contrast(image.width / 2) };
    }, screenshot.toString('base64'));
    await page.waitForFunction(() => window.fixture.canvas.getStats().pending === 0);
    samples.push({
      zoom,
      contrast,
    });
  }
  const after = await page.evaluate(() => window.fixture.canvas.getStats());
  console.log(
    JSON.stringify(
      {
        samples,
        lostDetail: after.lostDetail - before.lostDetail,
        lostPixels: after.lostPixels - before.lostPixels,
      },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, []);
  for (const sample of samples)
    if (sample.zoom > 1)
      assert(
        sample.contrast.gpu >= sample.contrast.native * 0.9,
        'Zoom visibly softened the resolution target',
      );
  assert.equal(after.lostDetail - before.lostDetail, 0, 'Zoom discarded previously sharp pixels');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
