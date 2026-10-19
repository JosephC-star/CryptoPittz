export function rentalDisplay(rental={},now=Date.now()){
 const expiry=Date.parse(rental.expiresAt),hasExpiry=Number.isFinite(expiry);
 const daysLeft=hasExpiry?Math.max(0,Math.ceil((expiry-now)/86400000)):null;
 const tierLabels={diamond:'Diamond Key · no booth rent',meta:'Meta-Key · 50% off',standard:'Standard rental',waived:'Complimentary access'};
 return {label:tierLabels[rental.tier]||(rental.accessStatus==='test'?'Complimentary access':'Current storefront access'),daysLeft,hasExpiry,expiry:hasExpiry?expiry:null,urgent:hasExpiry&&daysLeft<=7,status:hasExpiry?(expiry<=now?'Term ended':daysLeft<=7?'Renewal coming up':'Term active'):'Assigned access'};
}
export function merchantSteps({shop={},photos={},products=[],alertsEnabled=false}){return [
 {id:'identity',label:'Tell shoppers what you make',detail:'Add a clear shop name and description. Mention rugs, clothing, art, digital goods or custom work to help shoppers find your category.',done:!!shop.name?.trim()&&!!shop.description?.trim(),action:'Edit shop details',tab:'settings',target:'merchant-identity'},
 {id:'cover',label:'Give your storefront a face',detail:'Upload a wide cover around 1600 × 600. Keep faces and logos near the center for smaller screens.',done:!!photos.cover_url,action:'Add a cover',tab:'settings',target:'merchant-appearance'},
 {id:'product',label:'Put your first item on the shelf',detail:'Add a photo, description, price and availability, then choose Published so shoppers can see it.',done:products.some(p=>p.status==='published'&&!p.moderation_hidden),action:'Add a product',tab:'inventory'},
 {id:'alerts',label:'Turn on your inquiry alerts',detail:'Verify your email with the code we send. New inquiries stay in your private inbox and trigger a short email notification.',done:alertsEnabled===true,action:'Set up alerts',tab:'settings',target:'merchant-alerts'}
];}
