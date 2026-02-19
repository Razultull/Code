import pandas as pd
df = pd.read_csv(r'C:\Users\RahulChatterjee\Desktop\Code\APIs\Brad XRP Feb 2026\xrp_daily_full_history.csv', parse_dates=['date'])
df['date'] = pd.to_datetime(df['date'], utc=True)

# Q4 2025 peak
q4 = df[(df['date'] >= '2025-10-01') & (df['date'] <= '2025-12-31')]
peak_idx = q4['Close'].idxmax()
peak = q4.loc[peak_idx]
print(f"Q4 2025 Peak: {peak['date'].date()} at ${peak['Close']:.4f}")

# Also show broader context Oct 2025 - Feb 2026
print("\nWeekly highs Oct 2025 - Feb 2026:")
recent = df[(df['date'] >= '2025-10-01') & (df['date'] <= '2026-02-18')].copy()
recent['week'] = recent['date'].dt.isocalendar().week
for _, grp in recent.groupby(recent['date'].dt.to_period('W')):
    hi = grp.loc[grp['Close'].idxmax()]
    print(f"  w/e {grp['date'].iloc[-1].date()}  High: ${hi['Close']:.4f}")
