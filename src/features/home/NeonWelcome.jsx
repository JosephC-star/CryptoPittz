import {useId,useState} from 'react';
import city from './pixel-city.svg?raw';
import './neon-welcome.css';
export function NeonWelcome(){
 const [paused,setPaused]=useState(false);
 return <div className={'pixel-welcome'+(paused?' is-paused':'')}><div className="pixel-city-art" aria-hidden="true" dangerouslySetInnerHTML={{__html:city}}/><div className="pixel-city-caption"><span>WELCOME TO THE PITTZSTOP</span><span>ART · GAMES · COMMUNITY</span></div><button type="button" className="pixel-motion-control" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?'Play scene ▷':'Pause scene Ⅱ'}</button></div>;
}
export function IntroDisclosure({children}){
 const [expanded,setExpanded]=useState(false),id=useId();
 return <div className="pittz-intro"><p className="subtitle">CryptoPittz is an NFT collection on MultiversX, featuring raw, high-quality pitbull artwork.<span id={id} className={'pittz-intro-more'+(expanded?' is-expanded':'')}> {children}</span></p><button type="button" className="pittz-intro-toggle" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(value=>!value)}>{expanded?'Read less ↑':'More about the pack ↓'}</button></div>;
}
