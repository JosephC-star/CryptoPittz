import {schedule, TIERS, WEIGHTS, COUNTS, reward, splitClaims, lpReward, format, DAY, RESERVE} from './model.js';
const $ = id => document.getElementById(id);
let plan, claimedDemo = false;
const date = timestamp => new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(timestamp);
$('holdings').innerHTML = TIERS.map((tier, i) => `<tr><td>${tier}</td><td>${WEIGHTS[i]} / ${+(WEIGHTS[i]*1.2).toFixed(1)}</td><td><input aria-label="Original ${tier} sample quantity" type="number" min="0" max="${COUNTS.original[i]}" value="${i===4?2:0}" data-tier="${i}" data-collection="original"></td><td><input aria-label="Vice ${tier} sample quantity" type="number" min="0" max="${COUNTS.vice[i]}" value="${i===5?1:0}" data-tier="${i}" data-collection="vice"></td><td id="rate-${i}"></td></tr>`).join('');
function update() {
 const week=plan.weeks[Number($('week').value)||0]; let total=0n, valid=true;
 for(const input of document.querySelectorAll('[data-tier]')) { const n=Number(input.value); if(Number.isInteger(n)&&n>=0&&n<=Number(input.max)) {input.setCustomValidity('');total+=reward(week.budget,Number(input.dataset.tier),input.dataset.collection==='vice',n);} else {valid=false;input.setCustomValidity('Enter a whole quantity within the collection count.');} }
 if(!$('eligible').checked) total=0n;
 $('wallet-total').textContent=valid?format(total):'—';
 $('eligibility').textContent=!valid?'Enter valid whole quantities within the collection counts.':$('eligible').checked?'Sample holdings meet the draft eligibility rule.':'Not eligible in this example. A new transfer restarts the 48-hour hold.';
 $('claim').disabled=!valid||total===0n||claimedDemo;
 $('claim').textContent=claimedDemo?'Sample claim complete ✓':'Try a sample claim →';
 $('open-date').textContent=date(week.open)+' · 00:00 UTC (illustrative)';
 $('deadline').textContent=date(week.open+6*DAY)+' · 00:00 UTC Tuesday (exclusive cutoff)';
 for(let i=0;i<7;i++) $('rate-'+i).textContent=format(reward(week.budget,i))+' / '+format(reward(week.budget,i,true));
 const percentage=Number($('claimed').value);$('claimed-label').textContent=percentage+'%';
 const {expired}=splitClaims(week.budget,percentage);$('expired').textContent=format(expired)+' BONEZ';
 const values=['lp-amount','lp-days','lp-others'].map(id=>Number($(id).value));
 try { if(values.some((n,i)=>n>Number($(['lp-amount','lp-days','lp-others'][i]).max))) throw Error(); $('lp-total').textContent=format(lpReward(expired,...values))+' BONEZ'; } catch {$('lp-total').textContent='Check sample inputs';}
}
function resetClaim() {claimedDemo=false;$('claim-status').textContent='Demo only. No wallet signature or transaction.';}
function rebuild() {
 if(!$('start').checkValidity()) return;
 plan=schedule($('start').value);resetClaim();
 $('week').innerHTML=plan.weeks.map((w,i)=>`<option value="${i}">Week ${i+1} · ${date(w.open)}</option>`).join('');
 // Attribute crossing weeks to phases by their weighted overlap; conserve remainder in final phase.
 let assigned=0n;
 const budgets=plan.phases.map((p,i)=>{if(i===plan.phases.length-1)return RESERVE-assigned;const amount=plan.weeks.reduce((sum,w)=>{const overlap=BigInt(Math.max(0,Math.min(w.close,p.end)-Math.max(w.open,p.start)))*p.factor;return sum+w.budget*overlap/w.weight;},0n);assigned+=amount;return amount;});
 $('phases').innerHTML=plan.phases.map((p,i)=>`<tr><td>${i+1}</td><td>${Number(p.factor)/256}×</td><td>${date(p.start)} – ${date(p.end)}</td><td>${format(budgets[i])}</td></tr>`).join('');
 $('bars').innerHTML=plan.phases.map((p,i)=>`<div style="height:${Math.max(3,Number(p.factor)/256*100)}%" title="Phase ${i+1}: ${format(budgets[i])} BONEZ"></div>`).join('');
 $('bars').setAttribute('aria-label','Phase emission rates halve every nine calendar months.');
 $('schedule-total').textContent='Total scheduled: '+format(plan.weeks.reduce((sum,w)=>sum+w.budget,0n))+' BONEZ · '+plan.weeks.length+' payout weeks'; update();
}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelectorAll('.panel').forEach(panel=>panel.hidden=panel.id!==button.dataset.tab);}));
$('start').addEventListener('change',rebuild);
for(const id of ['week','eligible','holdings','claimed','lp-amount','lp-days','lp-others']) $(id).addEventListener('input',()=>{resetClaim();update();});
$('claim').addEventListener('click',()=>{claimedDemo=true;$('claim-status').textContent='Sample claim complete. No real BONEZ moved. Change a sample setting to reset.';update();});
rebuild();
