"""Audit authored site routes, anchors and local assets; no browser or wallet actions."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
import re
root=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,text):super().__init__();self.ids=set();self.refs=[];self.feed(text)
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if attrs.get('id'):self.ids.add(attrs['id'])
  for key in ['href','src','poster']:
   if attrs.get(key):self.refs.append((key,attrs[key]))
jsx=list((root/'src').rglob('*.jsx'))
source_ids=set()
for f in jsx:source_ids.update(re.findall(r'\bid=["\']([^"\']+)["\']',f.read_text()))
market=Page((root/'public/flea-market/index.html').read_text())
play=Page((root/'public/playground/index.html').read_text())
routes=set(re.findall(r'from\s*=\s*"([^"]+)"',(root/'netlify.toml').read_text()))|{'/'}
errors=set();external=set();checked=set();dynamic=0

def check(ref,source,attr='href',base='/'):
 if not ref or any(x in ref for x in ['${','{','}']):return
 url=urlsplit(ref)
 if url.scheme in ['mailto','data','blob','tel']:return
 if url.scheme in ['http','https']:
  if url.netloc not in ['thepittzstop.com','www.thepittzstop.com']:external.add(ref);return
 if ref=='#':errors.add(f'{source}: empty # target');return
 path=unquote(url.path) or base
 if not path.startswith('/'):path=base+path
 local=root/'public'/path.lstrip('/')
 if path.startswith('/src/') and (root/path.lstrip('/')).exists():pass
 elif attr=='href' and path in routes:pass
 elif not local.exists():errors.add(f'{source}: missing destination {ref}')
 if attr=='href' and url.fragment:
  ids=market.ids if path in ['/flea-market/','/flea-market/index.html'] else source_ids if path=='/' else play.ids if path.startswith('/playground') else None
  if url.fragment.startswith('/playground'):pass # Hash router, not a DOM anchor.
  elif ids is not None and unquote(url.fragment) not in ids:errors.add(f'{source}: missing anchor {ref}')
 checked.add((path,url.fragment))
for path,base in [('index.html','/'),('public/flea-market/index.html','/flea-market/'),('public/playground/index.html','/playground/')]:
 for attr,ref in Page((root/path).read_text()).refs:check(ref,path,attr,base)
for f in jsx:
 text=f.read_text();name=str(f.relative_to(root));base='/'
 for attr,ref in re.findall(r'\b(href|src|poster)=["\']([^"\']+)["\']',text):check(ref,name,attr,base)
for f in [*list((root/'src').rglob('*.css')),*list((root/'public/playground').glob('*.css'))]:
 for ref in re.findall(r'url\(["\']?([^\)"\']+)',f.read_text()):
  if ref.startswith('/'):check(ref,str(f.relative_to(root)),'src')
  elif not ref.startswith(('data:','http','#')) and not (f.parent/ref).exists():errors.add(f'{f.relative_to(root)}: missing CSS asset {ref}')
# Compiled playground modules reference literal asset paths rather than JSX attributes.
for f in (root/'public/playground').glob('*.js'):
 for ref in set(re.findall(r'["\'`](/playground/assets/[^"\'`$]+)["\'`]',f.read_text())):check(ref,str(f.relative_to(root)),'src')
if errors:raise SystemExit('\n'.join(sorted(errors)))
print(f'{len(checked)} unique local route/anchor/asset references resolve. No empty authored links found.')
print(f'{len(external)} unique external URLs require content review; dynamic/API URLs and authenticated flows need separate checks.')
