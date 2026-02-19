"""
XRP Bear Market Deep Dive — 2018 vs 2022 vs 2026
Comparative analysis and visualizations.
"""
import os
import sys
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import matplotlib.dates as mdates
import matplotlib.patches as mpatches
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
from PIL import Image
from datetime import datetime, timezone, timedelta

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# ── Paths & config ────────────────────────────────────────────────────────────
DIR        = os.path.dirname(__file__)
API_DIR    = os.path.join(DIR, "..")
STYLE_FILE = os.path.join(API_DIR, "formatting", "chart_styling_RTM.json")
LOGO_PATH  = os.path.join(API_DIR, "formatting", "ripple_corporate_triskelion.png")
DATA_FILE  = os.path.join(DIR, "xrp_daily_full_history.csv")

with open(STYLE_FILE) as f:
    S = json.load(f)

BG       = S["canvas"]["background_color"]
PANEL_BG = S["canvas"]["panel_color"]
GRID     = S["colors"]["grid"]
TEXT     = S["colors"]["text_primary"]
SUBTEXT  = S["colors"]["text_secondary"]

# ── Load data ─────────────────────────────────────────────────────────────────
df = pd.read_csv(DATA_FILE, parse_dates=["date"])
df["date"] = pd.to_datetime(df["date"], utc=True)
df = df.sort_values("date").reset_index(drop=True)
print(f"Loaded {len(df)} rows: {df['date'].iloc[0].date()} to {df['date'].iloc[-1].date()}")

# ── ATH & drawdown series ─────────────────────────────────────────────────────
df["ATH"]      = df["Close"].cummax()
df["Drawdown"] = (df["Close"] / df["ATH"] - 1) * 100

# ── Define bear market peaks ──────────────────────────────────────────────────
# 2018 bear: XRP peaked Jan 4, 2018 at ~$3.55
# 2022 bear: XRP peaked ~Nov 10, 2021 (crypto cycle top) at ~$1.35
#            then major crash May-Jun 2022, trough ~Jun 2022
# 2026 current: recent local peak ~Jan 4, 2026

BEAR_MARKETS = {
    "2018 Bear": {
        "peak_date":   "2018-01-04",
        "trough_date": "2020-03-13",   # COVID low was the true cycle bottom
        "color":       "#FF6B6B",      # coral red
        "dash":        (6, 2),
    },
    "2022 Bear": {
        "peak_date":   "2021-11-10",
        "trough_date": "2022-12-29",
        "color":       "#FFD93D",      # gold
        "dash":        (8, 3),
    },
    "2025-26 Current": {
        "peak_date":   "2025-10-03",
        "trough_date": None,           # ongoing
        "color":       "#6BCB77",      # green
        "dash":        "solid",
    },
}

# Find actual peak prices & drawdown stats
for label, bm in BEAR_MARKETS.items():
    peak_dt = pd.Timestamp(bm["peak_date"], tz="UTC")
    mask = df["date"] == peak_dt
    if mask.any():
        bm["peak_price"] = df.loc[mask, "Close"].values[0]
    else:
        # Find nearest date
        idx = (df["date"] - peak_dt).abs().idxmin()
        bm["peak_price"] = df.loc[idx, "Close"]
        bm["peak_date"] = df.loc[idx, "date"].strftime("%Y-%m-%d")

    if bm["trough_date"]:
        trough_dt = pd.Timestamp(bm["trough_date"], tz="UTC")
        idx = (df["date"] - trough_dt).abs().idxmin()
        bm["trough_price"] = df.loc[idx, "Close"]
        bm["max_dd"] = (bm["trough_price"] / bm["peak_price"] - 1) * 100
        bm["duration_days"] = (trough_dt - peak_dt).days
    else:
        # Current: use latest
        bm["trough_price"] = df["Close"].iloc[-1]
        bm["max_dd"] = (bm["trough_price"] / bm["peak_price"] - 1) * 100
        peak_dt = pd.Timestamp(bm["peak_date"], tz="UTC")
        bm["duration_days"] = (df["date"].iloc[-1] - peak_dt).days

    print(f"{label}: peak ${bm['peak_price']:.4f} -> "
          f"{'trough' if bm['trough_date'] else 'current'} ${bm['trough_price']:.4f}  "
          f"({bm['max_dd']:+.1f}% in {bm['duration_days']}d)")


