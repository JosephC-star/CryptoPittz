import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
// The original Playground is a preserved compiled release artifact. Make the
// small, guarded cabinet substitution in build output without rebuilding it.
export function withBonezFlip(source){
 const replace=(from,to)=>{if(source.split(from).length!==2)throw Error('Playground cabinet changed; review Bonez Flip integration: '+from.slice(0,70));source=source.replace(from,to);};
 replace('Qr={beat:`PITTZ BEAT`,','Qr={flip:`BONEZ FLIP`,');
 replace('children:`♫ FIRST CYPHER`','children:`🪙 READY TO FLIP`');
 replace('children:`♫ 🦴 ♫`','children:`🪙 🦴`');
 // Replace only the lobby title; the retired rhythm game's source is preserved.
 replace('children:`PITTZ BEAT`}),(0,P.jsx)(`p`,{children:`Hit the Bonez to an original rooftop hip-hop track. Four lanes, one groove.`}', 'children:`BONEZ FLIP`}),(0,P.jsx)(`p`,{children:`Original or Vice? Flip the coin, play best of three, and build your Bonez stack.`}');
 replace('children:`FREE PLAY`}),(0,P.jsx)(`span`,{children:`KEYBOARD + TOUCH`}),(0,P.jsx)(`span`,{children:`2 BEAT MAPS`}', 'children:`BONEZ VAULT`}),(0,P.jsx)(`span`,{children:`SINGLE + BEST OF 3`}),(0,P.jsx)(`span`,{children:`SHARED BONEZ VAULT`}');
 replace('onClick:()=>w(`beat`),children:`PLAY PITTZ BEAT`','onClick:()=>w(`flip`),children:`PLAY BONEZ FLIP`');
 replace('o===`beat`&&(0,P.jsx)(E.Suspense,{fallback:(0,P.jsx)(`div`,{className:`arcade-loading`,children:`Setting up the rooftop decks...`}),children:(0,P.jsx)(Xr,{equippedPittz:x})})', 'o===`flip`&&(0,P.jsx)(`iframe`,{className:`bonez-flip-frame`,src:`/playground/bonez-flip/`,title:`Bonez Flip · The PittzStop`,allow:`autoplay`})');
 return source;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const path='dist/playground/playground.js';await writeFile(path,withBonezFlip(await readFile(path,'utf8')));}
