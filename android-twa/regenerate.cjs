// Regenerates android-twa/ with @bubblewrap/core 1.27 (run from a folder with `npm i @bubblewrap/core@1.27.0`, local server on :8766 serving the web root).
// Signing secrets are NOT used here; the keystore path is only a pointer outside the repo.
const {TwaManifest, TwaGenerator, ConsoleLog} = require('@bubblewrap/core');
const fs = require('fs'), path = require('path'); const Color = require('color'); const c = (h) => new Color(h);
const HOST = 'snake-html-eight.vercel.app';
const OUT = process.env.TWA_OUT || __dirname;
(async () => {
  const wm = JSON.parse(fs.readFileSync('/workspace/snake-html/manifest.webmanifest', 'utf8'));
  const m = TwaManifest.fromWebManifestJson(new URL(`https://${HOST}/manifest.webmanifest`), wm);
  Object.assign(m, {
    packageId: 'li.jueni.snakegame', name: 'Snake', launcherName: 'Snake',
    appVersionCode: 13, appVersionName: '2.0', display: 'fullscreen', orientation: 'any',
    themeColor: c('#C7D9A4'), themeColorDark: c('#11170D'), navigationColor: c('#C7D9A4'), navigationColorDark: c('#11170D'),
    navigationDividerColor: c('#C7D9A4'), navigationDividerColorDark: c('#11170D'), backgroundColor: c('#C7D9A4'),
    enableNotifications: false, fallbackType: 'customtabs', startUrl: '/?source=twa',
    signingKey: {path: '/workspace/secrets/snake-upload.jks', alias: 'snakegamekey'},
    enableSiteSettingsShortcut: false, minSdkVersion: 24,
  });
  const prodIcon = m.iconUrl, prodMask = m.maskableIconUrl;
  const prodWm = m.webManifestUrl; m.webManifestUrl = new URL('http://127.0.0.1:8766/manifest.webmanifest');
  m.iconUrl = 'http://127.0.0.1:8766/icons/icon-512.png';
  m.maskableIconUrl = 'http://127.0.0.1:8766/icons/maskable-512.png';
  fs.rmSync(OUT, {recursive: true, force: true}); fs.mkdirSync(OUT, {recursive: true});
  await new TwaGenerator().createTwaProject(OUT, m, new ConsoleLog('gen'));
  m.iconUrl = prodIcon; m.maskableIconUrl = prodMask; m.webManifestUrl = prodWm;
  await m.saveToFile(path.join(OUT, 'twa-manifest.json'));
  console.log('ok', prodIcon, prodMask);
})().catch((e) => { console.error(e); process.exit(1); });
