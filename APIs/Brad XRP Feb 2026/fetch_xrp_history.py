"""
Fetch complete XRP daily price history from CCdata Enterprise API.
Paginates backwards to get the full available history.
Saves raw data as CSV for downstream analysis.
"""
import os
import sys
import time
import requests
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime, timezone

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

DIR = os.path.dirname(__file__)
load_dotenv(dotenv_path=os.path.join(DIR, "..", ".env"))
API_KEY = os.getenv("CCDATA_API_KEY")
if not API_KEY:
    raise ValueError("CCDATA_API_KEY not found")

BASE    = "https://min-api.cryptocompare.com/data/v2/histoday"
HEADERS = {"Authorization": f"Apikey {API_KEY}"}

def fetch_page(to_ts: int | None = None, limit: int = 2000) -> list[dict]:
    params = {"fsym": "XRP", "tsym": "USD", "limit": limit}
    if to_ts:
        params["toTs"] = to_ts
    r = requests.get(BASE, params=params, headers=HEADERS, timeout=20)
    r.raise_for_status()
    data = r.json()
    if data.get("Response") == "Error":
        raise RuntimeError(data.get("Message"))
    return data["Data"]["Data"]

print("Fetching complete XRP/USD daily history from CCdata...")
all_rows = []
to_ts = None
seen_times = set()

for page in range(10):  # up to 20,000 days (~54 years, way more than needed)
    rows = fetch_page(to_ts=to_ts)
    new_rows = [r for r in rows if r["time"] not in seen_times and r.get("close", 0) > 0]
    if not new_rows:
        print(f"  Page {page+1}: no new data, stopping.")
        break
    for r in new_rows:
        seen_times.add(r["time"])
    all_rows.extend(new_rows)
    earliest = min(r["time"] for r in new_rows)
    latest   = max(r["time"] for r in new_rows)
    print(f"  Page {page+1}: {len(new_rows)} new rows  "
          f"({datetime.fromtimestamp(earliest, tz=timezone.utc).date()} "
          f"to {datetime.fromtimestamp(latest, tz=timezone.utc).date()})")
    # Next page ends 1 day before the earliest we've seen
    to_ts = earliest - 86400
    time.sleep(0.3)

# Build DataFrame
df = pd.DataFrame(all_rows)
df["date"] = pd.to_datetime(df["time"], unit="s", utc=True)
df = df.sort_values("date").reset_index(drop=True)
df = df.rename(columns={"high": "High", "low": "Low", "open": "Open",
                         "close": "Close", "volumefrom": "Volume_XRP",
                         "volumeto": "Volume_USD"})
df = df[["date", "Open", "High", "Low", "Close", "Volume_XRP", "Volume_USD"]]

# Remove rows where price is 0 (pre-listing)
df = df[df["Close"] > 0].reset_index(drop=True)

out = os.path.join(DIR, "xrp_daily_full_history.csv")
df.to_csv(out, index=False)
print(f"\nSaved {len(df)} daily rows to {out}")
print(f"Date range: {df['date'].iloc[0].date()} to {df['date'].iloc[-1].date()}")
print(f"Price range: ${df['Close'].min():.6f} to ${df['Close'].max():.4f}")
