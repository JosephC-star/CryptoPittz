import {dollars} from '../../../shared/support-denominations.mjs';
import {human} from '../bonez-swap/validation';
const short=address=>address.slice(0,10)+'…'+address.slice(-6);
function amount(raw){
 const [whole,part='']=human(raw,6).split('.');
 if(whole==='0'&&part&&!/[1-9]/.test(part.slice(0,2)))return '<0.01';
 const fraction=part.slice(0,2).replace(/0+$/,'');
 return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(fraction?'.'+fraction:'');
}
export default function SupporterBoard({rows}){
 return <div className="support-board"><div className="support-board-heading"><span className="support-board-mark" aria-hidden="true">🐾</span><div><small>THE PACK SHOWED UP</small><h3>Supporter spotlight.</h3></div></div><p>Shown in order of total BONEZ purchased. One wallet, all your public purchases. A little love for everyone helping the pack grow.</p>
 {rows.length?<ul className="support-scoreboard" role="list">{rows.map(r=>{
  const name=r.herotag?'@'+r.herotag.replace(/\.elrond$/,''):short(r.wallet_address);
  return <li className="support-standing" key={r.wallet_address}>
   <div className="support-name"><strong title={r.wallet_address}>{name}</strong></div>
   <div className="support-score" title={human(r.total_bonez,6)+' BONEZ'}><strong>{dollars(r.total_usd_cents)}</strong><small className="support-bonez-total">{amount(r.total_bonez)} BONEZ</small></div>
  </li>;
 })}</ul>:<div className="support-board-welcome"><div aria-hidden="true"><span>🐾</span></div><strong>The first pawprints go here.</strong><p>After your BONEZ purchase confirms, your herotag or shortened wallet address and purchase totals will appear here.</p></div>}
 <div className="support-board-foot"><span aria-hidden="true">✦</span> Quoted USD at purchase · totals since the last reset.</div></div>;
}
