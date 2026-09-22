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
UA={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"}
sess=requests.Session(); sess.headers.update(UA)

def get(url,timeout=35):
    last=None
    for i in range(4):
        try:
            r=sess.get(url,timeout=timeout,allow_redirects=True)
            r.raise_for_status()
            return r
        except Exception as e:
            last=e; time.sleep(1.5*(i+1))
    raise last

def archive_links(level,post):
    page=f"https://winteriscoming2u.tistory.com/{post}"
    html=get(page).text
    soup=BeautifulSoup(html,"html.parser")
    found={}
    for a in soup.find_all("a",href=True):
        txt=" ".join(a.stripped_strings)
        m=re.search(r"(\d{2,3})\s*회",txt)
        if not m: continue
        rnd=int(m.group(1))
        href=urljoin(page,a["href"])
        # Attachments are commonly on daumcdn / kakaocdn; keep PDF-ish attachment URLs.
        if ("daumcdn" in href or "kakaocdn" in href or ".pdf" in href.lower()
            or "attachment" in href.lower() or "tistory" in href.lower()):
            found[rnd]=href
    return page,found

def page_lines(page):
    words=page.get_text("words",sort=True)
    rows=[]
    for w in words:
        x0,y0,x1,y1,text,*_=w
        text=str(text).strip()
        if not text: continue
        row=None
        for r in rows:
            if abs(r["y"]-y0)<2.8:
                row=r;break
        if row is None:
            row={"y":y0,"items":[]};rows.append(row)
        row["items"].append((x0,text))
    rows.sort(key=lambda r:r["y"])
    out=[]
    for r in rows:
        line=" ".join(t for _,t in sorted(r["items"],key=lambda z:z[0]))
        line=re.sub(r"\s+"," ",line).strip()
        if line: out.append(line)
    return out

def extract_pdf(level,rnd,url):
    dest=OUT/SLUG[level]/f"{rnd}.json"
    if dest.exists() and dest.stat().st_size>500:
        return level,rnd,"skip",None
    try:
        data=get(url,timeout=50).content
        if len(data)<1000:
            raise RuntimeError(f"download too small: {len(data)}")
        doc=fitz.open(stream=data,filetype="pdf")
        flat=[]
        for pn,page in enumerate(doc,start=1):
            for line in page_lines(page):
                flat.append({"pn":pn,"line":line})
        doc.close()
        if len(flat)<20:
            raise RuntimeError(f"too little text: {len(flat)} lines")
        dest.parent.mkdir(parents=True,exist_ok=True)
        payload={
            "level":level,"round":rnd,"source":url,
            "pages":max((x["pn"] for x in flat),default=0),
            "flat":flat,
        }
        dest.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
        return level,rnd,"ok",len(flat)
    except Exception as e:
        return level,rnd,"fail",str(e)

def main():
    all_jobs=[]
    manifest={"version":1,"source":"winteriscoming2u.tistory.com","grades":{}}
    for level,post in ARCHIVES.items():
        page,links=archive_links(level,post)
        rounds=sorted(r for r in links if 1<=r<=200)
        manifest["grades"][level]={"slug":SLUG[level],"archive":page,"rounds":rounds}
        for rnd in rounds:
            all_jobs.append((level,rnd,links[rnd]))
        print(level,len(rounds),"rounds",rounds[:2],rounds[-2:] if rounds else [])

    ok=skip=fail=0
    failures=[]
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        futs=[ex.submit(extract_pdf,*job) for job in all_jobs]
        for i,f in enumerate(cf.as_completed(futs),start=1):
            level,rnd,state,info=f.result()
            if state=="ok": ok+=1
            elif state=="skip": skip+=1
            else:
                fail+=1;failures.append({"level":level,"round":rnd,"error":info})
            if i%25==0 or state=="fail":
                print(f"{i}/{len(futs)} ok={ok} skip={skip} fail={fail} :: {level} {rnd} {state}")

    manifest["generated_at"]=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
    manifest["stats"]={"ok":ok,"skip":skip,"fail":fail,"total":len(all_jobs)}
    manifest["failures"]=failures
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print("DONE",manifest["stats"])
    if fail:
        print("Failures are recorded in manifest; successful rounds are still usable.")

if __name__=="__main__":
    main()
