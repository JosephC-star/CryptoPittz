// Deliberately supports emphasis only. HTML stays ordinary text.
export function inlineCopy(value=''){
 return String(value).split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).filter(Boolean).map(text=>text.startsWith('**')&&text.endsWith('**')?{kind:'strong',text:text.slice(2,-2)}:text.startsWith('*')&&text.endsWith('*')?{kind:'em',text:text.slice(1,-1)}:{kind:'text',text});
}
export function copyParagraphs(value=''){return String(value).trim().split(/\n\s*\n/).filter(Boolean).map(inlineCopy);}
export function plainCopy(value=''){return copyParagraphs(value).map(tokens=>tokens.map(t=>t.text).join('')).join(' ').replace(/\s+/g,' ').trim();}
