"""
XRP 2026 Bull Case — What's different (better) this time?
Compares first 33 days of each bear market on multiple dimensions.
"""
import os, sys, json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
from PIL import Image
from datetime import datetime, timezone

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

DIR        = os.path.dirname(__file__)
API_DIR    = os.path.join(DIR, "..")
STYLE_FILE = os.path.join(API_DIR, "formatting", "chart_styling_RTM.json")
LOGO_PATH  = os.path.join(API_DIR, "formatting", "ripple_corporate_triskelion.png")
DATA_FILE  = os.path.join(DIR, "xrp_daily_full_history.csv")

with open(STYLE_FILE) as f:
    S = json.load(f)
BG, PANEL_BG = S["canvas"]["background_color"], S["canvas"]["panel_color"]
GRID, TEXT, SUBTEXT = S["colors"]["grid"], S["colors"]["text_primary"], S["colors"]["text_secondary"]

df = pd.read_csv(DATA_FILE, parse_dates=["date"])
df["date"] = pd.to_datetime(df["date"], utc=True)
df = df.sort_values("date").reset_index(drop=True)

# ── Bear market definitions ───────────────────────────────────────────────────
BEARS = {
    "2018 Bear": {"peak": "2018-01-04", "color": "#FF6B6B"},
    "2022 Bear": {"peak": "2021-11-10", "color": "#FFD93D"},
    "2025-26 Current": {"peak": "2025-10-03", "color": "#6BCB77"},
}

def get_segment(peak_str, days=400):
    peak_dt = pd.Timestamp(peak_str, tz="UTC")
    idx = (df["date"] - peak_dt).abs().idxmin()
    peak_price = df.loc[idx, "Close"]
    seg = df.loc[idx:].head(days).copy()
    seg["days"] = (seg["date"] - seg["date"].iloc[0]).dt.days
    seg["rebased"] = (seg["Close"] / peak_price) * 100
    seg["daily_ret"] = seg["Close"].pct_change()
    return seg, peak_price

segments = {}
for label, bm in BEARS.items():
    segments[label], bm["peak_price"] = get_segment(bm["peak"])

# Current drawdown length
current_len = len(segments["2025-26 Current"])

def add_watermark(ax):
    try:
        logo = np.array(Image.open(LOGO_PATH).convert("RGBA")).astype(float) / 255.0
        logo[..., 3] *= 0.5
        im = OffsetImage(logo, zoom=0.025)
        ab = AnnotationBbox(im, (0.025, 0.045), xycoords="axes fraction", frameon=False, zorder=5)
        ax.add_artist(ab)
    except Exception:
        pass
    ax.text(0.05, 0.045, "Ripple Trading", transform=ax.transAxes,
            fontsize=8, fontweight="bold", color=TEXT, alpha=0.4, ha="left", va="center", zorder=5)

def style_ax(ax, fig, title, subtitle=""):
    fig.patch.set_facecolor(BG); ax.set_facecolor(PANEL_BG)
    ax.tick_params(colors=TEXT, labelsize=9)
    for sp in ax.spines.values(): sp.set_edgecolor(GRID)
    ax.grid(axis="y", color=GRID, linewidth=0.7, zorder=1)
    ax.grid(axis="x", color=GRID, linewidth=0.4, linestyle=":", zorder=1)
    fig.suptitle(title, color=TEXT, fontsize=15, fontweight="bold", y=0.96)
    if subtitle: ax.set_title(subtitle, color=SUBTEXT, fontsize=9, pad=10)
    fig.text(0.99, 0.01, f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d')}  |  {S['branding']}",
             ha="right", va="bottom", color=SUBTEXT, fontsize=7, alpha=0.6)


# ═══════════════════════════════════════════════════════════════════════════════
# QUANTITATIVE COMPARISON — first N days (matching 2026's length)
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print(f"BULL CASE METRICS — first {current_len} days of each bear")
print("=" * 70)

