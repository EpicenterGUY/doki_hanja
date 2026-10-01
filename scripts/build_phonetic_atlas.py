#!/usr/bin/env python3
# Build DOKI's PDF-style phonetic-component atlas for every Korean graded Hanja.
# Sources:
# - DOKI data/hanja.csv: Korean grade / official Korean reading metadata.
# - Make Me a Hanzi dictionary.txt: decomposition + etymology + explicit phonetic/semantic components.
# - BabelStone IDS.TXT: structural fallback for characters not covered by Make Me a Hanzi.
# - KANJIDIC2: Japanese on/kun readings for both Joyo and non-Joyo characters.
from __future__ import annotations

import csv, gzip, io, json, re, unicodedata, urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
HANJA=ROOT/"data"/"hanja.csv"
OUT=ROOT/"data"/"hanja-structure.json"
JOYO=ROOT/"data"/"japanese"/"joyo.tsv"
MEXT=ROOT/"data"/"japanese"/"mext-onkun-2017.json"

MMH_URL="https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt"
IDS_URL="https://www.babelstone.co.uk/CJK/IDS.TXT"
KANJIDIC_URL="https://www.edrdg.org/pub/Nihongo/kanjidic2.xml.gz"

UA="DOKI-Hanja/2.20 phonetic-atlas-builder"
IDC_RE=re.compile(r"[⿰-⿿〾㇯]")
HAN_RE=re.compile(r"[\u2e80-\u2fff\u3400-\u9fff\uf900-\ufaff\U00020000-\U000323af]")

RADICAL_EQ={
    "人":{"人","亻"},"水":{"水","氵","氺"},"心":{"心","忄","⺗"},"手":{"手","扌","龵"},
    "火":{"火","灬"},"言":{"言","訁","讠"},"糸":{"糸","糹","纟"},"金":{"金","釒","钅"},
    "食":{"食","飠","饣"},"犬":{"犬","犭"},"衣":{"衣","衤"},"示":{"示","礻"},
    "阜":{"阜","阝"},"邑":{"邑","阝"},"玉":{"玉","王"},"肉":{"肉","⺼"},
    "艸":{"艸","艹","䒑"},"辵":{"辵","辶","⻌"},"刀":{"刀","刂"},"攴":{"攴","攵"},
    "爪":{"爪","爫"},"竹":{"竹","⺮"},"老":{"老","耂"},"网":{"网","罒","⺳"},
    "足":{"足","𧾷"},"邑":{"邑","阝"},"阜":{"阜","阝"},"月":{"月"},
}

INDICATIVE=set("一二三上下本末刃中寸甘亦朱旦立凹凸")
LOAN=set("我自來来萬万北西東东其焉莫")
DERIVATIVE=set("老考")
DISPUTED=set("影淚泪幕盲盟犯欲友修座差笛堤怨")

