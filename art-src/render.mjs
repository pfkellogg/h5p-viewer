// render.mjs: the WordPress.org icon and banner from art.html, in headless Chrome (node render.mjs).
import puppeteer from "/Users/luisramirez/claude-apps/aikellogg_videos/mellotron-lab-video/tools/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";
const here = new URL(".", import.meta.url).pathname, out = new URL("..", import.meta.url).pathname;
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage();
const shot = async (a, w, h, scale, file) => {
  await p.setViewport({ width: w, height: h, deviceScaleFactor: scale });
  await p.goto(`file://${here}art.html?a=${a}`);
  await p.screenshot({ path: out + file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
};
await shot("icon", 256, 256, 1, "icon-256x256.png");
await shot("icon", 256, 256, 0.5, "icon-128x128.png");
await shot("banner", 1544, 500, 1, "banner-1544x500.png");
await shot("banner", 1544, 500, 0.5, "banner-772x250.png");
await b.close(); console.log("done");
