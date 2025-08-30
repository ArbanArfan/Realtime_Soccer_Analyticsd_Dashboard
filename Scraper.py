# Scraper.py
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import re
from flask import Flask, jsonify
import pymongo
from bson.objectid import ObjectId
from flask_cors import CORS, cross_origin


URL = "https://bongdanet.co/"

ROW_SELECTOR = "tr[id^='tb_']"          # only primary rows
DETAIL_ROW_SELECTOR = "tr[id^='tr2_']"  # detail rows (skipped)

# ------------------------- Playwright helpers -------------------------
def harden_page(page):
    page.route("**/*.{png,jpg,jpeg,svg,gif,webp}", lambda r: r.abort())
    page.route("**/*.{ttf,woff,woff2,otf}", lambda r: r.abort())
    page.route("**/*ads*", lambda r: r.abort())

def dismiss_popups(page):
    for sel in [
        "button:has-text('Chấp nhận')",
        "button:has-text('Đồng ý')",
        "button:has-text('Tôi đồng ý')",
        "button:has-text('Cho phép')",
        "button:has-text('Đóng')",
        ".btn-close", ".close", "div[role=dialog] button"
    ]:
        try:
            loc = page.locator(sel)
            if loc.first.is_visible():
                loc.first.click(timeout=1000)
        except Exception:
            pass

def wait_for_rows(page):
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    dismiss_popups(page)
    page.wait_for_load_state("networkidle", timeout=60000)
    # force render (sometimes virtualized)
    page.mouse.wheel(0, 10000)
    page.mouse.wheel(0, -10000)
    # wait for attachment rather than visible
    page.locator(ROW_SELECTOR).first.wait_for(state="attached", timeout=60000)
    page.wait_for_function(
        """() => document.querySelectorAll("tr[id^='tb_']").length > 0""",
        timeout=60000
    )

# ------------------------- Parsing helpers -------------------------
pair_exact_re = re.compile(r"^\s*(\d+)\s*-\s*(\d+)\s*$")

def txt(node):
    return node.get_text(" ", strip=True) if node else ""

def parse_time_status(s):
    s = (s or "").strip()
    if not s: return ""
    up = s.upper()
    if up in {"HT","FT","NS","ET","PEN","POSTP"}:
        return up
    return s  # minutes like 84, 90+2, 41', etc.

def parse_score_from_tds(tds, exclude=None):
    exclude = exclude or set()
    for td in tds:
        if td in exclude: continue
        t = txt(td)
        if pair_exact_re.match(t):
            return t, td
    return "", None

def parse_bet365(td):
    """Read td.oddstd → structured AH & O/U."""
    empty = {
        "ah": {"home_odds": None, "line": None, "away_odds": None},
        "ou": {"over_odds": None, "total_line": None, "under_odds": None}
    }
    if not td: return empty
    groups = td.select(".w-hOdds .hOdds")
    asia_vals, ou_vals = [None]*3, [None]*3
    for i, g in enumerate(groups[:3]):
        a = g.select_one(".txt-asia")
        o = g.select_one(".txt-overunder")
        asia_vals[i] = txt(a) if a else None
        ou_vals[i]   = txt(o) if o else None
    return {
        "ah": {"home_odds": asia_vals[0], "line": asia_vals[1], "away_odds": asia_vals[2]},
        "ou": {"over_odds": ou_vals[0], "total_line": ou_vals[1], "under_odds": ou_vals[2]},
    }

# (Kept but unused: parse_top_bottom_lines) — per your request we no longer scrape/store corners
def parse_top_bottom_lines(soup):
    top_row = None
    cont = soup.select_one(".tyso-corner")
    if cont:
        sp = cont.select_one("span")
        if sp:
            top_row = txt(sp)
    bottom_row = None
    h1 = soup.select_one(".tyso-h1")
    if h1:
        btxt = txt(h1)
        m = pair_exact_re.match(btxt)
        bottom_row = f"{m.group(1)} - {m.group(2)}" if m else btxt
    return top_row, bottom_row