# High-confidence families that must stay grouped even when an upstream decomposition source
# changes or omits the phonetic tag. Keep these as structural corrections, not sound guesses.
PHONETIC_OVERRIDES={
    "假":{"p":"叚","s":"人","f":"형성","q":"확정","src":"manual","d":"⿰亻叚"},
    "蝦":{"p":"叚","s":"虫","f":"형성","q":"확정","src":"manual","d":"⿰虫叚"},
    "鰕":{"p":"叚","s":"魚","f":"형성","q":"확정","src":"manual","d":"⿰魚叚"},
    "暇":{"p":"叚","s":"日","f":"형성","q":"확정","src":"manual","d":"⿰日叚"},
    "瑕":{"p":"叚","s":"王","f":"형성","q":"확정","src":"manual","d":"⿰王叚"},
    "遐":{"p":"叚","s":"辶","f":"형성","q":"확정","src":"manual","d":"⿺辶叚"},
    "霞":{"p":"叚","s":"雨","f":"형성","q":"확정","src":"manual","d":"⿱雨叚"},
    "葭":{"p":"叚","s":"艹","f":"형성","q":"확정","src":"manual","d":"⿱艹叚"},
    "偈":{"p":"曷","s":"人","f":"형성","q":"확정","src":"manual","d":"⿰亻曷"},
    "鍼":{"p":"咸","s":"金","f":"형성","q":"확정","src":"manual","d":"⿰釒咸"},
    "話":{"p":"舌","s":"言","f":"형성","q":"확정","src":"manual","d":"⿰言舌"},
    "揮":{"p":"軍","s":"手","f":"형성","q":"확정","src":"manual","d":"⿰扌軍"},
    "禪":{"p":"單","s":"示","f":"형성","q":"확정","src":"manual","d":"⿰礻單"},
    "團":{"p":"專","s":"囗","f":"형성","q":"확정","src":"manual","d":"⿴囗專"},
    "待":{"p":"寺","s":"彳","f":"형성","q":"확정","src":"manual","d":"⿰彳寺"},
    "緖":{"p":"者","s":"糸","f":"형성","q":"확정","src":"manual","d":"⿰糹⿻者丶"},
    "渦":{"p":"咼","s":"水","f":"형성","q":"확정","src":"manual","d":"⿰氵咼"},
    "濁":{"p":"蜀","s":"水","f":"형성","q":"확정","src":"manual","d":"⿰氵蜀"},
    "秤":{"p":"平","s":"禾","f":"형성","q":"확정","src":"manual","d":"⿰禾平"},
    "況":{"p":"兄","s":"水","f":"형성","q":"확정","src":"manual","d":"⿰氵兄"},
    "靄":{"p":"謁","s":"雨","f":"형성","q":"확정","src":"manual","d":"⿱雨謁"},
    "鞏":{"p":"巩","s":"革","f":"형성","q":"확정","src":"manual","d":"⿱巩革"},
    "顆":{"p":"果","s":"頁","f":"형성","q":"확정","src":"manual","d":"⿰果頁"},
    "屬":{"p":"蜀","s":"尸","f":"형성","q":"확정","src":"manual","d":"⿸尸⿱氺蜀"},
    "稱":{"p":"爯","s":"禾","f":"형성","q":"확정","src":"manual","d":"⿰禾爯"},
}

def fetch(url:str)->bytes:
    req=urllib.request.Request(url,headers={"User-Agent":UA})
    with urllib.request.urlopen(req,timeout=90) as r:
        return r.read()

def load_hanja():
    out=[]
    with HANJA.open(encoding="utf-8-sig",newline="") as f:
        for row in csv.DictReader(f):
            ch=(row.get("hanja") or "").strip()
            if not ch: continue
            sounds=[]
            main=(row.get("main_sound") or "").strip()
            if main:sounds.append(main)
            try:
                m=json.loads((row.get("meaning") or "").replace("'","\""))
                for group in m:
                    if isinstance(group,list) and len(group)>1:
                        vals=group[1] if isinstance(group[1],list) else [group[1]]
                        sounds.extend(str(x).strip() for x in vals if str(x).strip())
            except Exception:
                pass
            out.append({
                "c":ch,"sound":main,"sounds":list(dict.fromkeys(sounds)),
                "level":(row.get("level") or "").strip(),
                "radical":(row.get("radical") or "").strip(),
                "strokes":int(row.get("total_strokes") or row.get("strokes") or 0),
            })
    return out

def load_mmh():
    mp={}
    text=fetch(MMH_URL).decode("utf-8")
    for line in text.splitlines():
        try:
            x=json.loads(line)
            ch=x.get("character")
            if ch:mp[ch]=x
        except Exception:
            pass
    return mp

def load_ids():
    mp={}
    text=fetch(IDS_URL).decode("utf-8-sig",errors="replace")
    for line in text.splitlines():
        if not line or line.startswith("#"):continue
        p=line.split("\t")
        if len(p)<3:continue
        ch=p[1]
        seq=""
        for field in p[2:]:
            m=re.match(r"\^(.+?)\$",field)
            if m:
                seq=m.group(1);break
        if seq:mp[ch]=seq
    return mp

def kana_fold(v):
    out=[]
    for ch in (v or "").replace(".","").replace("-",""):
        cp=ord(ch)
        out.append(chr(cp-0x60) if 0x30A1<=cp<=0x30F6 else ch)
    return "".join(out)

