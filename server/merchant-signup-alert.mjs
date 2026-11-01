export const MERCHANT_SIGNUP_EMAIL='cryptopittz69@gmail.com';
export function merchantSignupMail(shop){
 if(!shop?.id||!Number.isInteger(shop.booth_number))throw Error('Storefront details are missing.');
 return {to:MERCHANT_SIGNUP_EMAIL,subject:'New merchant at the PittzStop Flea Market',text:'A new merchant has activated a storefront.\n\nShop: '+shop.name+'\nBooth: '+shop.booth_number+'\n\nView their storefront: https://thepittzstop.com/market-shop?booth='+shop.booth_number+'\nManage the market: https://thepittzstop.com/market-admin\n\nA welcome message has been added to their private merchant inbox.'};
}
