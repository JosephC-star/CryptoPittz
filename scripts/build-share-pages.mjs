import {readFile,writeFile} from 'node:fs/promises';
import {pageShareHtml} from '../shared/page-share.mjs';
const root=await readFile('dist/index.html','utf8'),origin='https://thepittzstop.com';
for(const [path,title,description,image,imageAlt] of [
 ['my-pittz','My Pittz · The PittzStop','Your Original and Vice collection, earnings, listings, offers and transfers.','/images/cryptopittz-logo.jpg','CryptoPittz community logo'],
 ['collector','Collector’s Pack · The PittzStop','Browse a collector’s wallet-held Original and Vice Pittz and make direct offers.','/images/cryptopittz-logo.jpg','CryptoPittz community logo'],
 ['dawg-pound','Pittz Dawg Pound · The PittzStop','Browse Pittz for sale and collection offers from OOX and XOXNO.','/images/cryptopittz-logo.jpg','CryptoPittz community logo'],
 ['financial-district','Financial District · The PittzStop','Swap supported tokens, manage BONEZ staking and liquidity, and visit the pack’s golden quarter.','/images/financial-district-golden-quarter.webp','The Pittz Financial District golden quarter'],
 ['pittensor','Pittensor · The PittzStop','You earn, we burn! Add BONEZ to the pack’s monthly burn pile.','/images/cryptopittz-logo.jpg','CryptoPittz community logo'],
 ['bonez-swap','Token Swap · The PittzStop','Review supported token quotes and swap through your connected MultiversX wallet.','/images/cryptopittz-logo.jpg','CryptoPittz community logo'],
])await writeFile('dist/'+path+'.html',pageShareHtml(root,{title,description,url:origin+'/'+path+'/',image:origin+image,imageAlt}));