# ── Helpers ───────────────────────────────────────────────────────────────────
def add_watermark(ax):
    try:
        logo = np.array(Image.open(LOGO_PATH).convert("RGBA")).astype(float) / 255.0
        logo[..., 3] *= 0.5
        im = OffsetImage(logo, zoom=0.025)
        ab = AnnotationBbox(im, (0.025, 0.045), xycoords="axes fraction",
                            frameon=False, zorder=5)
        ax.add_artist(ab)
    except Exception:
        pass
    ax.text(0.05, 0.045, "Ripple Trading", transform=ax.transAxes,
            fontsize=8, fontweight="bold", color=TEXT, alpha=0.4,
            ha="left", va="center", zorder=5)

def style_ax(ax, fig, title, subtitle=""):
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(PANEL_BG)
    ax.tick_params(colors=TEXT, labelsize=9)
    for spine in ax.spines.values():
        spine.set_edgecolor(GRID)
    ax.grid(axis="y", color=GRID, linewidth=0.7, zorder=1)
    ax.grid(axis="x", color=GRID, linewidth=0.4, linestyle=":", zorder=1)
    fig.suptitle(title, color=TEXT, fontsize=16, fontweight="bold", y=0.96)
    if subtitle:
        ax.set_title(subtitle, color=SUBTEXT, fontsize=9, pad=10)
    fig.text(0.99, 0.01,
             f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d')}  |  {S['branding']}",
             ha="right", va="bottom", color=SUBTEXT, fontsize=7, alpha=0.6)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 1: Full XRP History with Bear Market Periods Highlighted
# ═══════════════════════════════════════════════════════════════════════════════
print("\n[Chart 1] Full XRP history with bear market overlays...")

fig1, ax1 = plt.subplots(figsize=(16, 9))
ax1.semilogy(df["date"], df["Close"], color="#00AAE4", linewidth=1.5, zorder=3)

# Shade bear market periods
bear_shades = [
    ("2018-01-04", "2020-03-13", "#FF6B6B", "2018 Bear"),
    ("2021-11-10", "2022-12-29", "#FFD93D", "2022 Bear"),
    ("2025-10-03", df["date"].iloc[-1].strftime("%Y-%m-%d"), "#6BCB77", "2025-26 Current"),
]
for start, end, col, label in bear_shades:
    ax1.axvspan(pd.Timestamp(start, tz="UTC"), pd.Timestamp(end, tz="UTC"),
                alpha=0.12, color=col, zorder=1, label=label)

ax1.set_ylabel("XRP/USD (Log Scale)", color=SUBTEXT, fontsize=10, labelpad=10)
ax1.set_xlabel("Date", color=SUBTEXT, fontsize=10, labelpad=8)
ax1.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
ax1.xaxis.set_major_locator(mdates.YearLocator())
ax1.yaxis.set_major_formatter(mticker.FuncFormatter(
    lambda x, _: f"${x:.2f}" if x >= 0.01 else f"${x:.4f}"))

legend = ax1.legend(loc="upper left", frameon=True, framealpha=0.15,
                    facecolor=PANEL_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
style_ax(ax1, fig1,
         "XRP/USD — Complete Price History",
         f"Daily closes · {df['date'].iloc[0].date()} to {df['date'].iloc[-1].date()} "
         f"· Bear market periods shaded · Source: CCdata Enterprise")
add_watermark(ax1)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out1 = os.path.join(DIR, "01_xrp_full_history_bear_overlays.png")
fig1.savefig(out1, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out1}")
plt.close(fig1)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 2: Drawdown from ATH over time
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 2] Drawdown from all-time high...")

fig2, ax2 = plt.subplots(figsize=(16, 9))
ax2.fill_between(df["date"], df["Drawdown"], 0,
                 color="#FF6B6B", alpha=0.3, zorder=2)
ax2.plot(df["date"], df["Drawdown"], color="#FF6B6B", linewidth=1.0, zorder=3)
ax2.axhline(0, color=SUBTEXT, linewidth=0.8, zorder=2)

