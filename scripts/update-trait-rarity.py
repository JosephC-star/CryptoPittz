"""Rebuild collection-specific trait counts from complete MultiversX NFT metadata."""
import base64, concurrent.futures, json, urllib.request, pathlib, datetime
API='https://api.multiversx.com/collections/'
def read(url):
 with urllib.request.urlopen(url,timeout=45) as r:return json.load(r)
def build(collection):
 total=read(API+collection+'/nfts/count')
 def page(offset):return read(API+collection+'/nfts?from='+str(offset)+'&size=1000&fields=identifier,attributes')
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:rows=sum(pool.map(page,range(0,total,1000)),[])
 assert len(rows)==total and len({r['identifier'] for r in rows})==total,'Incomplete collection'
 counts={}
 for row in rows:
  traits=set()
  for part in base64.b64decode(row.get('attributes','')).decode().split(';'):
   if ':' not in part:continue
   category,value=part.split(':',1)
   if category in ('tags','metadata') or not value.strip():continue
   traits.add((category.strip(),value.strip()))
  for category,value in traits:
   group=counts.setdefault(category,{})
   group[value]=group.get(value,0)+1
 return {'total':total,'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'traits':counts}
result={c:build(c) for c in ['PITTZ-1a4c2d','PITTZVICE-c3ec94']}
pathlib.Path('src/data').mkdir(exist_ok=True)
pathlib.Path('src/data/trait-rarity.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print({c:v['total'] for c,v in result.items()})
