# AFTERIMAGE//RUN v1.7.0 — Phase Splits

## What changed
AFTERIMAGE//RUN records cumulative elapsed time at every 1,000-metre checkpoint. The interface compares each split against the best locally saved time at the same distance, shows a signed delta and keeps the four latest splits visible during the run.

## Personal-record rules
- Split records are stored separately from the overall score record.
- A faster sector updates that sector only; a slower sector never overwrites a better time.
- Practice mode can display and compare splits but cannot change the ranked split table.
- At most 60 validated checkpoint records are stored per local daily profile.
- The downloadable run-report schema v3 contains observed splits and the saved personal-best table.

## Limits
These are local records for the current browser and UTC daily seed, not a global leaderboard, server-verified speedrun or proof of global rank. Browser data can be reset. This release does not enable third-party ads, payments or subscriptions.

## QA
The Games portal smoke test checks v1.7 UI/version markers, inline JavaScript syntax, checkpoint boundary integration, duplicate normalization, invalid record rejection, per-sector merge behavior and the 60-split cap. The production route matrix requires the public route to return the v1.7 marker and report schema v3.