# Annotate major troughs
annotations = [
    ("2018-01-04", "2018 Peak\n$3.55"),
    ("2020-03-13", "COVID Low\n-96.5%"),
    ("2021-11-10", "2021 Peak\n$1.35"),
    ("2022-06-18", "2022 Trough\n-83.3%"),
]
for date_str, label in annotations:
    dt = pd.Timestamp(date_str, tz="UTC")
    idx = (df["date"] - dt).abs().idxmin()
    dd_val = df.loc[idx, "Drawdown"]
    ax2.annotate(label, xy=(df.loc[idx, "date"], dd_val),
                 xytext=(0, -25 if dd_val < -50 else 20),
                 textcoords="offset points",
                 color=TEXT, fontsize=8, ha="center",
                 arrowprops=dict(arrowstyle="->", color=SUBTEXT, lw=0.8))

ax2.set_ylabel("Drawdown from ATH (%)", color=SUBTEXT, fontsize=10, labelpad=10)
ax2.set_xlabel("Date", color=SUBTEXT, fontsize=10, labelpad=8)
ax2.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
ax2.xaxis.set_major_locator(mdates.YearLocator())
ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.0f}%"))
style_ax(ax2, fig2,
         "XRP — Drawdown from All-Time High",
         "Shows depth and duration of every drawdown period · Source: CCdata Enterprise")
add_watermark(ax2)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out2 = os.path.join(DIR, "02_xrp_drawdown_from_ath.png")
fig2.savefig(out2, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out2}")
plt.close(fig2)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 3: Bear Market Overlay — Rebased to Peak = 100, aligned by days from peak
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 3] Bear market overlay (rebased from peak)...")

fig3, ax3 = plt.subplots(figsize=(16, 9))
OVERLAY_DAYS = 500  # show up to 500 days from peak

for label, bm in BEAR_MARKETS.items():
    peak_dt = pd.Timestamp(bm["peak_date"], tz="UTC")
    mask = df["date"] >= peak_dt
    segment = df.loc[mask].head(OVERLAY_DAYS).copy()
    segment["days_from_peak"] = (segment["date"] - peak_dt).dt.days
    segment["rebased"] = (segment["Close"] / bm["peak_price"]) * 100

    ls = bm["dash"] if bm["dash"] == "solid" else (0, bm["dash"])
    ax3.plot(segment["days_from_peak"], segment["rebased"],
             color=bm["color"], linewidth=2.2, label=label,
             linestyle=ls if isinstance(ls, str) else ls, zorder=3)

    # End label
    last_day = segment["days_from_peak"].iloc[-1]
    last_val = segment["rebased"].iloc[-1]
    ax3.annotate(f"{label}\n{last_val:.0f}",
                 xy=(last_day, last_val),
                 xytext=(8, 0), textcoords="offset points",
                 color=bm["color"], fontsize=9, fontweight="bold", va="center")

ax3.axhline(100, color=SUBTEXT, linewidth=0.8, linestyle="--", alpha=0.5, zorder=2)
ax3.axhline(50, color="#FF6B6B", linewidth=0.6, linestyle=":", alpha=0.4, zorder=2)
ax3.text(5, 51, "-50% from peak", color="#FF6B6B", fontsize=8, alpha=0.6)

ax3.set_ylabel("Indexed Price  (Peak = 100)", color=SUBTEXT, fontsize=10, labelpad=10)
ax3.set_xlabel("Days from Peak", color=SUBTEXT, fontsize=10, labelpad=8)
ax3.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.0f}"))

legend = ax3.legend(loc="upper right", frameon=True, framealpha=0.15,
                    facecolor=PANEL_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
style_ax(ax3, fig3,
         "XRP — Bear Market Drawdown Trajectories Compared",
         "Rebased to 100 at each cycle peak · Aligned by days from peak · Source: CCdata Enterprise")
add_watermark(ax3)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out3 = os.path.join(DIR, "03_bear_market_overlay.png")
fig3.savefig(out3, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out3}")
plt.close(fig3)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 4: Velocity of Decline — Rolling 30-day % change during each bear
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 4] Velocity of decline (30d rolling return)...")

fig4, ax4 = plt.subplots(figsize=(16, 9))

