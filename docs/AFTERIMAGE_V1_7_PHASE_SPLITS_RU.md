# AFTERIMAGE//RUN v1.7.0 — Phase Splits

## What changed
AFTERIMAGE//RUN now records a cumulative time at every 1,000-metre checkpoint. It compares the current split against the best locally saved time for that same distance, displays a signed time delta and keeps the last four splits visible during the run.

## Personal-record rules
- Split PBs are saved separately from the overall score record.
- A faster sector updates that sector only; slower sectors never overwrite a better stored time.
- Practice mode may display and compare splits, but cannot write the ranked split table.
- At most 60 checkpoint records are stored. Input records are checked for exact checkpoint distances, bounded times and duplicates.
- The downloadable run report schema v3 contains both splits observed in this attempt and the personal-best split table.

## Limits
These are local records for the selected UTC daily seed. They are not a global leaderboard, online anti-cheat verification or proof of a player's rank. Browser data can be reset. This change does not activate third-party advertising, payments or subscription access.

## QA
The Games portal smoke test checks the v1.7 UI/version contract, JavaScript syntax, exact-boundary timing integration, duplicate handling, rejection of invalid records, per-sector merge behavior and the 60-split cap. The production route matrix also requires the published game route to return the v1.7 marker and schema v3.
