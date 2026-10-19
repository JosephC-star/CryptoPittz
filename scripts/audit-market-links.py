"""Check authored market links/assets and literal React links against local routes."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re
root=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.refs=[];self.handlers=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if attrs.get('id'):self.ids.add(attrs['id'])
  for key in ['href','src','poster']:
   if attrs.get(key):self.refs.append((key,attrs[key]))
  for key,value in attrs.items():
   if key.startswith('on') and value:self.handlers+=re.findall(r"getElementById\(['\"]([^'\"]+)",value)
page=Page();page.feed((root/'public/flea-market/index.html').read_text())
routes=set(re.findall(r'from\s*=\s*"([^"]+)"',(root/'netlify.toml').read_text()))|{'/'}
errors=[];checked=0;external=set()
def check(ref,base='/flea-market/',key='href'):
 global checked
 url=urlsplit(ref)
 if url.scheme in ['https','http']:external.add(ref);return
 if url.scheme in ['mailto','data','blob']:return
 if ref=='#':errors.append('Empty link target: #');return
 path=unquote(url.path);path=path if path.startswith('/') else base+path
 local=root/'public'/path.lstrip('/')
 if key=='href' and path in routes:pass
 elif not local.exists():errors.append('Missing local destination: '+ref)
 if url.fragment and path in ['/flea-market/','/flea-market/index.html'] and unquote(url.fragment) not in page.ids:errors.append('Missing market anchor: '+ref)
 checked+=1
for key,ref in page.refs:check(ref,key=key)
for target in page.handlers:
 if target not in page.ids:errors.append('Missing inline button target: '+target)
for file in [root/'src/App.jsx',*list((root/'src/features/merchant').glob('*.jsx'))]:
 for ref in re.findall(r'href="([^"]+)"',file.read_text()):check(ref,base='/')
if errors:raise SystemExit('\n'.join(sorted(set(errors))))
print(f'{checked} authored links/assets checked; all local destinations, market anchors and inline button targets resolve.')
print('External destinations requiring live review:')
for url in sorted(external):print(url)
