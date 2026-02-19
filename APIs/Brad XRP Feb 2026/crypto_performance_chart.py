import os
import sys
import requests
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import matplotlib.dates as mdates
from dotenv import load_dotenv
from datetime import datetime

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# ── Load API key ──────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
API_KEY = os.getenv("CCDATA_API_KEY")
if not API_KEY:
    raise ValueError("CCDATA_API_KEY not found in .env")

# ── Config ────────────────────────────────────────────────────────────────────
ASSETS = ["BTC", "ETH", "XRP", "SOL"]
QUOTE  = "USD"
LIMIT  = 365   # 1 year of daily closes
BASE   = "https://min-api.cryptocompare.com/data/v2/histoday"
HEADERS = {"Authorization": f"Apikey {API_KEY}"}

# Corporate colour palette
COLOURS = {
    "BTC": "#F7931A",   # Bitcoin orange
    "ETH": "#627EEA",   # Ethereum blue
    "XRP": "#00AAE4",   # XRP cyan
    "SOL": "#9945FF",   # Solana purple
}

# ── Fetch data ────────────────────────────────────────────────────────────────
def fetch_prices(symbol: str) -> pd.Series:
    params = {
        "fsym":  symbol,
        "tsym":  QUOTE,
        "limit": LIMIT,
    }
    r = requests.get(BASE, params=params, headers=HEADERS, timeout=15)
    r.raise_for_status()
    data = r.json()

    if data.get("Response") == "Error":
        raise RuntimeError(f"API error for {symbol}: {data.get('Message', data)}")

    rows = data["Data"]["Data"]
    series = pd.Series(
        {datetime.utcfromtimestamp(row["time"]): row["close"]
         for row in rows if row.get("close")}
    ).sort_index()
    return series

print("Testing CCdata API connection...")
prices = {}
for sym in ASSETS:
    try:
        prices[sym] = fetch_prices(sym)
        print(f"  OK {sym}: {len(prices[sym])} daily closes fetched "
              f"({prices[sym].index[0].date()} to {prices[sym].index[-1].date()})")
    except Exception as e:
        print(f"  FAIL {sym}: {e}")

if not prices:
    raise SystemExit("No data retrieved. Check your API key and network.")

# ── Relative performance (rebased to 100) ─────────────────────────────────────
df = pd.DataFrame(prices).dropna(how="all")
df_rebased = (df / df.iloc[0]) * 100

# ── Corporate chart ───────────────────────────────────────────────────────────
BG       = "#0D1117"
PANEL_BG = "#161B22"
GRID     = "#21262D"
TEXT     = "#E6EDF3"
SUBTEXT  = "#8B949E"

fig, ax = plt.subplots(figsize=(16, 9))
fig.patch.set_facecolor(BG)
ax.set_facecolor(PANEL_BG)

for sym, series in df_rebased.items():
    ax.plot(series.index, series.values,
            color=COLOURS[sym], linewidth=2.2, label=sym, zorder=3)

# Baseline reference
ax.axhline(100, color=SUBTEXT, linewidth=0.8, linestyle="--", alpha=0.5, zorder=2)

# ── Annotations: final value labels ──────────────────────────────────────────
for sym, series in df_rebased.items():
    last_val = series.dropna().iloc[-1]
    ax.annotate(
        f"{sym}  {last_val:+.0f}%",
        xy=(series.dropna().index[-1], last_val),
        xytext=(8, 0), textcoords="offset points",
        color=COLOURS[sym], fontsize=10, fontweight="bold",
        va="center"
    )

# ── Axes & grid ───────────────────────────────────────────────────────────────
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))
ax.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.0f}"))
ax.tick_params(colors=SUBTEXT, labelsize=9)
for spine in ax.spines.values():
    spine.set_edgecolor(GRID)
ax.grid(axis="y", color=GRID, linewidth=0.7, zorder=1)
ax.grid(axis="x", color=GRID, linewidth=0.4, linestyle=":", zorder=1)
ax.set_xlabel("Date", color=SUBTEXT, fontsize=10, labelpad=8)
ax.set_ylabel("Indexed Performance  (Base = 100)", color=SUBTEXT, fontsize=10, labelpad=10)

# ── Title block ───────────────────────────────────────────────────────────────
start_str = df_rebased.index[0].strftime("%d %b %Y")
end_str   = df_rebased.index[-1].strftime("%d %b %Y")
fig.suptitle(
    "Relative Price Performance — BTC · ETH · XRP · SOL",
    color=TEXT, fontsize=16, fontweight="bold", y=0.96
)
ax.set_title(
    f"Daily close prices · Rebased to 100 · {start_str} – {end_str}  ·  Source: CCdata Enterprise",
    color=SUBTEXT, fontsize=9, pad=10
)

# ── Legend ────────────────────────────────────────────────────────────────────
legend = ax.legend(
    loc="upper left", frameon=True, framealpha=0.15,
    facecolor=PANEL_BG, edgecolor=GRID,
    labelcolor=TEXT, fontsize=10
)

# ── Watermark ────────────────────────────────────────────────────────────────
fig.text(0.99, 0.01, f"Generated {datetime.utcnow().strftime('%Y-%m-%d')}  |  CCdata Enterprise",
         ha="right", va="bottom", color=SUBTEXT, fontsize=7, alpha=0.6)

plt.tight_layout(rect=[0, 0.01, 1, 0.95])

# ── Save ──────────────────────────────────────────────────────────────────────
out = os.path.join(os.path.dirname(__file__), "crypto_relative_performance.png")
fig.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"\nChart saved → {out}")
