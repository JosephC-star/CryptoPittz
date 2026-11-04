import test from 'node:test';
import assert from 'node:assert/strict';
import canonicalDomain from '../netlify/edge-functions/canonical-domain.js';

test('aliases redirect with an empty body even for Facebook partial requests', async () => {
  for (const host of ['cryptopittz.com', 'www.cryptopittz.com']) {
    for (const protocol of ['http:', 'https:']) {
      for (const range of [undefined, 'bytes=0-4095', 'bytes=0-524287']) {
        const response = canonicalDomain(new Request(`${protocol}//${host}/dawg-pound?currency=BONEZ&page=2`, {
          headers: { 'User-Agent': 'facebookexternalhit/1.1', ...(range ? { Range: range } : {}) },
        }));
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('location'), 'https://thepittzstop.com/dawg-pound?currency=BONEZ&page=2');
        assert.equal(response.headers.get('content-range'), null);
        assert.equal(await response.text(), '');
      }
    }
  }
});

test('primary and preview domains continue through normal routing', () => {
  for (const host of ['thepittzstop.com', 'cryptopittz.netlify.app', 'deploy-preview-62--cryptopittz.netlify.app']) {
    assert.equal(canonicalDomain(new Request(`https://${host}/`)), undefined);
  }
});

test('encoded paths and repeated query parameters remain intact', () => {
  const response = canonicalDomain(new Request('https://cryptopittz.com/products/a%2Fb?tag=one&tag=two&next=https%3A%2F%2Fexample.com'));
  assert.equal(response.headers.get('location'), 'https://thepittzstop.com/products/a%2Fb?tag=one&tag=two&next=https%3A%2F%2Fexample.com');
});
