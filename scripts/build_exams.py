#!/usr/bin/env python3
# Build same-origin static exam text data for the GitHub Pages app.
from __future__ import annotations
import concurrent.futures as cf
import json, re, time
from pathlib import Path
from urllib.parse import urljoin

import fitz  # PyMuPDF
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data"/"exams"
OUT.mkdir(parents=True,exist_ok=True)
BUILD_FORMAT_VERSION=5

ARCHIVES={
    "8급":37,"7급Ⅱ":36,"7급":35,"6급Ⅱ":34,"6급":33,
    "5급Ⅱ":32,"5급":31,"4급Ⅱ":30,"4급":29,"3급Ⅱ":28,
    "3급":27,"2급":26,"1급":25,"특급Ⅱ":39,"특급":38,
}
SLUG={
    "8급":"8","7급Ⅱ":"7-2","7급":"7","6급Ⅱ":"6-2","6급":"6",
    "5급Ⅱ":"5-2","5급":"5","4급Ⅱ":"4-2","4급":"4","3급Ⅱ":"3-2",
    "3급":"3","2급":"2","1급":"1","특급Ⅱ":"special-2","특급":"special",
}
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
BASE_HEADERS={
    "User-Agent":UA,
    "Accept":"application/pdf,application/octet-stream,text/html;q=0.9,*/*;q=0.8",
    "Accept-Language":"ko-KR,ko;q=0.9,en;q=0.7",
    "Referer":"https://winteriscoming2u.tistory.com/",
}
sess=requests.Session()
sess.headers.update(BASE_HEADERS)

def get(url,timeout=25):
    last=None
    for i in range(3):
        try:
            r=sess.get(url,timeout=timeout,allow_redirects=True,headers=BASE_HEADERS)
            r.raise_for_status()
            return r
        except Exception as e:
            last=e
            time.sleep(.7*(i+1))
    raise last

def archive_links(level,post):
    page=f"https://winteriscoming2u.tistory.com/{post}"
    html=get(page).text
    soup=BeautifulSoup(html,"html.parser")
    found={}
    for a in soup.find_all("a",href=True):
        txt=" ".join(a.stripped_strings)
        m=re.search(r"(\d{2,3})\s*회",txt)
        if not m:
            continue
        rnd=int(m.group(1))
        href=urljoin(page,a["href"])
        if ("daumcdn" in href or "kakaocdn" in href or ".pdf" in href.lower()
            or "attachment" in href.lower()):
            found[rnd]=href
    return page,found

def _rows_from_words(words):
    rows=[]
    for w in words:
        x0,y0,x1,y1,text,*_=w
        text=str(text).strip()
        if not text:
            continue
        row=None
        for rr in rows:
            if abs(rr["y"]-y0)<2.8:
                row=rr
                break
        if row is None:
            row={"y":y0,"items":[]}
            rows.append(row)
        row["items"].append((x0,text))
    rows.sort(key=lambda rr:rr["y"])
    out=[]
    for rr in rows:
        line=" ".join(t for _,t in sorted(rr["items"],key=lambda z:z[0]))
        line=re.sub(r"\s+"," ",line).strip()
        if line:
            out.append(line)
    return out

def page_lines(page,columns=1):
    words=page.get_text("words",sort=False)
    if columns <= 1:
        return _rows_from_words(words)

    width=float(page.rect.width)
    buckets=[[] for _ in range(columns)]
    for w in words:
        x0,y0,x1,y1,*_=w
        cx=(float(x0)+float(x1))*0.5
        idx=min(columns-1,max(0,int(cx/max(width,1e-6)*columns)))
        buckets[idx].append(w)

    out=[]
    for bucket in buckets:
        out.extend(_rows_from_words(bucket))
    return out

def text_via_reader(url):
    # Reader can server-side fetch some attachment hosts that block GitHub runner IPs.
    reader="https://r.jina.ai/"+url
    rr=requests.get(reader,headers={"User-Agent":UA,"Accept":"text/plain"},timeout=45)
    rr.raise_for_status()
    txt=rr.text
    if len(txt)<400:
        raise RuntimeError("reader response too small")
    flat=[]
    pn=1
    for raw in txt.splitlines():
        line=raw.strip()
        if not line:
            continue
        pm=re.match(r"^(?:Page|페이지)\s*(\d+)\b",line,re.I)
        if pm:
            pn=int(pm.group(1))
            continue
        line=re.sub(r"^#{1,6}\s*","",line)
        line=re.sub(r"\[([^\]]+)\]\([^)]*\)",r"\1",line)
        line=re.sub(r"\*\*([^*]+)\*\*",r"\1",line)
        if "|" in line:
            cells=[x.strip() for x in line.split("|") if x.strip()]
            if len(cells)>=2:
                line=" ".join(cells)
        line=re.sub(r"\s+"," ",line).strip()
        if line:
            flat.append({"pn":pn,"line":line})
    if len(flat)<20:
        raise RuntimeError(f"reader text too short: {len(flat)}")
    return flat