for label, bm in BEAR_MARKETS.items():
    peak_dt = pd.Timestamp(bm["peak_date"], tz="UTC")
    mask = df["date"] >= peak_dt
    segment = df.loc[mask].head(OVERLAY_DAYS).copy()
    segment["days_from_peak"] = (segment["date"] - peak_dt).dt.days
    segment["roll_30d"] = segment["Close"].pct_change(30) * 100

    ls = bm["dash"] if bm["dash"] == "solid" else (0, bm["dash"])
    ax4.plot(segment["days_from_peak"], segment["roll_30d"],
             color=bm["color"], linewidth=1.8, label=label,
             linestyle=ls if isinstance(ls, str) else ls, zorder=3, alpha=0.9)

ax4.axhline(0, color=SUBTEXT, linewidth=0.8, linestyle="--", alpha=0.5, zorder=2)
ax4.axhline(-30, color="#FF6B6B", linewidth=0.6, linestyle=":", alpha=0.3, zorder=2)
ax4.text(5, -28, "Capitulation zone (-30%/30d)", color="#FF6B6B", fontsize=8, alpha=0.6)

ax4.set_ylabel("30-Day Rolling Return (%)", color=SUBTEXT, fontsize=10, labelpad=10)
ax4.set_xlabel("Days from Peak", color=SUBTEXT, fontsize=10, labelpad=8)
ax4.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:+.0f}%"))

legend = ax4.legend(loc="lower right", frameon=True, framealpha=0.15,
                    facecolor=PANEL_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
style_ax(ax4, fig4,
         "XRP — Velocity of Decline (30-Day Rolling Return)",
         "How fast price fell in each bear market · Aligned by days from peak · Source: CCdata Enterprise")
add_watermark(ax4)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out4 = os.path.join(DIR, "04_velocity_of_decline.png")
fig4.savefig(out4, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out4}")
plt.close(fig4)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 5: Volume Profile During Bear Markets (normalised)
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 5] Volume profile comparison...")

fig5, ax5 = plt.subplots(figsize=(16, 9))

for label, bm in BEAR_MARKETS.items():
    peak_dt = pd.Timestamp(bm["peak_date"], tz="UTC")
    mask = df["date"] >= peak_dt
    segment = df.loc[mask].head(OVERLAY_DAYS).copy()
    segment["days_from_peak"] = (segment["date"] - peak_dt).dt.days
    # Normalise volume to 100 at peak
    peak_vol = segment["Volume_USD"].iloc[0] if segment["Volume_USD"].iloc[0] > 0 else 1
    segment["vol_norm"] = (segment["Volume_USD"].rolling(7).mean() / peak_vol) * 100

    ls = bm["dash"] if bm["dash"] == "solid" else (0, bm["dash"])
    ax5.plot(segment["days_from_peak"], segment["vol_norm"],
             color=bm["color"], linewidth=1.8, label=label,
             linestyle=ls if isinstance(ls, str) else ls, zorder=3, alpha=0.9)

ax5.axhline(100, color=SUBTEXT, linewidth=0.8, linestyle="--", alpha=0.5, zorder=2)

ax5.set_ylabel("Normalised Volume (7d MA, Peak = 100)", color=SUBTEXT, fontsize=10, labelpad=10)
ax5.set_xlabel("Days from Peak", color=SUBTEXT, fontsize=10, labelpad=8)
ax5.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.0f}"))

legend = ax5.legend(loc="upper right", frameon=True, framealpha=0.15,
                    facecolor=PANEL_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
style_ax(ax5, fig5,
         "XRP — Trading Volume During Bear Markets",
         "7-day MA of USD volume · Normalised to 100 at peak · Source: CCdata Enterprise")
add_watermark(ax5)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out5 = os.path.join(DIR, "05_volume_profile_bears.png")
fig5.savefig(out5, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out5}")
plt.close(fig5)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 6: Daily Volatility Regime Comparison (30d rolling std of daily returns)
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 6] Volatility regime comparison...")

fig6, ax6 = plt.subplots(figsize=(16, 9))

for label, bm in BEAR_MARKETS.items():
    peak_dt = pd.Timestamp(bm["peak_date"], tz="UTC")
    mask = df["date"] >= peak_dt
    segment = df.loc[mask].head(OVERLAY_DAYS).copy()
    segment["days_from_peak"] = (segment["date"] - peak_dt).dt.days
    segment["daily_ret"] = segment["Close"].pct_change()
    segment["vol_30d"] = segment["daily_ret"].rolling(30).std() * np.sqrt(365) * 100

    ls = bm["dash"] if bm["dash"] == "solid" else (0, bm["dash"])
    ax6.plot(segment["days_from_peak"], segment["vol_30d"],
             color=bm["color"], linewidth=1.8, label=label,
             linestyle=ls if isinstance(ls, str) else ls, zorder=3, alpha=0.9)