def load_japanese_official():
    joyo=set()
    with JOYO.open(encoding="utf-8-sig",newline="") as f:
        for row in csv.DictReader(f,delimiter="\t"):
            ch=(row.get("New") or "").strip()
            if ch:joyo.add(ch)
    data=json.loads(MEXT.read_text(encoding="utf-8"))
    official={}
    for e in data.get("entries",[]):
        ch=e.get("kanji")
        if not ch:continue
        on=[];kun=[]
        for r in e.get("readings",[]):
            v=(r.get("reading") or "").strip()
            if not v:continue
            if r.get("kind")=="on":on.append(v)
            elif r.get("kind")=="kun":kun.append(v)
        official[ch]={"on":list(dict.fromkeys(on)),"kun":list(dict.fromkeys(kun))}
    return joyo,official

def load_kanjidic(wanted):
    result={}
    raw=fetch(KANJIDIC_URL)
    root=ET.fromstring(gzip.decompress(raw))
    wanted=set(wanted)
    for node in root.findall("character"):
        lit=node.findtext("literal") or ""
        if lit not in wanted:continue
        on=[];kun=[]
        rm=node.find("reading_meaning")
        if rm is not None:
            for rg in rm.findall("rmgroup"):
                for r in rg.findall("reading"):
                    t=r.attrib.get("r_type")
                    v=(r.text or "").strip()
                    if not v:continue
                    if t=="ja_on":on.append(v)
                    elif t=="ja_kun":kun.append(v)
        result[lit]={"on":list(dict.fromkeys(on)),"kun":list(dict.fromkeys(kun))}
    return result

def norm_char(ch):
    n=unicodedata.normalize("NFKC",ch)
    return n if len(n)==1 else ch

def ids_parts(ids):
    if not ids:return []
    s=IDC_RE.sub("",ids)
    s=re.sub(r"\{\d+\}","",s)
    return [x for x in s if HAN_RE.match(x)]

def radical_forms(rad):
    if not rad:return set()
    for base,forms in RADICAL_EQ.items():
        if rad==base or rad in forms:return set(forms)|{base}
    return {rad}

