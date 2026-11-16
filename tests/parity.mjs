import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const directory = new URL('../dist/', import.meta.url);
const files = new Set((await readdir(directory)).filter((name) => name.endsWith('.js')));
const html = `<!doctype html><html><head><style>
html,body{margin:0}#host{width:100vw;height:100vh}
#outside{position:fixed;right:10px;top:10px;z-index:10}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{position:absolute;left:240px;top:20px;width:36px;height:36px;border:6px solid #ddd;border-top-color:#222;border-radius:50%;animation:spin 800ms linear infinite}
</style></head><body><div id="host"></div><button id="outside">Outside</button><script type="module">
import {createGpuCanvas} from '/index.js';
const mode = new URL(location.href).searchParams.get('mode');
const canvas=await createGpuCanvas(document.getElementById('host'),{mode,input:false});
const a=document.createElement('div');a.style.background='white';
a.innerHTML='<button id="increment" style="position:absolute;left:20px;top:20px">Increment</button><input aria-label="Name" style="position:absolute;left:20px;top:80px"><div class="spinner"></div>';
const b=document.createElement('div');b.style.background='coral';
b.innerHTML='<button id="next" style="position:absolute;left:20px;top:20px">Next node</button>';
let clicks=0;a.querySelector('button').onclick=()=>clicks++;
const first={x:100,y:150,width:320,height:240};
canvas.addNode(a,first);canvas.addNode(b,{...first,x:500});
canvas.setLiveNodes([a,b]);
window.fixture={canvas,a,b,first,clicks:()=>clicks};
</script></body></html>`;
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
const frames = async (page, count) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
try {
  for (const mode of ['gpu', 'dom']) {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 700 },
      deviceScaleFactor: 2,
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://localhost:' + address.port + '/?mode=' + mode);
    await page.waitForFunction(
      () =>
        window.fixture?.canvas.getStats().visible === 2 &&
        window.fixture.canvas.getStats().pending === 0,
    );
    await page.locator('#increment').click();
    assert.equal(await page.evaluate(() => window.fixture.clicks()), 1);
    const input = page.getByLabel('Name', { exact: true });
    await input.click();
    await input.pressSequentially('Retained input');
    await page.locator('#outside').click();
    await input.focus();
    await expect(input).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#next')).toBeFocused();
    await input.focus();
    await page.evaluate(() => {
      const { canvas, a, b, first } = window.fixture;
      canvas.updateNode(b, first);
      canvas.setNodeOrder([b, a]);
    });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Retained input');
    await page.locator('#increment').click();
    assert.equal(await page.evaluate(() => window.fixture.clicks()), 2);
    await page.evaluate(() => window.fixture.canvas.setCamera({ x: 30, y: 20, zoom: 0.5 }));
    await frames(page, 3);
    const box = await page.locator('#increment').boundingBox();
    assert(box);
    assert(Math.abs(box.x - 45) < 1 && Math.abs(box.y - 75) < 1, JSON.stringify(box));
    await page.locator('#increment').click();
    assert.equal(await page.evaluate(() => window.fixture.clicks()), 3);
    // Neither hover nor native focus keeps the source alive here.
    await page.locator('#outside').click();
    await page.mouse.move(950, 650);
    await frames(page, 30);
    const clip = await page.locator('.spinner').boundingBox();
    assert(clip);
    const before = await page.screenshot({ clip });
    await frames(page, 13);
    const after = await page.screenshot({ clip });
    assert(!before.equals(after), 'Visible animation froze away from the pointer');
    await page.evaluate(() => {
      document.querySelector('.spinner').style.animation = 'none';
    });
    await frames(page, 40);
    const idleBefore = await page.evaluate(() => window.fixture.canvas.getStats().frames);
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => {
        const { canvas, a, b } = window.fixture;
        canvas.setLiveNodes([a, b]);
      });
      await frames(page, 1);
    }
    if (mode === 'gpu')
      assert.equal(
        await page.evaluate(() => window.fixture.canvas.getStats().frames),
        idleBefore,
        'Unchanged live sets kept drawing',
      );
    await page.evaluate(() => window.fixture.canvas.setLiveNodes([]));
    if (mode === 'gpu')
      await page.waitForFunction(() => window.fixture.canvas.getStats().drawablePages === 0);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        mode,
        nativeClicks: true,
        focusRestore: true,
        crossPageTab: true,
        orderedHitTesting: true,
        cameraGeometry: true,
        animation: true,
        idle: true,
        release: true,
      }),
    );
    await page.evaluate(() => window.fixture.canvas.destroy());
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
