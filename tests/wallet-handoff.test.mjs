import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { xPortalLink, watchWalletHandoff } from '../src/features/oox/walletHandoff.js';
const metadata = {name:'xPortal',redirect:{native:'xportal://'}};
function setup(overrides={}) {
  const connector=new EventEmitter(), ready=[], opened=[];
  const browser={navigator:{userAgent:'Android'},document:{visibilityState:'visible'},location:{assign:link=>opened.push(link)},open:link=>opened.push(link),...overrides};
  const provider={getType:()=> 'walletConnect',getProvider:()=>({provider:{walletConnector:connector,session:{topic:'my-session',peer:{metadata}}}})};
  const stop=watchWalletHandoff(provider,link=>ready.push(link),browser);
  return {connector,ready,opened,stop,provider,browser};
}
test('opens only once after this session sends its signing request',()=>{
  const s=setup();
  const event={topic:'my-session',request:{method:'mvx_signTransactions'}};
  s.connector.emit('session_request_sent',{...event,topic:'other-session'});
  s.connector.emit('session_request_sent',{...event,request:{method:'mvx_signMessage'}});
  assert.equal(s.opened.length,0);
  s.connector.emit('session_request_sent',event);s.connector.emit('session_request_sent',event);
  assert.deepEqual(s.opened,['xportal://']);assert.deepEqual(s.ready,['xportal://']);
  s.stop();assert.equal(s.connector.listenerCount('session_request_sent'),0);
});
test('does not launch on desktop or for other providers',()=>{
  const s=setup({navigator:{userAgent:'Desktop'}});
  assert.equal(s.connector.listenerCount('session_request_sent'),0);
  s.provider.getType=()=> 'extension';
  watchWalletHandoff(s.provider,()=>assert.fail(),{...s.browser,navigator:{userAgent:'Android'}});
  assert.equal(s.connector.listenerCount('session_request_sent'),0);
});
test('blocked navigation still offers the existing signing request',()=>{
  const s=setup({location:{assign:()=>{throw Error('blocked')}}});
  assert.doesNotThrow(()=>s.connector.emit('session_request_sent',{topic:'my-session',request:{method:'mvx_signTransactions'}}));
  assert.deepEqual(s.ready,['xportal://']);
});
test('wallet links reject arbitrary sites and other wallet identities',()=>{
  assert.equal(xPortalLink({name:'Other',redirect:{native:'xportal://'}}),null);
  for(const native of ['javascript:alert(1)','https://evil.test','intent://evil','https://xportal.app.link.evil.test'])
    assert.equal(xPortalLink({name:'xPortal',redirect:{native}}),'https://xportal.app.link/');
  assert.equal(xPortalLink({name:'xPortal',redirect:{universal:'https://xportal.app.link/'}}),'https://xportal.app.link/');
});
test('missing SDK internals leave wallet signing available',()=>{
  assert.doesNotThrow(()=>watchWalletHandoff({getType:()=> 'walletConnect'},()=>assert.fail(),{navigator:{userAgent:'Android'}})());
});
test('already hidden pages offer a fallback without launching again',()=>{
  const s=setup({document:{visibilityState:'hidden'}});
  s.connector.emit('session_request_sent',{topic:'my-session',request:{method:'mvx_signTransactions'}});
  assert.equal(s.opened.length,0);assert.equal(s.ready.length,1);s.stop();
});
