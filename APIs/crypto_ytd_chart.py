import os
import sys
import json
import requests
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import matplotlib.dates as mdates
import matplotlib.image as mpimg
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
from PIL import Image
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
from io import BytesIO

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# ── Paths ─────────────────────────────────────────────────────────────────────
DIR         = os.path.dirname(__file__)
STYLE_FILE  = os.path.join(DIR, "formatting", "chart_styling_RTM.json")
LOGO_PATH   = os.path.join(DIR, "formatting", "ripple_corporate_triskelion.png")

# ── Load styling config ───────────────────────────────────────────────────────
with open(STYLE_FILE) as f:
    S = json.load(f)

BG       = S["canvas"]["background_color"]
PANEL_BG = S["canvas"]["panel_color"]
GRID     = S["colors"]["grid"]
TEXT     = S["colors"]["text_primary"]
SUBTEXT  = S["colors"]["text_secondary"]
COLOURS  = S["colors"]["assets"]

# ── Load API key ──────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(DIR, ".env"))
API_KEY = os.getenv("CCDATA_API_KEY")
if not API_KEY:
    raise ValueError("CCDATA_API_KEY not found in .env")

# ── Config ────────────────────────────────────────────────────────────────────
ASSETS    = ["BTC", "ETH", "XRP", "SOL"]
QUOTE     = "USD"
LIMIT     = 60
BASE      = "https://min-api.cryptocompare.com/data/v2/histoday"
HEADERS   = {"Authorization": f"Apikey {API_KEY}"}
YTD_START = datetime(2026, 1, 1, tzinfo=timezone.utc)

# ── Download Ripple logo (cache locally) ──────────────────────────────────────
LOGO_URL = "https://cdn.brandfetch.io/id4BecbIFm/theme/dark/symbol.png?c=1bxid64Mup7aczewSAYMX&t=1671767451488"

def get_logo() -> np.ndarray | None:
    if not os.path.exists(LOGO_PATH):
        print("Downloading Ripple logo...")
        try:
            r = requests.get(LOGO_URL, timeout=15)
            r.raise_for_status()
            img = Image.open(BytesIO(r.content)).convert("RGBA")
            img.save(LOGO_PATH)
            print("  Logo saved.")
        except Exception as e:
            print(f"  Could not fetch logo: {e}")
            return None
    try:
        return np.array(Image.open(LOGO_PATH).convert("RGBA"))
    except Exception:
        return None

# ── Fetch & filter to YTD ─────────────────────────────────────────────────────
def fetch_prices(symbol: str) -> pd.Series:
    params = {"fsym": symbol, "tsym": QUOTE, "limit": LIMIT}
    r = requests.get(BASE, params=params, headers=HEADERS, timeout=15)
    r.raise_for_status()
    data = r.json()
    if data.get("Response") == "Error":
        raise RuntimeError(f"{symbol}: {data.get('Message')}")
    rows = data["Data"]["Data"]
    series = pd.Series(
        {datetime.fromtimestamp(row["time"], tz=timezone.utc): row["close"]
         for row in rows if row.get("close")}
    ).sort_index()
    return series[series.index >= YTD_START]

print("Fetching YTD data from CCdata...")
prices = {}
for sym in ASSETS:
    try:
        prices[sym] = fetch_prices(sym)
        print(f"  OK {sym}: {len(prices[sym])} days "
              f"({prices[sym].index[0].date()} to {prices[sym].index[-1].date()})")
    except Exception as e:
        print(f"  FAIL {sym}: {e}")

if not prices:
    raise SystemExit("No data retrieved.")

df        = pd.DataFrame(prices).dropna(how="all")
df_rebased = (df / df.iloc[0]) * 100

# ── Smart label placement (no overlap) ───────────────────────────────────────
def spread_labels(final_vals: dict, min_gap: float = 3.5) -> dict:
    """Iteratively push labels apart until no pair is closer than min_gap."""
    items    = sorted(final_vals.items(), key=lambda x: x[1])
    syms     = [k for k, _ in items]
    positions = [v for _, v in items]
    for _ in range(200):
        changed = False
        for i in range(1, len(positions)):
            gap = positions[i] - positions[i - 1]
            if gap < min_gap:
                mid              = (positions[i] + positions[i - 1]) / 2
                positions[i - 1] = mid - min_gap / 2
                positions[i]     = mid + min_gap / 2
                changed          = True
        if not changed:
            break
    return dict(zip(syms, positions))

final_vals    = {sym: df_rebased[sym].dropna().iloc[-1] for sym in df_rebased.columns}
label_y_pos   = spread_labels(final_vals, min_gap=S["layout"]["end_label_min_vertical_gap"])

# ── Build chart ───────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=S["canvas"]["figure_size"])
fig.patch.set_facecolor(BG)
ax.set_facecolor(PANEL_BG)

for sym, series in df_rebased.items():
    ax.plot(series.index, series.values,
            color=COLOURS[sym],
            linewidth=S["lines"]["asset_linewidth"],
            label=sym, zorder=3)

