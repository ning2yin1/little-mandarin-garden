from pathlib import Path
from PIL import Image
import shutil,json,math,wave,struct,random
R=Path(__file__).resolve().parents[1];S=R/'references/production-originals'
# Lossless atlas slicing only; preserve original RGBA pixels and alpha.
atlas=Image.open(S/'exec-7b4fdab9-54f1-42be-bf14-d6f7b79c4c6a.png').convert('RGBA')
boxes=[(0,0,510,512),(520,0,1000,512),(1005,0,1536,512),(0,512,510,1024),(520,512,970,1024),(970,512,1536,1024)]
for name,box in zip(['welcome','reading','celebrate','thinking','encourage','sleep'],boxes):
 im=atlas.crop(box);bbox=im.getchannel('A').getbbox();im=im.crop(bbox)
 im.thumbnail((588,588),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(640,640));out.alpha_composite(im,((640-im.width)//2,640-im.height-24));out.save(R/f'assets/characters/bear-{name}.png')
friend=Image.open(S/'exec-e317bd88-6820-42b3-b802-3de459bc2436.png').convert('RGBA');w,h=friend.size
for name,box in [('bunny',(0,0,w//2,h)),('sparrow',(w//2,0,w,h))]:
 im=friend.crop(box);im=im.crop(im.getchannel('A').getbbox());im.thumbnail((590,590),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(640,640));out.alpha_composite(im,((640-im.width)//2,640-im.height-24));out.save(R/f'assets/characters/{name}.png')
shutil.copy2(S/'exec-fa2737d8-41bc-4c00-b0aa-1107d51adc61.png',R/'assets/backgrounds/garden-paper.png')
# Compression-only alternative, same composition.
Image.open(R/'assets/backgrounds/garden-paper.png').save(R/'assets/backgrounds/garden-paper.webp',quality=88)
for size in [180,192,512]:
 out=Image.new('RGBA',(size,size),'#fff4df');im=Image.open(R/'assets/characters/bear-welcome.png');im.thumbnail((int(size*.85),int(size*.85)))
 out.alpha_composite(im,((size-im.width)//2,(size-im.height)//2));out.convert('RGB').save(R/f'assets/icons/app-{size}.png')
# UI shell artwork is intentionally text-free; runtime supplies all labels.
def svg(name,body,w=320,h=80):
 path=R/'assets/ui'/f'{name}.svg';path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none">{body}</svg>')
colors={'cream':('#fff9eb','#ccae7b'),'primary':('#d94e70','#af3655'),'selected':('#fff0dc','#c89e59'),'correct':('#f0f6e8','#81a070'),'incorrect':('#fff1f0','#cb7e7b'),'disabled':('#eee9df','#cfc5b5')}
for name,(fill,stroke) in colors.items():
 body=f'<rect x="2" y="3" width="316" height="72" rx="18" fill="{fill}" stroke="{stroke}" stroke-width="1.7"/><rect x="7" y="8" width="306" height="62" rx="14" stroke="{stroke}" stroke-opacity=".35" stroke-dasharray="3 4"/><path d="M20 14Q160 9 300 14" stroke="#fff" stroke-opacity=".45"/>'
 svg('button-'+name,body)
for name,(fill,stroke) in colors.items():
 svg('token-'+name,f'<rect x="3" y="6" width="114" height="75" rx="12" fill="#c9b58e" opacity=".18"/><rect x="3" y="2" width="114" height="75" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/><path d="M14 10Q60 7 106 10" stroke="{stroke}" stroke-opacity=".20"/>',120,84)
svg('paper-panel','<path d="M16 4Q160 0 304 4Q319 6 316 22L318 218Q316 237 300 236L20 237Q2 237 4 219L3 22Q2 6 16 4Z" fill="#fff9ed" stroke="#cfb98c" stroke-width="1.4"/><path d="M15 15H305M15 225H305" stroke="#ddceb1" stroke-dasharray="3 5"/>',320,240)
svg('title-ribbon','<path d="M22 15L5 7L12 38L4 65L37 60H284L315 67L307 37L317 10L291 15Z" fill="#fff2ce" stroke="#cfb280"/><path d="M35 20H285M35 55H285" stroke="#dbc396" stroke-dasharray="3 4"/>',320,80)
svg('navigation-gingham','<defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><path fill="#fff9eb" d="M0 0h24v24H0z"/><path fill="#efd5a0" opacity=".22" d="M0 0h12v24H0zM0 0h24v12H0z"/></pattern></defs><rect x="1" y="1" width="318" height="78" rx="20" fill="url(#g)" stroke="#d3b78b"/>')
svg('progress-track','<rect x="1" y="4" width="318" height="8" rx="4" fill="#e5dac6"/>',320,16)
svg('progress-fill','<rect x="1" y="4" width="318" height="8" rx="4" fill="#d94e70"/>',320,16)
svg('answer-slot','<rect x="2" y="2" width="116" height="80" rx="12" stroke="#cfb98c" stroke-width="1.4" stroke-dasharray="4 5" fill="#fff9eb" fill-opacity=".5"/>',120,84)
svg('divider','<path d="M0 8H135M185 8H320" stroke="#d2bd95" stroke-dasharray="2 5"/><path d="M160 12C143 3 153-4 160 3C167-4 177 3 160 12" fill="#d9697c"/>',320,16)
svg('check-pattern','<defs><pattern id="c" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#fff9eb"/><path d="M0 0h16v32H0zM0 0h32v16H0z" fill="#d6dfc7" opacity=".35"/></pattern></defs><path fill="url(#c)" d="M0 0h320v80H0z"/>')
paths={
'home':'M3 11L12 3L21 11M5 10V21H10V15H14V21H19V10',
'book':'M4 4H11Q13 4 13 6V21Q11 19 4 20ZM13 6Q15 3 21 4V20Q15 19 13 21',
'leaf':'M4 20Q1 2 21 3Q22 21 4 20ZM4 20L17 7',
'settings':'M12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8M12 2V5M12 19V22M2 12H5M19 12H22M5 5L7 7M17 17L19 19M5 19L7 17M17 7L19 5',
'search':'M10 3A7 7 0 1 0 10 17A7 7 0 1 0 10 3M15 15L22 22',
'sound':'M3 9H7L12 5V19L7 15H3ZM16 8Q21 12 16 16M19 4Q27 12 19 20',
'sound-off':'M3 9H7L12 5V19L7 15H3ZM17 9L23 15M23 9L17 15',
'close':'M5 5L19 19M19 5L5 19',
'back':'M15 4L7 12L15 20',
'next':'M9 4L17 12L9 20',
'arrow':'M3 12H21M15 6L21 12L15 18',
'reset':'M5 8A8 8 0 1 1 4 16M5 3V9H11',
'check':'M4 12L9 18L21 5',
'heart':'M12 21C-5 10 1-3 12 6C23-3 29 10 12 21Z',
'star':'M12 2L15 8L22 9L17 14L18 22L12 18L6 22L7 14L2 9L9 8Z',
'sprout':'M12 22V11M12 14Q1 14 3 4Q13 4 12 14ZM12 10Q12 1 22 2Q22 12 12 10Z',
'flower':'M12 8C5-2 1 8 8 12C-2 17 8 24 12 16C17 25 25 17 16 12C25 6 17-2 12 8ZM12 9A3 3 0 1 0 12 15A3 3 0 1 0 12 9',
'play':'M7 3L21 12L7 21Z',
'pause':'M7 4V20M17 4V20',
'grip':'M8 5H9M15 5H16M8 12H9M15 12H16M8 19H9M15 19H16',
'filter':'M3 5H21M6 12H18M9 19H15',
'chevron-down':'M5 9L12 16L19 9',
'upload':'M12 16V3M6 9L12 3L18 9M3 16V21H21V16',
'download':'M12 3V16M6 10L12 16L18 10M3 17V21H21V17',
'bookmark':'M6 3H18V22L12 17L6 22Z',
'calendar':'M3 5H21V22H3ZM7 2V8M17 2V8M3 10H21',
'correct-circle':'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M7 12L10 16L18 8',
'helpful-heart':'M12 21C-5 10 1-3 12 6C23-3 29 10 12 21ZM8 12H16M12 8V16'
}
for name,path in paths.items():
 (R/f'assets/icons/{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#735b49" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="{path}"/></svg>')
# Soft original synthesized SFX, generated offline with no external sound recordings.
random.seed(20261024);sr=22050
sounds={'tap':(.075,[(610,.14)],.012),'remove':(.075,[(460,.12)],.01),'insert':(.10,[(730,.10),(980,.035)],.008),'correct':(.40,[(523.25,.11),(659.25,.09),(783.99,.075)],0),'incorrect':(.22,[(260,.10),(246,.045)],0),'complete':(.70,[(523.25,.08),(659.25,.08),(783.99,.08),(1046.5,.06)],0)}
for name,(duration,tones,noise) in sounds.items():
 data=[]
 for i in range(int(sr*duration)):
  t=i/sr;attack=min(1,t/.012);decay=math.exp(-t/(duration*.35));env=attack*decay*(1-t/duration)
  value=sum(amp*math.sin(2*math.pi*f*t) for f,amp in tones)*env
  value+=random.uniform(-noise,noise)*env
  data.append(int(max(-.65,min(.65,value))*32767))
 with wave.open(str(R/f'assets/audio/{name}.wav'),'wb') as out:
  out.setnchannels(1);out.setsampwidth(2);out.setframerate(sr);out.writeframes(struct.pack('<'+'h'*len(data),*data))
(R/'assets/audio/bgm-slot.json').write_text(json.dumps({'enabled':False,'src':None,'loop':True,'volume':0.12,'note':'Add user-supplied BGM later; no automatic remote music.'},ensure_ascii=False,indent=2))
manifest=[]
for p in sorted((R/'assets').rglob('*')):
 if not p.is_file():continue
 item={'path':str(p.relative_to(R)),'bytes':p.stat().st_size}
 if p.suffix in ['.png','.webp']:
  im=Image.open(p);item.update(width=im.width,height=im.height,mode=im.mode)
 manifest.append(item)
(R/'data/asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('assets',len(manifest))
