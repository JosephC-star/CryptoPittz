const $ = (id) => document.getElementById(id);
let reversed = false;
let quote = null;
let request = null;
const tokens = { egld: 'WEGLD-bd4d79', bonez: 'BONEZ-ff9a73' };
function atomic(value, decimals) {
  if (!/^\d+(\.\d*)?$/.test(value)) throw new Error('Enter a positive amount using a decimal point.');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error(`Use no more than ${decimals} decimal places.`);
  const result = BigInt(whole + fraction.padEnd(decimals, '0'));
  if (result <= 0n) throw new Error('Enter an amount greater than zero.');
  return result.toString();
}
function human(raw, decimals) {
  const text = String(raw).padStart(decimals + 1, '0');
  return text.slice(0, -decimals) + '.' + text.slice(-decimals).replace(/0+$/, '') || '0';
}
function clear() {
  request?.abort(); quote = null; $('output').textContent = '—'; $('details').hidden = true;
  $('status').textContent = 'Get a fresh quote for this amount.';
}
function minimum() {
  if (!quote) return;
  const scale = 10000n;
  const basisPoints = BigInt(Math.round(Number($('slippage').value) * 100));
  $('minimum').textContent = human(BigInt(quote.net_amount_out) * (scale - basisPoints) / scale, reversed ? 18 : 6) + (reversed ? ' EGLD' : ' BONEZ');
}
$('amount').addEventListener('input', clear);
$('slippage').addEventListener('change', minimum);
$('reverse').addEventListener('click', () => {
  reversed = !reversed; clear();
  $('pay-token').textContent = reversed ? 'BONEZ' : '◆ EGLD';
  $('receive-token').textContent = reversed ? '◆ EGLD' : 'BONEZ';
  $('amount').value = reversed ? '100' : '0.01';
});
$('quote-form').addEventListener('submit', async (event) => {
  event.preventDefault(); clear();
  const currentDirection = reversed;
  const controller = new AbortController(); request = controller;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 25000);
  try {
    const amount = atomic($('amount').value.trim(), reversed ? 6 : 18);
    $('get-quote').disabled = true; $('status').textContent = 'Finding a live route through JEX…';
    const query = new URLSearchParams({ token_in: reversed ? tokens.bonez : tokens.egld, token_out: reversed ? tokens.egld : tokens.bonez, amount_in: amount, with_dyn_routing: 'false' });
    const response = await fetch('https://agg-api.jexchange.io/evaluate?' + query, {signal: controller.signal});
    if (!response.ok) throw new Error('JEX could not return a quote. Please try again.');
    const data = await response.json();
    if (controller.signal.aborted || reversed !== currentDirection) return;
    const result = data.static;
    if (!result || !/^\d+$/.test(result.net_amount_out) || !result.route?.hops?.length) throw new Error('No available route for this amount.');
    quote = result;
    $('output').textContent = human(result.net_amount_out, reversed ? 18 : 6);
    $('fee').textContent = human(result.estimated_tx_fee_egld, 18) + ' EGLD';
    $('agg-fee').textContent = human(result.fee_amount, result.fee_token === tokens.bonez ? 6 : 18) + ' ' + result.fee_token.split('-')[0];
    $('route').textContent = [result.route.token_in, ...result.route.hops.map(h => h.token_out)].map(t => t.split('-')[0]).join(' → ');
    minimum(); $('details').hidden = false;
    $('quote-time').textContent = 'Quoted at ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    $('status').textContent = 'Live estimate only. Wallet signing is not enabled in this preview.';
    setTimeout(() => { if (quote === result) { quote = null; $('details').hidden = true; $('output').textContent = '—'; $('status').textContent = 'Quote expired. Request a fresh quote.'; } }, 30000);
  } catch (error) {
    if (error.name !== 'AbortError') $('status').textContent = error instanceof TypeError ? 'Quote service unavailable from this browser. Please try again shortly.' : error.message;
    else if (timedOut) $('status').textContent = 'The quote request timed out. Please try again.';
  } finally { clearTimeout(timer); $('get-quote').disabled = false; }
});
