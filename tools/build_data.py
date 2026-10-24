"""Build authored, offline curriculum. Requires pypinyin and opencc-python-reimplemented.
The authoring source explicitly separates words; no automatic word segmentation.
"""
import json,re,hashlib
from pathlib import Path
from collections import Counter
from pypinyin import pinyin,Style
from opencc import OpenCC
ROOT=Path(__file__).resolve().parents[1]
cc=OpenCC('s2tw')
lex={};pos=''
for line in (ROOT/'tools/lexicon.txt').read_text().splitlines():
 if line.startswith('#'): pos=line[1:]
 elif '|' in line:
  w,meaning=line.split('|',1);lex[w]={'meaning_ja':meaning,'pos':pos}
PUNCT=set('，。？！、；：')
OVERRIDES={'角色':'jué sè','主角':'zhǔ jué','哪儿':'nǎr','这儿':'zhèr','一点儿':'yì diǎnr','有点儿':'yǒu diǎnr','早点儿':'zǎo diǎnr','时候':'shí hou','什么':'shén me','怎么':'zěn me','为什么':'wèi shén me','为了':'wèi le','的':'de','得':'de','着':'zhe','了':'le','还':'hái','长':'cháng','地':'de','一边':'yì biān','一下':'yí xià','一样':'yí yàng','一起':'yì qǐ','一切':'yí qiè','一直':'yì zhí','不见':'bú jiàn','不要':'bú yào','对不起':'duì bu qǐ','休息':'xiū xi','认识':'rèn shi','喜欢':'xǐ huan','东西':'dōng xi','朋友':'péng you','衣服':'yī fu','孩子':'hái zi','房子':'fáng zi','椅子':'yǐ zi','杯子':'bēi zi','桌子':'zhuō zi','名字':'míng zi','眼镜':'yǎn jìng','老鼠':'lǎo shǔ','时候':'shí hou','明白':'míng bai','爸爸':'bà ba','妈妈':'mā ma','弟弟':'dì di','告诉':'gào su','我们':'wǒ men','他们':'tā men','聪明':'cōng ming','觉得':'jué de'}
def py(w):
 return OVERRIDES.get(w,' '.join(x[0] for x in pinyin(w,style=Style.TONE,neutral_tone_with_five=False)))
def tone(w):
 val=pinyin(w,style=Style.TONE3,neutral_tone_with_five=True)[0][0]
 return int(val[-1]) if val[-1:].isdigit() else 5