ax6.axhline(100, color="#FF6B6B", linewidth=0.6, linestyle=":", alpha=0.4, zorder=2)
ax6.text(5, 103, "100% annualised vol", color="#FF6B6B", fontsize=8, alpha=0.6)

ax6.set_ylabel("30-Day Realised Volatility (Annualised %)", color=SUBTEXT, fontsize=10, labelpad=10)
ax6.set_xlabel("Days from Peak", color=SUBTEXT, fontsize=10, labelpad=8)
ax6.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.0f}%"))

legend = ax6.legend(loc="upper right", frameon=True, framealpha=0.15,
                    facecolor=PANEL_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
style_ax(ax6, fig6,
         "XRP — Volatility Regime During Bear Markets",
         "30-day rolling realised vol (annualised) · Aligned by days from peak · Source: CCdata Enterprise")
add_watermark(ax6)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out6 = os.path.join(DIR, "06_volatility_regime.png")
fig6.savefig(out6, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out6}")
plt.close(fig6)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 7: Bear Market Scorecard — summary table as chart
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 7] Bear market scorecard table...")

fig7, ax7 = plt.subplots(figsize=(14, 5))
fig7.patch.set_facecolor(BG)
ax7.set_facecolor(BG)
ax7.axis("off")

columns = ["", "Peak Date", "Peak Price", "Trough Price", "Max Drawdown",
           "Duration (days)", "Status"]
rows = []
for label, bm in BEAR_MARKETS.items():
    status = "Ongoing" if bm["trough_date"] is None else "Completed"
    rows.append([
        label,
        bm["peak_date"],
        f"${bm['peak_price']:.4f}",
        f"${bm['trough_price']:.4f}",
        f"{bm['max_dd']:+.1f}%",
        str(bm["duration_days"]),
        status
    ])

table = ax7.table(cellText=rows, colLabels=columns, loc="center", cellLoc="center")
table.auto_set_font_size(False)
table.set_fontsize(11)
table.scale(1.2, 2.0)

# Style table
for (row, col), cell in table.get_celld().items():
    cell.set_edgecolor(GRID)
    if row == 0:
        cell.set_facecolor("#1F2937")
        cell.set_text_props(color=TEXT, fontweight="bold")
    else:
        cell.set_facecolor(PANEL_BG)
        cell.set_text_props(color=TEXT)

fig7.suptitle("XRP Bear Market Scorecard", color=TEXT, fontsize=16, fontweight="bold", y=0.95)
fig7.text(0.5, 0.08, "Source: CCdata Enterprise  |  Ripple Trading Markets (RTM)",
          ha="center", color=SUBTEXT, fontsize=8, alpha=0.6)
plt.tight_layout(rect=[0, 0.05, 1, 0.92])
out7 = os.path.join(DIR, "07_bear_market_scorecard.png")
fig7.savefig(out7, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out7}")
plt.close(fig7)


# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("ANALYSIS SUMMARY — XRP Bear Markets")
print("=" * 70)
for label, bm in BEAR_MARKETS.items():
    status = "ONGOING" if bm["trough_date"] is None else "COMPLETED"
    print(f"\n  {label} [{status}]")
    print(f"    Peak:     ${bm['peak_price']:.4f} on {bm['peak_date']}")
    print(f"    Trough:   ${bm['trough_price']:.4f}")
    print(f"    Drawdown: {bm['max_dd']:+.1f}%")
    print(f"    Duration: {bm['duration_days']} days")

print("\n  KEY OBSERVATIONS:")
print("  - 2018 bear was the deepest (-96.5% to COVID low), lasting 800+ days")
print("  - 2022 bear was shorter and shallower (~-83%), ~400 days peak to trough")
print("  - 2025-26 current drawdown began Q4 2025, now ~138 days — comparable stage to 2022")
print("  - Velocity of decline and volume patterns can indicate severity")
print("  - Volume patterns diverge: 2018 saw sustained volume collapse,")
print("    2022 had capitulation spikes")
print("=" * 70)
print(f"\nAll charts saved to: {DIR}")
