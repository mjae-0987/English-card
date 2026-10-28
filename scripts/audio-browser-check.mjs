// Native HTMLAudioElement test. Requires a running Vite server and Playwright.
// Browser output/PCM evidence is not a real Kakao/iOS/phone listening test.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.WMA_PLAYWRIGHT_PATH || 'playwright-core');
const base = process.env.WMA_BASE || 'http://127.0.0.1:4173';
const output = process.env.WMA_AUDIO_REPORT || '/tmp/wma-audio-browser.json';
const catalog = JSON.parse(readFileSync('src/audio/catalog.generated.json','utf8'));
const assets = catalog.items;
assert.equal(assets.length, 240);
const report = { checks: [], layouts: [], nativeAudio: true, physicalDevicesTested: false, humanListeningVerified: false, errors: [] };
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
  ignoreDefaultArgs: ['--mute-audio'], args: ['--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 KAKAOTALK/11.0.0' });
await context.addInitScript(() => {
  window.__audio = []; window.__audioEvents = []; window.__audioLogs = [];
  const NativeAudio = window.Audio;
  window.Audio = function(...args) {
    const a = new NativeAudio(...args); window.__audio.push(a);
    for (const event of ['playing','ended','pause','error']) a.addEventListener(event, () => window.__audioEvents.push({ event, src: a.currentSrc || a.src, time: a.currentTime, duration: a.duration }));
    try {
      const ctx = new AudioContext(); const analyser = ctx.createAnalyser();
      ctx.createMediaElementSource(a).connect(analyser); analyser.connect(ctx.destination);
      ctx.resume(); a.__analyser = analyser; a.__ctx = ctx;
    } catch (e) { window.__audioLogs.push(String(e)); }
    return a;
  };
  window.Audio.prototype = NativeAudio.prototype;
  const warn = console.warn;
  console.warn = (...args) => { window.__audioLogs.push(args.map(String).join(' ')); warn(...args); };
});
const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message));
const mark = msg => { report.checks.push(msg); console.log('PASS', msg); };
const waitPlaying = () => page.waitForFunction(() => { const a = window.__audio.at(-1); return a && !a.paused && a.currentTime > .03; });
const latest = () => page.evaluate(() => { const a = window.__audio.at(-1); return {src: a?.src, time: a?.currentTime, rate:a?.playbackRate, paused:a?.paused, count:window.__audio.length}; });
try {
  await page.goto(base+'/#/learn/day/1'); await page.locator('.english-story').waitFor();
  const story = assets.find(a => a.id === 'day01-set01');
  await page.locator('.audio-button').click(); await waitPlaying();
  assert.equal((await latest()).src, base+story.src);
  await page.waitForFunction(() => { const a = window.__audio.at(-1), data = new Float32Array(a.__analyser.fftSize); a.__analyser.getFloatTimeDomainData(data); const rms = Math.sqrt(data.reduce((n,v) => n+v*v,0)/data.length); window.__rms = Math.max(window.__rms || 0,rms); return rms > .005; });
  report.peakObservedRms = await page.evaluate(() => window.__rms);
  mark('Native MP3 story playback advances and produces non-silent PCM (Kakao UA emulation only)');
  const count = (await latest()).count;
  await page.locator('.translation-toggle').click();
  await page.setViewportSize({width:900,height:900});
  assert.equal((await latest()).count, count); assert.equal((await latest()).paused,false);
  mark('Translation render and fold resize keep the same playing audio');
  for (const [label, rate] of [['느리게',.75],['빠르게',1.15],['보통',1]]) {
    await page.getByRole('button',{name:new RegExp(label+'.*'+rate)}).first().click();
    assert.equal((await latest()).rate,rate);
  }
  mark('All three speeds update the current MP3 without restarting');
  await page.locator('.audio-button').click(); assert.equal((await latest()).paused,true);
  await page.locator('.audio-button').click(); await waitPlaying();
  await page.waitForFunction(() => window.__audioEvents.some(e => e.event === 'ended' && e.src.includes('day01-set01')),null,{timeout:45000});
  assert.equal(await page.locator('.audio-button').getAttribute('aria-pressed'),'false');
  const ended = await page.evaluate(() => window.__audioEvents.find(e => e.event === 'ended'));
  assert.ok(ended.time >= story.duration-.15); report.fullStoryEnded = ended;
  mark('Whole multi-sentence story reaches native ended event; button resets');
  await page.locator('.audio-button').click(); await waitPlaying();
  const old = (await latest()).count-1;
  await page.locator('.lesson-word-panel button[aria-label*="발음 듣기"]').first().click();
  await waitPlaying(); assert.ok((await latest()).src.includes('/audio/words/'));
  assert.equal(await page.evaluate(i => window.__audio[i].paused, old),true);
  mark('Word MP3 replaces full story, with no overlapping active audio');
  for(let i=0;i<6;i++) await page.locator('.audio-button').click();
  assert.ok(await page.evaluate(() => window.__audio.filter(a=>!a.paused).length<=1));
  await page.evaluate(()=>location.hash='#/settings');
  await page.locator('.settings-page').waitFor();
  assert.equal(await page.evaluate(()=>window.__audio.filter(a=>!a.paused).length),0);
  mark('Rapid taps and navigation stop old audio');
  await page.getByRole('button',{name:/느리게/}).click(); await page.reload();
  assert.equal(await page.getByRole('button',{name:/느리게/}).getAttribute('aria-pressed'),'true');
  mark('Speed survives reload with the existing storage key');
  await page.goto(base+'/#/learn/day/1');
  await page.route('**/audio/**/*.mp3',route=>route.fulfill({status:404,body:'missing'}));
  await page.locator('.audio-button').click();
  await page.getByText('소리를 재생할 수 없어요. 다시 시도해 주세요.',{exact:true}).waitFor({timeout:25000});
  assert.equal(await page.locator('.audio-button').getAttribute('aria-busy'),'false');
  report.failureLogs = await page.evaluate(()=>window.__audioLogs);
  assert.ok(report.failureLogs.some(s=>s.includes('[audio:mp3]')));
  assert.ok(report.failureLogs.some(s=>s.includes('[audio:tts]')));
  await page.unroute('**/audio/**/*.mp3'); await page.locator('.audio-button').click(); await waitPlaying();
  mark('404 + unavailable TTS reset loading, log distinct stages, and allow retry');
  await page.evaluate(()=>location.hash='#/map');
  for(const width of [320,360,390,430,600,768,900,1024]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['#/map','#/learn/day/1','#/settings']) {
      await page.evaluate(hash=>location.hash=hash,route); await page.waitForTimeout(50);
      const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
      assert.ok(layout.scroll<=width,`${route} overflow at ${width}`); report.layouts.push({width,route,...layout});
    }
  }
  mark('Audio controls and retained layouts have no horizontal overflow at 320–1024px');
  const api=context.request;
  for(const item of assets) {
    const response=await api.get(base+item.src); assert.equal(response.status(),200);
    assert.match(response.headers()['content-type'],/audio\/mpeg/); assert.equal((await response.body()).length,item.bytes);
  }
  const range=await api.get(base+story.src,{headers:{Range:'bytes=0-1023'}});
  assert.equal(range.status(),206); assert.equal((await range.body()).length,1024);
  mark('All 240 HTTP paths return 200/audio-mpeg/correct bytes; Range request returns 206');
  assert.deepEqual(report.errors,[]);
} finally {
  writeFileSync(output,JSON.stringify(report,null,2)+'\n'); await browser.close();
}
