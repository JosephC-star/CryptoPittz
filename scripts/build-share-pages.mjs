import {readFile,writeFile} from 'node:fs/promises';
import {pageShareHtml} from '../shared/page-share.mjs';
const root=await readFile('dist/index.html','utf8'),origin='https://thepittzstop.com';
for(const [path,title,description,image,imageAlt] of [
 ['financial-district','Financial District · The PittzStop','Swap supported tokens, manage BONEZ staking and liquidity, and visit the pack’s golden quarter.','/images/financial-district-golden-quarter.webp','The Pittz Financial District golden quarter'],
 ['pittensor','Pittensor · The PittzStop','You earn, we burn! Add BONEZ to the pack’s monthly burn pile.','/images/cryptopittz-logo.jpg','CryptoPittz community logo'],
 ['bonez-swap','Token Swap · The PittzStop','Review supported token quotes and swap through your connected MultiversX wallet.','/images/cryptopittz-logo.jpg','CryptoPittz community logo'],
])await writeFile('dist/'+path+'.html',pageShareHtml(root,{title,description,url:origin+'/'+path+'/',image:origin+image,imageAlt}));