metrics = {}
for label, seg in segments.items():
    s = seg.head(current_len)
    max_dd = (s["rebased"].min() - 100)
    worst_day = s["daily_ret"].min() * 100
    best_day = s["daily_ret"].max() * 100
    avg_daily = s["daily_ret"].mean() * 100
    days_green = (s["daily_ret"] > 0).sum()
    days_total = len(s["daily_ret"].dropna())
    green_pct = days_green / days_total * 100 if days_total > 0 else 0
    current_level = s["rebased"].iloc[-1]
    # Bounce: biggest rally from a local low within the period
    rolling_low = s["rebased"].cummin()
    bounce_from_low = ((s["rebased"] / rolling_low - 1) * 100).max()

    metrics[label] = {
        "max_drawdown": max_dd,
        "current_level": current_level,
        "worst_single_day": worst_day,
        "best_single_day": best_day,
        "avg_daily_return": avg_daily,
        "green_day_pct": green_pct,
        "max_bounce_from_low": bounce_from_low,
    }
    print(f"\n  {label}:")
    print(f"    Max drawdown:       {max_dd:+.1f}%")
    print(f"    Current level:      {current_level:.1f} (peak=100)")
    print(f"    Worst single day:   {worst_day:+.1f}%")
    print(f"    Best single day:    {best_day:+.1f}%")
    print(f"    Avg daily return:   {avg_daily:+.2f}%")
    print(f"    Green days:         {green_pct:.0f}%")
    print(f"    Max bounce from low: +{bounce_from_low:.1f}%")


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 8: First 33 Days — Zoomed Overlay (the key comparison)
# ═══════════════════════════════════════════════════════════════════════════════
print(f"\n[Chart 8] First {current_len} days overlay (zoomed)...")

fig, ax = plt.subplots(figsize=(16, 9))
for label, bm in BEARS.items():
    seg = segments[label].head(current_len)
    ax.plot(seg["days"], seg["rebased"], color=bm["color"], linewidth=2.4, label=label, zorder=3)
    last = seg.iloc[-1]
    ax.annotate(f"{label}\n{last['rebased']:.0f}",
                xy=(last["days"], last["rebased"]),
                xytext=(8, 0), textcoords="offset points",
                color=bm["color"], fontsize=10, fontweight="bold", va="center")

ax.axhline(100, color=SUBTEXT, linewidth=0.8, linestyle="--", alpha=0.5, zorder=2)
ax.axhline(50, color="#FF6B6B", linewidth=0.6, linestyle=":", alpha=0.3, zorder=2)

# Shade the "better zone" where 2026 is above both prior bears
seg_18 = segments["2018 Bear"].head(current_len).set_index("days")["rebased"]
seg_22 = segments["2022 Bear"].head(current_len).set_index("days")["rebased"]
seg_26 = segments["2025-26 Current"].head(current_len).set_index("days")["rebased"]
common_days = seg_26.index.intersection(seg_18.index).intersection(seg_22.index)
worst_prior = pd.concat([seg_18[common_days], seg_22[common_days]], axis=1).min(axis=1)
best_prior  = pd.concat([seg_18[common_days], seg_22[common_days]], axis=1).max(axis=1)

# Green shade where 2026 > both prior bears
above_both = seg_26[common_days] > best_prior
for d in common_days:
    if above_both.get(d, False):
        ax.axvspan(d - 0.5, d + 0.5, alpha=0.06, color="#6BCB77", zorder=1)

ax.set_xlim(-1, current_len + 5)
ax.set_ylabel("Indexed Price (Peak = 100)", color=SUBTEXT, fontsize=10, labelpad=10)
ax.set_xlabel("Days from Peak", color=SUBTEXT, fontsize=10, labelpad=8)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:.0f}"))
ax.legend(loc="lower left", frameon=True, framealpha=0.15,
          facecolor=PANEL_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
style_ax(ax, fig,
         f"XRP — First {current_len} Days: 2026 Holding Up Better",
         "Green shading = days where 2026 outperforms BOTH prior bears · Source: CCdata Enterprise")
add_watermark(ax)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out = os.path.join(DIR, "08_first_33d_zoomed_overlay.png")
fig.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out}")
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 9: Bull Case Radar / Bar Chart — multi-metric comparison
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 9] Multi-metric bar comparison...")

fig, axes = plt.subplots(2, 3, figsize=(16, 10))
fig.patch.set_facecolor(BG)

metric_defs = [
    ("max_drawdown",      "Max Drawdown (%)",      "{:+.1f}%",  True),   # higher=better (less negative)
    ("current_level",     "Level at Day 33",        "{:.0f}",    True),   # higher=better
    ("worst_single_day",  "Worst Single Day (%)",   "{:+.1f}%",  True),   # higher=better (less negative)
    ("best_single_day",   "Best Single Day (%)",    "{:+.1f}%",  True),   # higher=better
    ("green_day_pct",     "Green Days (%)",          "{:.0f}%",   True),   # higher=better
    ("max_bounce_from_low","Max Bounce from Low (%)","+{:.1f}%",  True),   # higher=better
]

