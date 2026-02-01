import('./src/browser/chromeCookies.ts')
  .then(m => m.loadChromeCookies({ targetUrl: 'https://www.perplexity.ai' }))
  .then(c => console.log('cookies', c.length))
  .catch(e => console.error('err', e?.message || e));
