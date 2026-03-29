import fs from 'fs';
import { JSDOM } from 'jsdom';

(async () => {
  const html = fs.readFileSync('./docs/index.html', 'utf8');
  const errors = [];
  const logs = [];

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
  });

  // capture console messages from the page
  dom.window.console.error = (...args) => {
    errors.push(args.map(String).join(' '));
    // also print to host console
    console.error('[page error]', ...args);
  };
  dom.window.console.warn = (...args) => {
    logs.push('[warn] ' + args.map(String).join(' '));
    console.warn('[page warn]', ...args);
  };
  dom.window.console.log = (...args) => {
    logs.push('[log] ' + args.map(String).join(' '));
    console.log('[page log]', ...args);
  };

  // ensure navigator.onLine true
  try { dom.window.navigator.onLine = true; } catch (e) {}

  // wait for a short while to allow scripts to run
  await new Promise((res) => setTimeout(res, 3000));

  console.log('\n=== Smoke Test Result ===');
  if (errors.length === 0) {
    console.log('No page errors detected. Scripts executed without throwing during initial load.');
  } else {
    console.error('Page errors detected:', errors.length);
    errors.forEach((e, i) => console.error(i+1 + ')', e));
  }

  console.log('\nConsole logs (sample):');
  logs.slice(0, 50).forEach((l) => console.log(l));

  process.exit(errors.length === 0 ? 0 : 2);
})();
