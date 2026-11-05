import {schedule, TIERS, allocate, splitClaims, lpReward, format, DAY, RESERVE} from './model.js';
const $ = id => document.getElementById(id);
let plan, claimedDemo = false;
const date = timestamp => new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(timestamp);
const utc = timestamp => new Date(timestamp).toISOString().slice(11, 16) + ' UTC';
function update() {
 const index = Number($('week').value) || 0;
 const week = plan.weeks[index];
 const empty = $('no-eligible').checked;
 const holdings = [
   {collection:'original', nonce:101, rank:500, listed:false, heldSince:week.open-2*DAY, wallet:'A'},
   {collection:'original', nonce:102, rank:500, listed:false, heldSince:week.open-3*DAY, wallet:'B'},
   {collection:'vice', nonce:201, rank:150, listed:false, heldSince:week.open-3*DAY, wallet:'A'},
   {collection:'original', nonce:103, rank:10, listed:true, heldSince:week.open-5*DAY, wallet:'B'},
   {collection:'vice', nonce:202, rank:2, listed:false, heldSince:week.open-DAY, wallet:'B'},
 ].map(holding => empty ? {...holding, listed:true} : holding);
 const result = allocate(week.budget, week.open, holdings);
 const total = result.rows.filter(row => row.wallet === 'A').reduce((sum,row) => sum+row.amount, 0n);
 $('holdings').innerHTML = result.rows.map(row => `<tr><td>${row.collection === 'vice' ? 'Vice' : 'OG'} #${row.nonce} · Wallet ${row.wallet}</td><td>${TIERS[row.tier]} · rank ${row.rank}</td><td>${row.status}</td><td>${Number(row.weight)/5}</td><td>${format(row.amount)}</td></tr>`).join('');
 $('accounting').textContent = `Pool ${format(week.budget)} BONEZ · Allocated ${format(result.allocated)} · Unallocated ${format(result.unallocated)}`;
 $('wallet-total').textContent = format(total);
 $('eligibility').textContent = empty ? 'No eligible Pittz. The pool stays unallocated in this simulation. Policy pending.' : 'Wallet A earns both eligible shares at the snapshot. Moving a Pitt afterward leaves this allocation with Wallet A.';
 $('claim').disabled = total === 0n || claimedDemo;
 $('claim').textContent = claimedDemo ? 'Sample claim complete ✓' : 'Try a sample claim →';
 $('open-date').textContent = date(week.open) + ' · ' + utc(week.open);
 $('deadline').textContent = date(week.deadline) + ' · ' + utc(week.deadline) + ' (exclusive cutoff)';
 const percentage=Number($('claimed').value);
 $('claimed-label').textContent=percentage+'%';
 const {expired} = splitClaims(result.allocated, percentage);
 $('expired').textContent = format(expired)+' BONEZ';
 const values=['lp-amount','lp-days','lp-others'].map(id=>Number($(id).value));
 try { if(values.some((n,i)=>n>Number($(['lp-amount','lp-days','lp-others'][i]).max))) throw Error(); $('lp-total').textContent=format(lpReward(expired,...values))+' BONEZ'; } catch {$('lp-total').textContent='Check sample inputs';}
}
function resetClaim() {claimedDemo=false;$('claim-status').textContent='Demo only. No wallet signature or transaction.';}
function rebuild() {
 plan=schedule();resetClaim();
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
for(const id of ['week','no-eligible','claimed','lp-amount','lp-days','lp-others']) $(id).addEventListener('input',()=>{resetClaim();update();});
$('claim').addEventListener('click',()=>{claimedDemo=true;$('claim-status').textContent='Sample claim complete. No real BONEZ moved. Change a sample setting to reset.';update();});
rebuild();
