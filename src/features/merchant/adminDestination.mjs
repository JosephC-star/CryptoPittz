export function adminReturnPath(search=''){
 return new URLSearchParams(search).get('return')==='back-booths'?'/community-support/':null;
}
export function adminWalletCallbackPath(path,search=''){
 return path+(path.replace(/\/$/,'')==='/market-admin'&&adminReturnPath(search)?'?return=back-booths':'');
}