ax.axhline(100, color=SUBTEXT,
           linewidth=S["lines"]["baseline_linewidth"],
           linestyle=S["lines"]["baseline_style"],
           alpha=S["lines"]["baseline_alpha"], zorder=2)

# ── End labels with connector lines ──────────────────────────────────────────
x_last = df_rebased.index[-1]
for sym in df_rebased.columns:
    actual_y = final_vals[sym]
    label_y  = label_y_pos[sym]
    change   = actual_y - 100
    sign     = "+" if change >= 0 else ""
    # Connector line from series end to label
    if abs(actual_y - label_y) > 0.5:
        ax.plot([x_last, x_last + timedelta(days=1.5)],
                [actual_y, label_y],
                color=COLOURS[sym], linewidth=0.8, alpha=0.6, zorder=3)
    ax.annotate(
        f"{sym}  {sign}{change:.1f}%",
        xy=(x_last + timedelta(days=1.5), label_y),
        xytext=(S["layout"]["right_label_x_offset_pts"], 0),
        textcoords="offset points",
        color=COLOURS[sym],
        fontsize=S["typography"]["end_label_fontsize"],
        fontweight=S["typography"]["end_label_fontweight"],
        va="center"
    )

# ── Remove left/right axis gap ────────────────────────────────────────────────
x_end_with_margin = x_last + timedelta(days=12)   # room for right-side labels
ax.set_xlim(df_rebased.index[0], x_end_with_margin)

# ── Axes & grid ───────────────────────────────────────────────────────────────
ax.xaxis.set_major_formatter(mdates.DateFormatter("%d %b"))
ax.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=0, interval=1))
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.0f}"))
ax.tick_params(colors=TEXT, labelsize=S["typography"]["tick_fontsize"])
for spine in ax.spines.values():
    spine.set_edgecolor(GRID)
ax.grid(axis="y", color=GRID, linewidth=S["lines"]["grid_y_linewidth"], zorder=1)
ax.grid(axis="x", color=GRID, linewidth=S["lines"]["grid_x_linewidth"],
        linestyle=S["lines"]["grid_x_style"], zorder=1)
ax.set_xlabel("Date  (2026)", color=SUBTEXT,
              fontsize=S["typography"]["axis_label_fontsize"], labelpad=8)
ax.set_ylabel("Indexed Performance  (Base = 100, 1 Jan 2026)",
              color=SUBTEXT, fontsize=S["typography"]["axis_label_fontsize"], labelpad=10)

# ── Titles ────────────────────────────────────────────────────────────────────
end_str = df_rebased.index[-1].strftime("%d %b %Y")
fig.suptitle(
    "YTD Price Performance — BTC  ·  ETH  ·  XRP  ·  SOL",
    color=TEXT,
    fontsize=S["typography"]["title_fontsize"],
    fontweight=S["typography"]["title_fontweight"],
    y=0.96
)
ax.set_title(
    f"Daily close prices  ·  Rebased to 100 at 1 Jan 2026  ·  through {end_str}"
    f"  ·  Source: {S['data_source']}",
    color=SUBTEXT, fontsize=S["typography"]["subtitle_fontsize"], pad=10
)

# ── Legend ────────────────────────────────────────────────────────────────────
ax.legend(
    loc=S["legend"]["location"], frameon=True,
    framealpha=S["legend"]["frame_alpha"],
    facecolor=PANEL_BG, edgecolor=S["legend"]["edge_color"],
    labelcolor=TEXT, fontsize=S["legend"]["fontsize"]
)

# ── Ripple Trading logo — triskelion + text, bottom-left ─────────────────────
logo_arr = get_logo()
wm_cfg   = S["watermark"]

if logo_arr is not None:
    logo_rgba = logo_arr.astype(float) / 255.0
    logo_rgba[..., 3] *= 0.5
    im = OffsetImage(logo_rgba, zoom=0.025)
    ab = AnnotationBbox(im, (0.025, 0.045),
                        xycoords="axes fraction",
                        frameon=False, zorder=5)
    ax.add_artist(ab)

ax.text(0.05, 0.045, wm_cfg["text"],
        transform=ax.transAxes,
        fontsize=8, fontweight="bold",
        color=TEXT, alpha=0.4,
        ha="left", va="center", zorder=5)

# ── Footnote ──────────────────────────────────────────────────────────────────
fig.text(
    0.99, 0.01,
    f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d')}  |  {S['branding']}",
    ha="right", va="bottom", color=SUBTEXT,
    fontsize=S["typography"]["footnote_fontsize"],
    alpha=S["typography"]["footnote_alpha"]
)

plt.tight_layout(rect=S["layout"]["tight_layout_rect"])

out = os.path.join(DIR, "crypto_ytd_performance.png")
fig.savefig(out, dpi=S["canvas"]["dpi"], bbox_inches="tight", facecolor=BG)
print(f"\nChart saved -> {out}")