def extract_row_payload(row_html):
    soup = BeautifulSoup(row_html, "lxml")
    tds = soup.select("td")

    # --- Competition & Time/Status by position with offset (handles leading blank cell) ---
    texts = [txt(td) for td in tds]
    base_offset = 1 if len(texts) >= 2 and not texts[0] and texts[1] else 0

    def td_at(i):
        return tds[i] if 0 <= i < len(tds) else None

    comp_td  = td_at(base_offset + 0)
    time_td  = td_at(base_offset + 1)
    competition    = txt(comp_td)
    time_or_status = parse_time_status(txt(time_td))

    # --- Home / Away from the anchor ids (gold standard) ---
    home_a = soup.select_one("a.name.data-history-ls[id^='ht_']")
    away_a = soup.select_one("a.name.data-history-ls[id^='gt_']")
    home_team = txt(home_a)
    away_team = txt(away_a)

    # Fallback: anchor around score cell
    bet_td = soup.select_one("td.oddstd")
    score, score_td = parse_score_from_tds(tds, exclude={bet_td} if bet_td else set())
    if (not home_team or not away_team) and score_td:
        i_score = tds.index(score_td)
        if not home_team:
            ht = td_at(i_score - 1); home_team = txt(ht)
        if not away_team:
            at = td_at(i_score + 1); away_team = txt(at)

    # Clean extraneous leading numbers if ever present
    home_team = re.sub(r"^\s*\d+\s+", "", home_team).strip()
    away_team = re.sub(r"^\s*\d+\s+", "", away_team).strip()

    # NOTE: corners removed per request (we no longer query .tyso-corner / .tyso-h1)

    # --- Bet365 odds ---
    odds = parse_bet365(bet_td)

    # NOTE: columns_raw removed per request

    return {
        "competition": competition,
        "time_or_status": time_or_status,
        "home_team": home_team,
        "score": score,
        "away_team": away_team,
        "odds": odds
    }

# ------------------------- Scrape function -------------------------
def scrape_data():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled","--no-sandbox"]
        )
        ctx = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
            locale="vi-VN", timezone_id="Asia/Ho_Chi_Minh"
        )
        page = ctx.new_page()
        harden_page(page)
        wait_for_rows(page)

        # If table is inside a child frame (rare), search frames too
        candidate = page
        rows = candidate.query_selector_all(ROW_SELECTOR)
        if not rows:
            for f in page.frames:
                rows = f.query_selector_all(ROW_SELECTOR)
                if rows: 
                    candidate = f
                    break

        out = []
        for r in rows:
            rid = r.get_attribute("id")
            if rid and rid.startswith("tr2_"):    # skip detail rows explicitly
                continue

            data_league = r.get_attribute("data-league")
            data_index  = r.get_attribute("data-index")
            # classes removed from output per request

            html = r.inner_html()
            rec = extract_row_payload(html)
            rec.update({
                "row_id": rid,
                "data_league": data_league,
                "data_index": data_index
                # no classes, no per-row scraped time
            })
            out.append(rec)

        browser.close()

    # ---- SINGLE top-level scraped time in U.S. Central (label "CST") ----
    ts_ct = datetime.now(ZoneInfo("America/Chicago"))
    scraped_at_cst = f"CST {ts_ct.strftime('%a %H:%M')}"  # e.g., "CST Thu 14:07"

    # Add UTC timestamp for sorting
    scraped_at_utc = datetime.now(timezone.utc)

    # Place timestamp at the start by wrapping in an object
    out_obj = {
        "scraped_at_cst": scraped_at_cst,
        "scraped_at_utc": scraped_at_utc,
        "data": out
    }

    return out_obj

# ------------------------- Flask Server -------------------------
app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}},
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["Content-Disposition"],
    supports_credentials=False,   # keep False unless you actually use cookies/auth
    max_age=86400
)

dblink = "mongodb://localhost:27017/"
# MongoDB connection
client = pymongo.MongoClient(dblink)
db = client["bongdanet_db"]
collection = db["scrapes"]

@app.route('/scrape', methods=['GET'])
def run_scrape():
    try:
        out_obj = scrape_data()
        result = collection.insert_one(out_obj)
        return jsonify({"message": "Scraped and stored successfully", "id": str(result.inserted_id), "data": out_obj})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/data/latest', methods=['GET'])
def get_latest():
    latest = collection.find_one(sort=[("scraped_at_utc", -1)])
    if latest:
        latest['_id'] = str(latest['_id'])
        latest['scraped_at_utc'] = latest['scraped_at_utc'].isoformat()
        return jsonify(latest)
    else:
        return jsonify({"error": "No data found"}), 404

@app.route('/data', methods=['GET'])
def get_all():
    all_data = list(collection.find(sort=[("scraped_at_utc", -1)]))
    for d in all_data:
        d['_id'] = str(d['_id'])
        d['scraped_at_utc'] = d['scraped_at_utc'].isoformat()
    return jsonify(all_data)

@app.route('/data/<id>', methods=['GET'])
def get_by_id(id):
    try:
        doc = collection.find_one({"_id": ObjectId(id)})
        if doc:
            doc['_id'] = str(doc['_id'])
            doc['scraped_at_utc'] = doc['scraped_at_utc'].isoformat()
            return jsonify(doc)
        else:
            return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/data/clear', methods=['POST'])
def clear_data():
    try:
        result = collection.delete_many({})
        return jsonify({"message": f"Cleared {result.deleted_count} records."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
if __name__ == "__main__":
    app.run(debug=True)