bar_labels = list(BEARS.keys())
bar_colors = [BEARS[l]["color"] for l in bar_labels]

for i, (key, title, fmt, higher_better) in enumerate(metric_defs):
    ax = axes[i // 3][i % 3]
    ax.set_facecolor(PANEL_BG)
    for sp in ax.spines.values(): sp.set_edgecolor(GRID)

    vals = [metrics[l][key] for l in bar_labels]
    bars = ax.bar(bar_labels, vals, color=bar_colors, alpha=0.85, zorder=3)

    # Highlight the "best" bar
    if higher_better:
        best_idx = np.argmax(vals)
    else:
        best_idx = np.argmin(vals)
    bars[best_idx].set_edgecolor("#FFFFFF")
    bars[best_idx].set_linewidth(2)

    for bar, v in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height(),
                fmt.format(v), ha="center", va="bottom",
                color=TEXT, fontsize=9, fontweight="bold")

    ax.set_title(title, color=TEXT, fontsize=10, fontweight="bold", pad=8)
    ax.tick_params(colors=SUBTEXT, labelsize=8)
    ax.set_xticklabels(["2018", "2022", "2026"], color=SUBTEXT, fontsize=9)
    ax.grid(axis="y", color=GRID, linewidth=0.5, zorder=1)
    ax.axhline(0, color=SUBTEXT, linewidth=0.5, zorder=2)

fig.suptitle(f"XRP Bull Case — 2026 vs Prior Bears (First {current_len} Days)",
             color=TEXT, fontsize=16, fontweight="bold", y=0.98)
fig.text(0.5, 0.01, "White border = best performer  |  Source: CCdata Enterprise  |  Ripple Trading Markets",
         ha="center", color=SUBTEXT, fontsize=8, alpha=0.6)
plt.tight_layout(rect=[0, 0.03, 1, 0.95])
out = os.path.join(DIR, "09_bull_case_metrics.png")
fig.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out}")
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 10: Price Floor — XRP relative to pre-rally base
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 10] Price floor analysis...")

# Pre-rally base: average price in the 90 days before each peak
fig, ax = plt.subplots(figsize=(16, 9))

for label, bm in BEARS.items():
    peak_dt = pd.Timestamp(bm["peak"], tz="UTC")
    peak_idx = (df["date"] - peak_dt).abs().idxmin()

    # Pre-rally base = avg price 90-30 days before peak
    pre_start = max(0, peak_idx - 90)
    pre_end   = max(0, peak_idx - 30)
    base_price = df.loc[pre_start:pre_end, "Close"].mean()
    bm["base_price"] = base_price

    seg = segments[label].head(current_len).copy()
    seg["above_base"] = (seg["Close"] / base_price - 1) * 100

    ax.plot(seg["days"], seg["above_base"], color=bm["color"],
            linewidth=2.4, label=f"{label} (base=${base_price:.4f})", zorder=3)
    last = seg.iloc[-1]
    ax.annotate(f"{last['above_base']:+.0f}%",
                xy=(last["days"], last["above_base"]),
                xytext=(8, 0), textcoords="offset points",
                color=bm["color"], fontsize=10, fontweight="bold", va="center")

ax.axhline(0, color="#FF6B6B", linewidth=1.2, linestyle="--", alpha=0.7, zorder=2,
           label="Pre-rally base (break = danger)")
ax.set_ylabel("% Above Pre-Rally Base", color=SUBTEXT, fontsize=10, labelpad=10)
ax.set_xlabel("Days from Peak", color=SUBTEXT, fontsize=10, labelpad=8)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:+.0f}%"))
ax.legend(loc="upper right", frameon=True, framealpha=0.15,
          facecolor=PANEL_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=9)
style_ax(ax, fig,
         "XRP — How Far Above the Pre-Rally Base?",
         "Base = avg price 90-30 days before peak · Breaking below 0% signals full reversal · Source: CCdata Enterprise")
add_watermark(ax)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out = os.path.join(DIR, "10_price_floor_pre_rally_base.png")
fig.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out}")
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# CHART 11: Recovery Bounce Strength — cumulative green-day returns
# ═══════════════════════════════════════════════════════════════════════════════
print("[Chart 11] Recovery bounce strength...")

