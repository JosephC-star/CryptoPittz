export function nftArrowDirection(event){
 if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return 0;
 if(event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],[role="spinbutton"]'))return 0;
 return event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;
}
