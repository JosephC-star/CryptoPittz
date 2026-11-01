export function adminReturnPath(search=''){
 return new URLSearchParams(search).get('return')==='back-booths'?'/market-admin?return=back-booths':null;
}
export function adminWalletCallbackPath(path,search=''){
 return path+(path.replace(/\/$/,'')==='/market-admin'&&adminReturnPath(search)?'?return=back-booths':'');
}
