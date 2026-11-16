#!/usr/bin/env python3
"""Compile the user's VGCard archive to a small, static web catalog.

Usage: python scripts/prepareVanguardData.py /path/VGCard_Content_Backup.zip
No network requests are made. Card effects and missing detail fields are never inferred.
"""
import argparse, collections, hashlib, json, re, shutil, zipfile
from pathlib import Path
from urllib.parse import urlsplit

FIELDS=['id','number','name','nameJp','pack','rarity','series','grade','power','shield','nations','clans','races','types','skills','effect','imageUrl','imagePath','hasImage','detailFile','sourceUrl']
BASE='https://vgcard.yimieji.com/'
def arr(v):
    if v is None or v=='':return []
    return [str(x) for x in (v if isinstance(v,list) else [v]) if x is not None and str(x)!='']
def text(v):return ' / '.join(arr(v))
def image(url):
    if not url:return ('','')
    url=re.sub(r'^http://','https://',str(url));p=urlsplit(url)
    path=p.path[len('/data/'):] if p.hostname=='vg-assets.yimieji.com' and p.path.startswith('/data/') else ''
    return url,path
def dump(path,v):path.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('archive',type=Path);ap.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'public/data/vanguard');a=ap.parse_args()
    z=zipfile.ZipFile(a.archive);prefix='VGCard_Offline_Archive/data/'
    read=lambda name:json.loads(z.read(prefix+name+'.json'))
    records,packs,articles,feedback,meta=[read(n) for n in ['cards','packs','articles','feedback','meta']]
    out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);details=out/'details';details.mkdir(exist_ok=True)
    for p in details.glob('*.json'):p.unlink()
    effects=[''];effect_ids={'':0};arrays=[[]];array_ids={'[]':0};array_fields={'nations','clans','races','types','skills'};rows=[];catalog=[];groups=collections.defaultdict(dict);pack_counts=collections.Counter();series_counts=collections.Counter()
    # These fields have an exact equivalent in the index. Everything else remains
    # in the detail shard, including all saved original illustration/flavor/notes.
    indexed_fields={'serial','scName','sc_name','japName','jap_name','vg_rarity_id','rarity','vg_grade','grade','vg_power','power','vg_shield_id','vgd_nation','vg_clan_id','clan','vg_race_id','race','vg_unit_id','card_type','vg_skill_id','effect','package','images'}
    for rec in records:
        c=rec['card'];zero=rec['series']=='ZERO';pack=str(rec['pack']);pack_counts[pack]+=1;series_counts[rec['series']]+=1
        ims=[]
        for im in rec.get('images',[]):
            url,path=image(im.get('url'));ims.append({'url':url,'imagePath':path,'label':im.get('label',''),'available':bool(im.get('local'))})
        best=next((im for im in ims if im['available']),ims[0] if ims else {})
        shard=hashlib.sha256(('zero:' if zero else 'vg:').encode()+pack.encode()).hexdigest()[:16]
        effect=str(c.get('effect') or '')
        if effect not in effect_ids:effect_ids[effect]=len(effects);effects.append(effect)
        card={
          'id':rec['key'],'number':str(c.get('serial','')),'name':str(rec.get('name','')),'nameJp':str(c.get('japName') or c.get('jap_name') or ''),
          'pack':pack,'rarity':text(c.get('vg_rarity_id') if not zero else c.get('rarity')),'series':rec['series'],
          'grade':str(c.get('vg_grade',c.get('grade',''))),'power':str(c.get('vg_power',c.get('power',''))),'shield':str(c.get('vg_shield_id','')),
          'nations':arr(c.get('vgd_nation') or c.get('nation') or c.get('vg_nation')),'clans':arr(c.get('vg_clan_id') or c.get('clan')),
          'races':arr(c.get('vg_race_id') or c.get('race')),'types':arr(c.get('vg_unit_id') or c.get('card_type')),'skills':arr(c.get('vg_skill_id')),
          'effect':effect,'imageUrl':best.get('url',''),'imagePath':best.get('imagePath',''),'hasImage':bool(best.get('available')),
          'detailFile':'details/'+shard+'.json','sourceUrl':rec.get('url','')}
        index_row=[]
        for field in FIELDS:
            value=card[field]
            if field=='effect':value=effect_ids[effect]
            elif field in array_fields:
                array_key=json.dumps(value,ensure_ascii=False,separators=(',',':'))
                if array_key not in array_ids:array_ids[array_key]=len(arrays);arrays.append(value)
                value=array_ids[array_key]
            elif field=='imageUrl' and card['imagePath']:value=''
            elif field=='sourceUrl' and value.startswith(BASE):value=value[len(BASE)-1:]
            index_row.append(value)
        rows.append(index_row);catalog.append(card)
        extra={k:v for k,v in c.items() if k not in indexed_fields}
        stored_images=[{**im,'url':'' if im['imagePath'] else im['url']} for im in ims]
        groups[shard][card['id']]={'fields':extra,'images':stored_images,'sourceIds':rec.get('archive_source_ids',{})}
    normalized_packs=[]
    for p in packs:
        code=str(p.get('pack_prefix',''));zero=p.get('archive_series_name')=='ZERO' or bool(re.fullmatch(r'20\d\d-\d\d',code))
        normalized_packs.append({'id':code,'code':code,'name':p.get('pack_name') or code,'nameJp':p.get('pack_japName',''),'releaseDate':p.get('pack_releaseDate',''),'description':p.get('pack_remark',''),'series':p.get('archive_series_name',''),'isZero':zero,'cardCount':pack_counts[code],'sourceUrl':BASE+('search' if zero else 'Package/'+code)})
    normalized_articles=[]
    for art in articles:
        url=art.get('url','');title=art.get('title','')
        category='規則' if '/page/rule' in url or '/posts/rules/' in url or any(w in title for w in ['规则导航','禁限卡','赠礼标记']) else ('公告' if '/posts/news/' in url else '原站資料')
        normalized_articles.append({'id':art['key'],'title':title,'text':art.get('text',''),'html':art.get('html',''),'sourceUrl':url,'date':art.get('updated',''),'category':category,'author':art.get('author','')})
    public_feedback=[{k:v for k,v in r.items() if k in {'id','status','nick','content','link','last_reply','created_at','updated_at'}} for r in feedback]
    wanted=['D-BT10/015','DZ-LBT03/009','DZ-BT17/001','D-BT01/001','V-BT01/001','BT01/001','G-BT01/001','D-SD01/001'];featured=[]
    for number in wanted:
        card=next((c for c in catalog if c['number']==number and c['hasImage']),None)
        if card and card['id'] not in {r['id'] for r in featured}:featured.append(card)
    for card in catalog:
        if len(featured)>=8:break
        if card['series']=='D系列' and card['hasImage'] and card['id'] not in {r['id'] for r in featured}:featured.append(card)
    summary={'snapshotDate':'2026-11-13','capturedAt':meta.get('captured_at',''),'totalCards':len(catalog),'generalPrints':sum(c['series']!='ZERO' for c in catalog),'zeroCards':series_counts['ZERO'],'generalPacks':sum(not p['isZero'] for p in normalized_packs),'zeroPacks':sum(p['isZero'] for p in normalized_packs),'articles':len(normalized_articles),'feedback':len(public_feedback),'seriesCounts':dict(series_counts),'featuredCards':featured,'sourceUrl':BASE,'sourceName':'THE一滅寂｜先導者卡牌資料站','coverage':{'cardsWithEffect':sum(bool(c['effect']) for c in catalog),'cardsWithArchivedImage':sum(c['hasImage'] for c in catalog),'fullDetailsCaptured':meta.get('captured_full_detail_responses',177),'isComplete':False,'note':'主要卡文與卡包目錄已收錄；部分印次的畫師、台詞、備註及補充解說尚未收錄。部分原始卡圖連結已失效。'}}
    dump(out/'cards-index.json',{'schemaVersion':2,'columns':FIELDS,'effects':effects,'arrayFields':sorted(array_fields),'arrayValues':arrays,'rows':rows})
    dump(out/'packs.json',normalized_packs);dump(out/'articles.json',normalized_articles);dump(out/'feedback.json',public_feedback);dump(out/'summary.json',summary)
    for key,value in groups.items():dump(details/(key+'.json'),value)
    ids=[c['id'] for c in catalog]
    assert len(ids)==32453 and len(set(ids))==32453
    assert len(normalized_packs)==315 and len(normalized_articles)==53 and len(public_feedback)==426
    collisions=[c for c in catalog if c['number']=='D-MBX/01'];assert len(collisions)==2 and len({c['pack'] for c in collisions})==2
    assert all(not any(k in f for k in ['mail','email']) for f in public_feedback)
    files=[p for p in out.rglob('*.json') if p.name!='build-report.json'];size=sum(p.stat().st_size for p in files)
    report={'cardRecords':len(ids),'uniqueIds':len(set(ids)),'generalPrints':summary['generalPrints'],'zeroCards':summary['zeroCards'],'packs':len(normalized_packs),'articles':len(normalized_articles),'feedback':len(public_feedback),'detailShards':len(groups),'publicBytes':size,'measurement':'Generated data JSON, excluding this report.','largestFileBytes':max(p.stat().st_size for p in files),'duplicateNumberAcrossPacksPreserved':[c['id'] for c in collisions],'effectInference':False,'sourceArchive':a.archive.name}
    dump(out/'build-report.json',report);print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
