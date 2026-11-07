import {readFile,writeFile} from 'node:fs/promises';
import {pageShareHtml} from '../shared/page-share.mjs';
const root=await readFile('dist/index.html','utf8'),origin='https://thepittzstop.com';
const launchArtwork = ['/images/pittzstop-launch-nov2026.jpg','Welcome to The PittzStop — a neon roadside sign and two Pittz driving toward the community in a teal convertible.'];
for(const [path,title,description,image,imageAlt] of [
 ['meta-keyz','The Meta Key Booth · The PittzStop','Browse and buy CryptoPittz Meta Keyz in the Pittz Flea Market.','/flea-market/assets/meta-key.jpg','CryptoPittz Meta Key'],
 ['welcome-center','Welcome Center · The PittzStop','Find your way around the PittzStop or take a four-stop guided tour.',...launchArtwork],
 ['welcome','The PittzStop · Home of the CryptoPittz','Collectibles, games, BONEZ tools and community storefronts. Find your corner of The PittzStop.',...launchArtwork],
 ['community-support','The Back Booths · Pittz Flea Market','Buy BONEZ and meet the pack supporting the community.',...launchArtwork],
 ['explorer','CryptoPittz Explorer · The PittzStop','Explore Original and Vice Pittz, discover rare traits, browse listings and make offers.',...launchArtwork],
 ['my-pittz','My Pittz · The PittzStop','Your Original and Vice collection, earnings, listings, offers and transfers.',...launchArtwork],
 ['collector','Collector’s Pack · The PittzStop','Browse a collector’s wallet-held Original and Vice Pittz and make direct offers.',...launchArtwork],
 ['dawg-pound','Pittz Dawg Pound · The PittzStop','Browse Pittz for sale and collection offers from OOX and XOXNO.',...launchArtwork],
 ['financial-district','Financial District · The PittzStop','Swap supported tokens, manage BONEZ staking and liquidity, and visit the pack’s golden quarter.','/images/financial-district-golden-quarter.webp','The Pittz Financial District golden quarter'],
 ['pittensor','Pittensor · The PittzStop','You earn, we burn! Add BONEZ to the pack’s monthly burn pile.',...launchArtwork],
 ['bonez-swap','Token Swap · The PittzStop','Review supported token quotes and swap through your connected MultiversX wallet.',...launchArtwork],
])await writeFile('dist/'+path+'.html',pageShareHtml(root,{title,description,url:origin+'/'+path+'/',image:origin+image,imageAlt}));
