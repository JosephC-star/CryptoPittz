export const REVIEW_LABELS=['','This shop smells like sh*t','Room to improve','Solid shop','Pack approved','This shop is the sh*t'];
export function reviewInput(body){
 const name=typeof body.name==='string'?body.name.trim():'';
 const comment=typeof body.comment==='string'?body.comment.trim():'';
 if(body.website||body.consent!==true||!Number.isInteger(body.rating)||body.rating<1||body.rating>5||name.length<2||name.length>60||comment.length<10||comment.length>1500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(name+comment))throw Object.assign(Error('Choose a rating, add a name (2–60 characters) and review (10–1,500 characters), and confirm publication.'),{status:400});
 return {name,comment,rating:body.rating};
}
