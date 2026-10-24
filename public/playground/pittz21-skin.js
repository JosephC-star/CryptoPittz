// Presentation only: the preserved game owns cards, scores, turn order and Bonez.
export function tableMood(title=''){
 if(/PUSH/.test(title))return 'push';
 if(/NATURAL BLACKJACK/.test(title))return 'blackjack';
 if(/BUSTED|DOUBLE-DOWN BUST/.test(title))return 'bust';
 if(/PACK WIN|DEALER BUSTS/.test(title))return 'win';
 if(/HOUSE PITT WINS|DEALER BLACKJACK/.test(title))return 'loss';
 return 'ready';
}
const remarks={ready:'Pull up a seat. The Pack is watching.',player:'Your move. Make it count.',dealer:'Let’s see what the house is holding.',win:'Clean hand. The Bonez are yours.',blackjack:'Twenty-one. That’s EXTRA MUSTY.',bust:'Over the line. Next hand, partner.',loss:'House takes this one. Come back swinging.',push:'Even hands. Your Bonez come home.'};
if(typeof document!=='undefined'){
 const records=new WeakMap();let sound=false,audio;
 try{sound=localStorage.getItem('cryptopittz-21-sound')==='on';}catch{}
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 function tone(frequency,duration=.08,type='sine',delay=0){if(!sound||document.hidden)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();void audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.035,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+duration);}catch{}}
 function decorate(){
  const table=document.querySelector('.pittz21-table');if(!table)return;
  let record=records.get(table);if(!record){record={title:null,cards:new WeakSet(),timer:null};records.set(table,record);}
  const header=table.querySelector('.p21-header');
  if(header&&!header.querySelector('.p21-sound')){const toggle=node('button','p21-sound');toggle.type='button';const update=()=>{toggle.textContent=sound?'Sound on ♫':'Sound off ♫';toggle.setAttribute('aria-pressed',String(sound));};update();toggle.addEventListener('click',()=>{sound=!sound;try{localStorage.setItem('cryptopittz-21-sound',sound?'on':'off');}catch{}update();if(sound)tone(440);else void audio?.suspend();});header.append(toggle);}
  const dealer=table.querySelector('.dealer-hand'),player=table.querySelector('.player-hand'),controls=table.querySelector('.p21-controls'),message=table.querySelector('.p21-message');
  if(!dealer||!player||!controls||!message)return;
  let corner=table.querySelector('.p21-dealer-corner');if(!corner){corner=node('div','p21-dealer-corner');const portrait=node('div','p21-dealer-portrait'),img=node('img');img.src='/images/neon-pitbull-hero.png';img.alt='The House Pitt';portrait.append(img);const copy=node('div');copy.append(node('span','p21-dealer-name','YOUR HOUSE PITT'),node('p','p21-dealer-remark'));corner.append(portrait,copy);dealer.before(corner);}
  let circle=table.querySelector('.p21-betting-circle');if(!circle){circle=node('div','p21-betting-circle');const chips=node('div','p21-chip-stack');chips.setAttribute('aria-hidden','true');for(let i=0;i<4;i++){const chip=node('span','p21-bonez-chip'),img=node('img');img.src='/images/cryptopittz-bonez-transparent.png';img.alt='';chip.style.setProperty('--chip',i);chip.append(img);chips.append(chip);}circle.append(chips,node('span','p21-bet-label','BONEZ ON THE FELT'),node('strong','p21-live-bet'));controls.before(circle);}
  const title=message.querySelector('strong')?.textContent||'',mood=tableMood(title),turn=message.classList.contains('player')?'player':message.classList.contains('dealer')?'dealer':'ready';
  table.dataset.p21Turn=turn;table.dataset.p21Mood=mood;
  const remark=corner.querySelector('.p21-dealer-remark'),text=remarks[mood!=='ready'?mood:turn];if(remark.textContent!==text)remark.textContent=text;
  const amount=table.querySelector('.p21-dashboard>div:nth-child(2) strong')?.textContent||'—',bet=circle.querySelector('.p21-live-bet');if(bet.textContent!==amount)bet.textContent=amount;
  dealer.setAttribute('aria-label','Dealer hand'+(turn==='dealer'?' · Playing now':''));player.setAttribute('aria-label','Your hand'+(turn==='player'?' · Your turn':''));
  let newCards=0;for(const card of table.querySelectorAll('.p21-card.dealt')){if(record.cards.has(card))continue;record.cards.add(card);if(!reduced())card.animate?.([{opacity:0,transform:'translate(30px,-18px) rotateY(65deg) rotateZ(5deg)'},{opacity:1,transform:'translate(0,0) rotateY(0) rotateZ(0)'}],{duration:320,delay:newCards*65,easing:'cubic-bezier(.2,.8,.2,1)'});newCards++;}
  if(newCards&&record.title!==null)tone(240,.055,'triangle');
  if(title!==record.title){const previous=record.title;record.title=title;table.classList.remove('p21-result-reveal');clearTimeout(record.timer);if(previous!==null&&mood!=='ready'){table.classList.add('p21-result-reveal');record.timer=setTimeout(()=>table.classList.remove('p21-result-reveal'),1800);if(['win','blackjack'].includes(mood)){tone(523,.13);tone(659,.14,'sine',.12);tone(784,.2,'sine',.25);}else if(['loss','bust'].includes(mood))tone(150,.16,'triangle');else tone(330,.1);}}
 }
 let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});};
 const root=document.getElementById('root');if(root)new MutationObserver(queue).observe(root,{childList:true,subtree:true,characterData:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void audio?.suspend();});window.addEventListener('hashchange',queue);queue();
}