lessons=[];current=None
raw=(ROOT/'tools/lessons.txt').read_text().replace('真的','真 的').replace('假的','假 的').replace('有没有','有 没 有')
for line in raw.splitlines():
 if not line:continue
 if line.startswith('#'):
  ident,level,title,pattern,explanation=line[1:].split('|')
  current={'id':f'g{int(ident):03}','level':int(level),'level_label':f'HSK{level}目安','title_ja':title,'pattern':pattern,'explanation_ja':explanation,'prerequisites':[],'questions':[]}
  lessons.append(current);continue
 sentence,ja=line.split('|');words=sentence.split();n=len(current['questions'])+1;gid=current['id'];qid=f'{gid}-q{n:02}'
 tokens=[];segments=[];real=[w for w in words if w not in PUNCT];ri=0
 for wi,w in enumerate(words):
  if w in PUNCT:
   segments.append({'kind':'punctuation','text':w,'after_token':tokens[-1]['id'] if tokens else None});continue
  tid=f'{qid}-t{ri:02}';reading=py(w);entry=dict(lex[w]);nxt=words[wi+1] if wi+1<len(words) else '';prev=words[wi-1] if wi else ''
  if w=='不' and nxt and nxt not in PUNCT and tone(nxt)==4:reading='bú'
  if w=='一':
   reading='yī' if prev=='第' or nxt in PUNCT or not nxt else ('yí' if tone(nxt)==4 else 'yì')
  if w=='了' and prev=='得':reading='liǎo';entry={'pos':'結果補語','meaning_ja':'実現できる（来得了＝来られる）'}
  if w=='地' and nxt=='上':reading='dì';entry={'pos':'名詞','meaning_ja':'地面'}
  elif w=='地':entry={'pos':'助詞','meaning_ja':'動作の様子を前から修飾する印'}
  if w=='只':reading='zhī'
  if w=='种':
   if prev in ['这','那']:reading='zhǒng';entry={'pos':'量詞','meaning_ja':'種類を数える語'}
   else:reading='zhòng'
  if w=='会' and prev in ['过','次']:reading='huì';entry={'pos':'名詞','meaning_ja':'会議（开会の目的語）'}
  if w=='把' and nxt=='剑':entry={'pos':'量詞','meaning_ja':'剣など柄のある物を数える語'}
  if w=='过' and current['id']=='g042':reading='guò';entry={'pos':'方向補語','meaning_ja':'こちら／あちらへ移動する方向'}
  if w=='过' and current['id']!='g042':reading='guo'
  if w=='一' and current['id']=='g051':entry={'pos':'副詞','meaning_ja':'〜すると（一〜就〜の前半）'}
  if w in ['完','懂','见','到','好','湿','掉','醒'] and prev in ['吃','写','做','听','看','找','淋','叫','吹','气']:
   entry['pos']='結果補語'
  if w=='下' and prev=='留':entry={'pos':'結果補語','meaning_ja':'その場に残ることを示す（留下）'}
  if w=='到' and prev=='找':entry={'pos':'結果補語','meaning_ja':'探して見つかるという結果'}
  if w=='上' and prev=='喜欢':entry={'pos':'結果補語','meaning_ja':'好きになり始める（喜欢上）'}
  if w=='下' and prev=='坐':entry={'pos':'方向補語','meaning_ja':'座った状態になる（坐下）'}
  if w=='上' and prev=='关':entry={'pos':'結果補語','meaning_ja':'閉じた状態にする（关上）'}
  if w=='下' and prev=='放':entry={'pos':'結果補語','meaning_ja':'収まる（放得下／放不下）'}
  if w=='得' and current['id']=='g043':entry={'pos':'可能補語の標識','meaning_ja':'後ろの結果が実現できることを示す'}
  if w=='不' and current['id']=='g043' and prev in ['看','放','回','吃','听']:entry={'pos':'可能補語の否定','meaning_ja':'後ろの結果を実現できないことを示す'}
  if w=='给' and current['id']=='g061':entry={'pos':'介詞','meaning_ja':'〜に・〜のために'}
  if w=='在':
   location_starts={'家','学校','医院','厨房','桌子','包','公司','班','网上','这儿','那儿','我','书包','床','办公室'}
   if nxt not in location_starts: entry={'pos':'副詞','meaning_ja':'〜している（動作の進行）'}
   elif prev in {'住','放','是'} or current['id'] in {'g058','g061','g072'} or '最' in words[wi+1:]: entry={'pos':'介詞','meaning_ja':'〜で・〜に（場所）'}
   else: entry={'pos':'動詞','meaning_ja':'〜にいる・〜にある'}
  if w=='假' and prev=='了':
   reading='jià';entry={'pos':'名詞','meaning_ja':'休暇'}
  if w=='一' and current['id']=='g030' and nxt=='开口':entry={'pos':'副詞','meaning_ja':'〜すると（一〜就〜）'}
  if w=='工作':
   is_noun=prev in {'有','这','份','的'}
   entry={'pos':'名詞' if is_noun else '動詞','meaning_ja':'仕事' if is_noun else '働く・動く'}
  if w=='画':
   is_noun=prev in {'张','的'}
   entry={'pos':'名詞' if is_noun else '動詞','meaning_ja':'絵' if is_noun else '描く'}
  if w=='一下':entry={'pos':'数量補語','meaning_ja':'少し・ちょっと行う'}
  if w=='一' and nxt=='把':entry={'pos':'数詞','meaning_ja':'一'}
  if w=='再见':entry={'pos':'あいさつ','meaning_ja':'さようなら'}
  if w=='对不起':entry={'pos':'あいさつ','meaning_ja':'ごめんなさい'}
  if w=='是':entry={'pos':'動詞','meaning_ja':'〜である'}
  role=entry['pos']
  trad={'只':'隻','里':'裡','才':'才','别':'別'}.get(w,cc.convert(w))
  token={'id':tid,'simplified':w,'traditional':trad,'pinyin':reading,'pos':entry['pos'],'meaning_ja':entry['meaning_ja'],'role_ja':role}
  tokens.append(token);segments.append({'kind':'token','token_id':tid});ri+=1
 canonical=''.join(real)
 final='？' if ('ですか' in ja or ja.endswith('？') or ja.endswith('は？') or ja.endswith('どこ？')) else '。'
 full=''.join(words)+final
 orders=[[t['id'] for t in tokens]]
 # Safe, common topical time-fronting for simple clauses only.
 movable={'今天','明天','昨天','昨晚','晚上','周末','星期一','中午'}
 if len(real)>2 and real[0] in {'我','她','他','我们','他们','猫','土豆','冰箱'} and real[1] in movable and '，' not in words and current['id'] not in {'g022','g058','g063'}:
  ids=orders[0];orders.append([ids[1],ids[0],*ids[2:]])
 # Other high-frequency grammatical variants using exactly the same blocks.
 ids=orders[0];subjects={'我','她','他','我们','他们','主角','反派','猫','土豆','冰箱'}
 if real[0] in {'虽然','因为','如果'} and len(real)>2 and real[1] in subjects:
  orders.append([ids[1],ids[0],*ids[2:]])
 if current['id']=='g058' and real[0] in subjects and '时候' in real:
  cut=real.index('时候')+1
  orders.append([*ids[1:cut],ids[0],*ids[cut:]])
 if current['id']=='g051' and real[0] in subjects and '就' in real and '，' not in words:
  cut=real.index('就')
  orders.append([*ids[1:cut],ids[0],*ids[cut:]])
 if current['id']=='g072' and '，' in words:
  cut=sum(w not in PUNCT for w in words[:words.index('，')])
  if real[cut] in subjects:
   orders.append([ids[cut],*ids[:cut],*ids[cut+1:]])
 if qid=='g043-q02': # 这本书我看不懂 / 我看不懂这本书
  orders.append([*ids[3:],*ids[:3]])
 if qid=='g043-q05': # 我看不懂这个结局 / 这个结局我看不懂
  orders.append([*ids[4:],*ids[:4]])
 orders=list({tuple(order):order for order in orders}.values())
 q={'id':qid,'category':['daily']*4+['anime']*3+['gag']*3}
 q['category']=q['category'][n-1]
 q.update({'prompt_ja':ja,'sentence':{'simplified':full,'traditional':''.join((next(t['traditional'] for t in tokens if t['id']==seg['token_id']) if seg['kind']=='token' else seg['text']) for seg in segments)+final,'pinyin':' '.join(t['pinyin'] for t in tokens)},'tokens':tokens,'segments':segments,'terminal_punctuation':final,'canonical_order':orders[0],'accepted_orders':orders,'explanation_ja':current['explanation_ja'],'answer_note_ja':f'この文では「{sentence}」の順で「{ja}」という意味になります。中心の型は「{current["pattern"]}」。各語の意味と働きを下の一覧で確認できます。','vocabulary_policy':'Daily examples prioritize elementary vocabulary; anime/gag examples may include glossed extension vocabulary.'})
 current['questions'].append(q)