def extract_pdf(level,rnd,url):
    dest=OUT/SLUG[level]/f"{rnd}.json"
    if dest.exists() and dest.stat().st_size>500:
        try:
            old=json.loads(dest.read_text(encoding="utf-8"))
            if old.get("format_version")==BUILD_FORMAT_VERSION:
                return level,rnd,"skip","already generated"
        except Exception:
            pass
    errors=[]
    try:
        # Old t1.daumcdn attachments require a browser-like Referer/User-Agent.
        r=get(url,timeout=35)
        data=r.content
        if len(data)<1000:
            raise RuntimeError(f"download too small: {len(data)}")
        # PyMuPDF checks the actual stream, so historical links labeled .hwp are OK
        # when the returned attachment is a PDF.
        doc=fitz.open(stream=data,filetype="pdf")
        flat=[]
        for pn,page in enumerate(doc,start=1):
            page_text=page.get_text("text")
            # Problem pages mention "답안지" in the instruction line too, so do not
            # classify by that word alone. Real answer sheets contain answer/scoring
            # table labels or an explicit 답안지(1)/(2) heading.
            is_answer=(
                "답안란" in page_text or "채점란" in page_text or
                re.search(r"답안지\s*[\(（]\s*[12]\s*[\)）]",page_text) is not None or
                "答案紙" in page_text
            )
            cols=1 if is_answer else 2
            for line in page_lines(page,columns=cols):
                flat.append({"pn":pn,"line":line})
        doc.close()
        if len(flat)<20:
            raise RuntimeError(f"too little text: {len(flat)} lines")
    except Exception as e:
        errors.append("direct="+repr(e))
        try:
            flat=text_via_reader(url)
        except Exception as e2:
            errors.append("reader="+repr(e2))
            return level,rnd,"fail"," | ".join(errors)

    dest.parent.mkdir(parents=True,exist_ok=True)
    payload={
        "format_version":BUILD_FORMAT_VERSION,
        "level":level,"round":rnd,"source":url,
        "pages":max((x["pn"] for x in flat),default=0),
        "flat":flat,
    }
    dest.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    return level,rnd,"ok",len(flat)

def main():
    all_jobs=[]
    grade_meta={}
    for level,post in ARCHIVES.items():
        page,links=archive_links(level,post)
        rounds=sorted(r for r in links if 1<=r<=200 and r not in (88,89))
        grade_meta[level]={"slug":SLUG[level],"archive":page,"source_rounds":rounds}
        for rnd in rounds:
            all_jobs.append((level,rnd,links[rnd]))
        print(level,len(rounds),"source rounds",rounds[:2],rounds[-2:] if rounds else [],flush=True)

    ok=skip=fail=0
    failures=[]
    with cf.ThreadPoolExecutor(max_workers=16) as ex:
        futs=[ex.submit(extract_pdf,*job) for job in all_jobs]
        for i,fut in enumerate(cf.as_completed(futs),start=1):
            level,rnd,state,info=fut.result()
            if state=="ok":
                ok+=1
            elif state=="skip":
                skip+=1
            else:
                fail+=1
                failures.append({"level":level,"round":rnd,"error":info})
                print(f"FAIL {level} {rnd}: {info}",flush=True)
            if i%50==0:
                print(f"{i}/{len(futs)} ok={ok} skip={skip} fail={fail}",flush=True)

    # If every source round was already generated, keep the existing manifest unchanged.
    # This makes verification reruns fast and prevents a pointless manifest-only commit.
    existing_manifest=OUT/"manifest.json"
    if ok==0 and fail==0 and skip==len(all_jobs) and existing_manifest.exists():
        print("DONE all exam JSON already present:", skip, flush=True)
        return

    # Only advertise files that actually exist, so ✓ always means instantly playable.
    manifest={"version":5,"format_version":BUILD_FORMAT_VERSION,"source":"winteriscoming2u.tistory.com","grades":{}}
    for level,meta in grade_meta.items():
        folder=OUT/SLUG[level]
        actual=[]
        if folder.exists():
            for fp in folder.glob("*.json"):
                try:
                    actual.append(int(fp.stem))
                except ValueError:
                    pass
        manifest["grades"][level]={
            "slug":SLUG[level],
            "archive":meta["archive"],
            "rounds":sorted(actual),
            "source_rounds":meta["source_rounds"],
        }

    manifest["generated_at"]=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
    manifest["stats"]={"ok":ok,"skip":skip,"fail":fail,"total":len(all_jobs),"available":ok+skip}
    manifest["failures"]=failures
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print("DONE",manifest["stats"],flush=True)
    if failures:
        print("FIRST_FAILURES",json.dumps(failures[:20],ensure_ascii=False),flush=True)

if __name__=="__main__":
    main()