def hangul_parts(s):
    if not s:return None
    ch=s[0]
    cp=ord(ch)
    if not 0xAC00<=cp<=0xD7A3:return None
    n=cp-0xAC00
    return (n//588,(n%588)//28,n%28)

def sound_score(a,b):
    if not a or not b:return 0
    if a==b:return 100
    pa,pb=hangul_parts(a),hangul_parts(b)
    if not pa or not pb:return 0
    score=0
    if pa[0]==pb[0]:score+=16
    if pa[1]==pb[1]:score+=28
    if pa[2]==pb[2]:score+=6
    # historically related initials often move within these groups.
    near=[{0,15,16},{2,3,12},{5,6},{7,8,17},{9,10,11},{1,4}]
    if any(pa[0] in g and pb[0] in g for g in near):score+=8
    return score

def pinyin_base(v):
    # enough for candidate tie-breaking; accents are stripped.
    v=unicodedata.normalize("NFD",v or "")
    return "".join(ch for ch in v.lower() if ch.isalpha() and not unicodedata.combining(ch))

def candidate_score(target,cand,meta,mmh):
    score=0
    for a in target.get("sounds") or [target.get("sound")]:
        for b in (meta.get(cand,{}).get("sounds") or []):
            score=max(score,sound_score(a,b))
    te=mmh.get(target["c"]) or mmh.get(norm_char(target["c"])) or {}
    ce=mmh.get(cand) or {}
    tp=[pinyin_base(x) for x in te.get("pinyin",[])]
    cp=[pinyin_base(x) for x in ce.get("pinyin",[])]
    if set(tp)&set(cp):score+=22
    elif tp and cp and any(a[:1]==b[:1] for a in tp for b in cp):score+=4
    return score

def formation_for(ch,etype,phonetic,parts):
    if ch in DISPUTED:return "이견"
    if ch in DERIVATIVE:return "전주"
    if ch in LOAN:return "가차"
    if ch in INDICATIVE:return "지사"
    if etype=="pictographic":return "상형"
    if etype=="pictophonetic" or (phonetic and phonetic!=ch):return "형성"
    if etype=="ideographic":return "회의"
    if len(parts)>=2:return "회의"
    return "상형·지사"

def main():
    rows=load_hanja()
    meta={x["c"]:x for x in rows}
    # NFKC aliases let compatibility ideographs inherit structural data.
    for x in rows:
        n=norm_char(x["c"])
        if n not in meta:meta[n]=x
    mmh=load_mmh()
    ids=load_ids()
    jp=load_kanjidic([x["c"] for x in rows])
    joyo,official=load_japanese_official()

    records={}
    for x in rows:
        ch=x["c"];base=norm_char(ch)
        e=mmh.get(ch) or mmh.get(base) or {}
        et=(e.get("etymology") or {})
        decomp=e.get("decomposition") or ids.get(ch) or ids.get(base) or ""
        semantic=str(et.get("semantic") or x.get("radical") or "").strip()
        phon=str(et.get("phonetic") or "").strip()
        source="mmh" if phon else ""
        confidence="확정" if phon else ""
        parts=ids_parts(decomp)

        # Exclude the semantic/radical side then score the remaining structural pieces.
        if not phon:
            banned=radical_forms(x.get("radical"))|radical_forms(semantic)
            cands=[]
            for p in parts:
                if p==ch or p in banned or p in "一丨丶丿乀乁亅":continue
                if p not in cands:cands.append(p)
            ranked=sorted(((candidate_score(x,p,meta,mmh),p) for p in cands),reverse=True)
            if ranked and ranked[0][0]>=28:
                phon=ranked[0][1];source="ids";confidence="추정"

        # PDF-style atlas has no unclassified hole: non-phonetic primitives become
        # their own head, clearly labelled as an independent/root form.
        if not phon:
            phon=ch;source="self";confidence="독립"

        rec={
            "p":phon,"s":semantic,"f":formation_for(ch,et.get("type"),phon,parts),
            "q":confidence,"src":source,
        }
        if decomp:rec["d"]=decomp
        j=jp.get(ch) or jp.get(base) or {"on":[],"kun":[]}
        off=official.get(ch) or official.get(base) or {"on":[],"kun":[]}
        is_joyo=ch in joyo or base in joyo
        rec["j"]="상용" if is_joyo else "표외"
        if is_joyo:
            if off["on"]:rec["on"]=off["on"]
            if off["kun"]:rec["kun"]=off["kun"]
            off_on={kana_fold(x) for x in off["on"]}
            off_kun={kana_fold(x) for x in off["kun"]}
            onx=[x for x in j["on"] if kana_fold(x) not in off_on]
            kunx=[x for x in j["kun"] if kana_fold(x) not in off_kun]
            if onx:rec["onx"]=onx
            if kunx:rec["kunx"]=kunx
        else:
            if j["on"]:rec["onx"]=j["on"]
            if j["kun"]:rec["kunx"]=j["kun"]
        records[ch]=rec

    # Apply audited structural corrections after all automatic inference so rebuilds cannot
    # split a known family such as 假·蝦·鰕 into separate phonetic heads.
    for ch,over in PHONETIC_OVERRIDES.items():
        if ch in records:
            records[ch].update(over)

    # A phonetic component can itself have a phonetic component, e.g. 京 → 景 → 憬.
    def chain(ch):
        out=[];seen={ch};cur=ch
        for _ in range(5):
            r=records.get(cur)
            if not r:break
            p=r.get("p")
            if not p or p==cur or p in seen:break
            out.append(p);seen.add(p);cur=p
        return list(reversed(out))
    for ch,r in records.items():
        c=chain(ch)
        if c:r["chain"]=c

    payload={
        "version":6,
        "format":"pdf-phonetic-atlas",
        "records":records,
        "stats":{
            "total":len(rows),
            "explicit":sum(1 for r in records.values() if r["q"]=="확정"),
            "inferred":sum(1 for r in records.values() if r["q"]=="추정"),
            "independent":sum(1 for r in records.values() if r["q"]=="독립"),
            "jpReadings":sum(1 for r in records.values() if r.get("on") or r.get("kun") or r.get("onx") or r.get("kunx")),
            "joyo":sum(1 for r in records.values() if r.get("j")=="상용"),
            "hyogai":sum(1 for r in records.values() if r.get("j")=="표외"),
        },
        "sources":{
            "korean":"DOKI data/hanja.csv (한국어문회 급수/훈음 데이터)",
            "structure":"Make Me a Hanzi + BabelStone IDS structural fallback",
            "japanese":"KANJIDIC2 Japanese readings",
        }
    }
    OUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(json.dumps(payload["stats"],ensure_ascii=False))
    print("wrote",OUT,OUT.stat().st_size,"bytes")

if __name__=="__main__":
    main()