# pedagogical dependencies are stable IDs, not display positions
for l in lessons:
 deps={'g027':['g007','g008'],'g039':['g017','g020'],'g040':['g007','g027'],'g041':['g018','g019'],'g042':['g041'],'g043':['g041'],'g044':['g041'],'g045':['g018','g041'],'g050':['g049'],'g055':['g030'],'g057':['g018','g037'],'g058':['g007'],'g067':['g007'],'g069':['g002','g019']}
 l['prerequisites']=deps.get(l['id'],[])
out={'schema_version':'1.0.0','content_version':'2026.10.24','title':'Little Mandarin Garden','curriculum_basis':'HSK2.0 elementary grammar, approximate in-app learning bands; not an official exhaustive syllabus mapping.','default_script':'traditional','pinyin_policy':'Tone-mark pinyin, standard Mandarin; 一/不 common contextual tone changes, third-tone sandhi kept in dictionary spelling; erhua marked r. Script switch changes orthography only.','lessons':lessons}
(ROOT/'data/curriculum.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
# human-reviewable fully expanded workbook, no spreadsheet dependency
md=['# Little Mandarin Garden 教材全文','72文法・720問。各文法は日常4／オタク3／ギャグ3。級は現行HSKを参考にしたアプリ内の目安です。']
for l in lessons:
 md += [f'\n## {l["id"]} · {l["level_label"]} · {l["title_ja"]}',f'型：{l["pattern"]}',l['explanation_ja']]
 for i,q in enumerate(l['questions'],1):
  md += [f'\n### {i}. { {"daily":"日常","anime":"オタク","gag":"ギャグ"}[q["category"]]}',q['prompt_ja'],q['sentence']['traditional'],q['sentence']['simplified'],q['sentence']['pinyin'],'','|ブロック（繁／簡）|ピンイン|品詞・働き|意味|','|---|---|---|---|']
  md.extend(f'|{t["traditional"]}／{t["simplified"]}|{t["pinyin"]}|{t["pos"]}|{t["meaning_ja"]}|' for t in q['tokens'])
(ROOT/'docs/教材全文.md').write_text('\n\n'.join(md))
(ROOT/'data/lesson-index.json').write_text(json.dumps([{k:v for k,v in l.items() if k!='questions'}|{'question_count':len(l['questions'])} for l in lessons],ensure_ascii=False,indent=2))
print({'lessons':len(lessons),'questions':sum(len(l['questions']) for l in lessons),'tokens':sum(len(q['tokens']) for l in lessons for q in l['questions']),'lexicon':len(lex)})
