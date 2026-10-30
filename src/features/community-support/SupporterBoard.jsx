import {dollars} from '../../../shared/support-denominations.mjs';
import {human} from '../bonez-swap/validation';
const short=address=>address.slice(0,10)+'…'+address.slice(-6);
function amount(raw){
 const [whole,part='']=human(raw,6).split('.');
 if(whole==='0'&&part&&!/[1-9]/.test(part.slice(0,2)))return '<0.01';
 const fraction=part.slice(0,2).replace(/0+$/,'');
 return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(fraction?'.'+fraction:'');
}
export default function SupporterBoard({rows,offset=0}){
 const leading=rows.length?BigInt(rows[0].total_usd_cents||0):0n;
 return <div className="support-board"><div className="support-board-heading"><span className="support-board-mark" aria-hidden="true">🐾</span><div><small>THE PACK SHOWED UP</small><h3>Supporter spotlight.</h3></div></div><p>Ranked by quoted purchase dollars. One wallet, all your public purchases. A little love for everyone helping the pack grow.</p>
 {rows.length?<ol className="support-scoreboard" start={offset+1}>{rows.map((r,index)=>{
  const rank=offset+index+1,name=r.herotag?'@'+r.herotag.replace(/\.elrond$/,''):short(r.wallet_address);
  const share=leading>0n?Number(BigInt(r.total_usd_cents||0)*10000n/leading)/100:0;
  return <li className={'support-standing '+(rank<=3?'support-podium support-place-'+rank:'')} key={r.wallet_address} style={{'--support-share':share+'%'}}>
   <span className="support-rank" aria-label={'Position '+rank}>{rank===1?<span aria-hidden="true">♛</span>:String(rank).padStart(2,'0')}</span>
   <div className="support-name"><strong title={r.wallet_address}>{name}</strong><small>{rank===1?'PACK LEADER':rank<=3?'TOP SUPPORTER':'PART OF THE PACK'}</small></div>
   <div className="support-score" title={human(r.total_bonez,6)+' BONEZ'}><strong>{dollars(r.total_usd_cents)}</strong><small className="support-bonez-total">{amount(r.total_bonez)} BONEZ</small></div>
  </li>;
 })}</ol>:<div className="support-board-welcome"><div aria-hidden="true"><span>01</span><span>🐾</span><span>03</span></div><strong>The first pawprints go here.</strong><p>Buy BONEZ, then choose to share your name and total. The pack will see your support right here.</p></div>}
 <div className="support-board-foot"><span aria-hidden="true">✦</span> Quoted USD at purchase · totals since the last reset.</div></div>;
}
