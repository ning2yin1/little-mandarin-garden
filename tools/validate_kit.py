"""Validate the authored handoff, not the future PWA. Standard library + Pillow."""
import json,re,hashlib,wave
from pathlib import Path
from collections import Counter
from xml.etree import ElementTree as ET
from PIL import Image
R=Path(__file__).resolve().parents[1];errors=[]
def check(condition,message):
 if not condition:errors.append(message)
x=json.loads((R/'data/curriculum.json').read_text());lessons=x['lessons'];qids=set();tids=set();questions={};alts=0
check(len(lessons)==72,'lesson count !=72')
check(len({l['id'] for l in lessons})==72,'duplicate lesson ID')
for l in lessons:
 qs=l['questions'];check(len(qs)==10,f'{l["id"]}: !=10 questions')
 check([q['category'] for q in qs]==['daily']*4+['anime']*3+['gag']*3,f'{l["id"]}: category sequence')
 check(len({q['sentence']['simplified'] for q in qs})==10,f'{l["id"]}: duplicate sentence in lesson')
 for dep in l['prerequisites']:check(dep in {z['id'] for z in lessons},f'missing dependency {dep}')
 for q in qs:
  check(q['id'] not in qids,f'duplicate question ID {q["id"]}');qids.add(q['id']);questions[q['id']]=q
  ids=[t['id'] for t in q['tokens']];check(len(ids)==len(set(ids)),f'{q["id"]}: duplicate token ID')
  check(not set(ids)&tids,f'global duplicate token ID {q["id"]}');tids.update(ids)
  byid={t['id']:t for t in q['tokens']}
  check(q['canonical_order']==ids,f'{q["id"]}: canonical IDs not token order')
  for a in q['accepted_orders']:check(Counter(a)==Counter(ids),f'{q["id"]}: accepted order loses token')
  alts+=len(q['accepted_orders'])-1
  for t in q['tokens']:
   for field in ['simplified','traditional','pinyin','pos','meaning_ja','role_ja']:check(bool(t.get(field)),f'{t["id"]}: missing {field}')
   check(not re.search(r'[0-9]',t['pinyin']),f'{t["id"]}: numeric pinyin')
   if t['simplified']=='只':check(t['pinyin']=='zhī' and t['traditional']=='隻',f'{t["id"]}: measure zhi')
  for script in ['simplified','traditional']:
   plain=''.join(byid[i][script] for i in q['canonical_order'])
   actual=re.sub(r'[，。？！、；：\s]','',q['sentence'][script])
   check(plain==actual,f'{q["id"]}: token/full sentence {script} mismatch')
   rebuilt=''.join(byid[s['token_id']][script] if s['kind']=='token' else s['text'] for s in q['segments'])+q['terminal_punctuation']
   check(rebuilt==q['sentence'][script],f'{q["id"]}: segment reconstruction {script}')
  check(q['prompt_ja'] and q['explanation_ja'] and q['answer_note_ja'],f'{q["id"]}: explanation missing')
check(len(qids)==720,'question count !=720')
# Executable grading examples include swapped duplicate IDs and accepted time-fronting.
fixtures=json.loads((R/'data/acceptance-fixtures.json').read_text())
for f in fixtures['grading_cases']:
 q=questions[f['question_id']];byid={t['id']:t for t in q['tokens']};words=[t[f.get('script','simplified')] for t in q['tokens']]
 submitted=f['submitted_words'];complete=Counter(submitted)==Counter(words)
 if not complete:actual='incomplete'
 else:
  variants=[''.join(byid[i][f.get('script','simplified')] for i in ids) for ids in q['accepted_orders']]
  actual='correct' if ''.join(submitted) in variants else 'incorrect'
 check(actual==f['expected'],f'fixture {f["id"]}: {actual}')
asset_count=0
for p in (R/'assets').rglob('*'):
 if not p.is_file():continue
 asset_count+=1
 if p.suffix=='.svg':ET.parse(p)
 if p.suffix in {'.png','.webp'}:
  im=Image.open(p);im.verify()
 if p.parent.name=='characters':
  im=Image.open(p);check(im.mode=='RGBA',f'{p.name}: not RGBA');check(im.getchannel('A').getextrema()[0]==0,f'{p.name}: no transparency')
  check(im.getchannel('A').getbbox()[0]>0 and im.getchannel('A').getbbox()[2]<640,f'{p.name}: edge clipping')
 if p.suffix=='.wav':
  with wave.open(str(p)) as f:check(f.getnframes()>0 and f.getnchannels()==1,f'{p.name}: audio format')
for ref in re.findall(r'(?:src|href)="([^"]+)"',(R/'docs/style-guide.html').read_text()):
 if not re.match(r'https?:|#|data:',ref):check((R/'docs'/ref).exists(),f'missing HTML asset {ref}')
manifest=json.loads((R/'data/asset-manifest.json').read_text())
for a in manifest:
 p=R/a['path'];check(p.is_file() and p.stat().st_size==a['bytes'],f'manifest mismatch {a["path"]}')
check(asset_count==len(manifest),'asset manifest count mismatch')
report={'scope':'制作キットの構造・素材・代表採点fixtureの検証。PWA実装テストではありません。','status':'PASS' if not errors else 'FAIL','lessons':len(lessons),'questions':len(qids),'categories':{'daily':288,'anime':216,'gag':216},'tokens':len(tids),'alternative_orders':alts,'assets':asset_count,'grading_fixtures':len(fixtures['grading_cases']),'errors':errors,'limitations':['母語話者による第三者校閲は未実施','アプリ本体の実装とiPhone実機テストはCodexで実施','accepted_ordersは全ての自然な語順を網羅する汎用判定器ではない']}
(R/'docs/VALIDATION_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
