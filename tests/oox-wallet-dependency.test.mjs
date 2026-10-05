import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const rootRequire = createRequire(import.meta.url);
for (const provider of ['sdk-web-wallet-cross-window-provider', 'sdk-web-wallet-iframe-provider']) {
  const providerRequire = createRequire(rootRequire.resolve(`@multiversx/${provider}`));
  const qs = providerRequire('qs');
  test(`${provider} resolves patched query parser`, () => {
    assert.equal(providerRequire('qs/package.json').version, '6.16.0');
    const params = {address: 'erd1example', callbackUrl: 'https://thepittzstop.com/?tab=my-pittz', nonce: '123'};
    assert.deepEqual(qs.parse(qs.stringify(params)), params);
    const input = qs.parse('constructor[isBuffer]=bad&__proto__[polluted]=yes', {plainObjects:true, allowPrototypes:true});
    assert.doesNotThrow(() => qs.stringify(input));
    assert.equal({}.polluted, undefined);
  });
}