fig, ax = plt.subplots(figsize=(16, 9))

for label, bm in BEARS.items():
    seg = segments[label].head(current_len).copy()
    seg["green_ret"] = seg["daily_ret"].clip(lower=0)
    seg["cum_green"] = seg["green_ret"].cumsum() * 100
    ax.plot(seg["days"], seg["cum_green"], color=bm["color"],
            linewidth=2.4, label=label, zorder=3)
    last = seg.iloc[-1]
    ax.annotate(f"{last['cum_green']:.0f}%",
                xy=(last["days"], last["cum_green"]),
                xytext=(8, 0), textcoords="offset points",
                color=bm["color"], fontsize=10, fontweight="bold", va="center")

ax.set_ylabel("Cumulative Green-Day Returns (%)", color=SUBTEXT, fontsize=10, labelpad=10)
ax.set_xlabel("Days from Peak", color=SUBTEXT, fontsize=10, labelpad=8)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"+{x:.0f}%"))
ax.legend(loc="upper left", frameon=True, framealpha=0.15,
          facecolor=PANEL_BG, edgecolor=GRID, labelcolor=TEXT, fontsize=10)
style_ax(ax, fig,
         "XRP — Buying Pressure: Cumulative Green-Day Returns",
         "Sum of all positive daily returns · Higher = stronger dip-buying · Source: CCdata Enterprise")
add_watermark(ax)
plt.tight_layout(rect=[0, 0.01, 1, 0.95])
out = os.path.join(DIR, "11_recovery_bounce_strength.png")
fig.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
print(f"  Saved -> {out}")
plt.close(fig)


# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════
m18 = metrics["2018 Bear"]
m22 = metrics["2022 Bear"]
m26 = metrics["2025-26 Current"]

print("\n" + "=" * 70)
print("BULL CASE SUMMARY — What's better in 2026")
print("=" * 70)

points = []
if m26["max_drawdown"] > m18["max_drawdown"] and m26["max_drawdown"] > m22["max_drawdown"]:
    points.append(f"1. SHALLOWER DRAWDOWN: 2026 max DD is {m26['max_drawdown']:+.1f}% vs "
                  f"{m18['max_drawdown']:+.1f}% (2018) and {m22['max_drawdown']:+.1f}% (2022)")
if m26["current_level"] > m18["current_level"] and m26["current_level"] > m22["current_level"]:
    points.append(f"2. HIGHER PRICE LEVEL: 2026 at {m26['current_level']:.0f} vs "
                  f"{m18['current_level']:.0f} (2018) and {m22['current_level']:.0f} (2022)")
if m26["worst_single_day"] > m18["worst_single_day"] and m26["worst_single_day"] > m22["worst_single_day"]:
    points.append(f"3. LESS VIOLENT SELLOFFS: Worst day {m26['worst_single_day']:+.1f}% vs "
                  f"{m18['worst_single_day']:+.1f}% (2018) and {m22['worst_single_day']:+.1f}% (2022)")
if m26["green_day_pct"] > m18["green_day_pct"] and m26["green_day_pct"] > m22["green_day_pct"]:
    points.append(f"4. MORE GREEN DAYS: {m26['green_day_pct']:.0f}% vs "
                  f"{m18['green_day_pct']:.0f}% (2018) and {m22['green_day_pct']:.0f}% (2022)")
if m26["max_bounce_from_low"] > m18["max_bounce_from_low"]:
    points.append(f"5. STRONGER BOUNCES: Max bounce from low +{m26['max_bounce_from_low']:.1f}% vs "
                  f"+{m18['max_bounce_from_low']:.1f}% (2018)")

# Always print what we found
if points:
    for p in points:
        print(f"  {p}")
else:
    print("  No clear outperformance found on all metrics — mixed picture.")

# Print any areas where 2026 is worse
print("\n  WATCH POINTS (where 2026 is NOT clearly better):")
if m26["max_drawdown"] <= m22["max_drawdown"]:
    print(f"  - Drawdown depth: 2026 ({m26['max_drawdown']:+.1f}%) is similar to or worse than 2022 ({m22['max_drawdown']:+.1f}%)")
if m26["green_day_pct"] <= m22["green_day_pct"]:
    print(f"  - Green days: 2026 ({m26['green_day_pct']:.0f}%) similar to 2022 ({m22['green_day_pct']:.0f}%)")

print("=" * 70)
