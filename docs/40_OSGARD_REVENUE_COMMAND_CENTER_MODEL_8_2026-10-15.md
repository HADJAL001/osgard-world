# OSGARD Revenue Command Center — Model 8

## Scope

This release extends the local-first Revenue Intelligence model with two operational surfaces:

1. A 12/24/36-month cohort-aware cash-flow path.
2. A local business-experiment ledger that records a hypothesis, metric, baseline, target, due date and manually entered observed outcome.

Neither surface is an accounting system or a live analytics feed. It does not enable checkout, subscriptions or ads, and it does not invent actual OSGARD measurements.

## Cohort cash-flow method

The cash-flow projection starts from the current BASE scenario. Non-subscription gross income and costs are held flat at their modeled monthly values. Each month adds the modeled number of new Premium subscribers, applies the monthly churn rate to the existing subscriber cohort, recalculates MRR, payment fees, net cash flow and cumulative cash after the user-entered starting reserve.

Returned measures include:
- Ending MRR and subscriber count for the selected horizon.
- First month of non-negative modeled operating cash flow, if any.
- First month the modeled cumulative reserve goes below zero, if any.
- Monthly gross inflow, payment fees, operating costs, net flow and accumulated cash.

These outputs are deliberately labeled illustrative. New subscription acquisition, non-subscription income, ad delivery, conversion and expenses are held constant. The projection is not calibrated to actual cohorts, taxes, working capital, refunds, receivables, payout delays or seasonality. The "cash reserve" is typed by the user and is never fetched from a bank/accounting system.

## Experiment ledger

The browser-local ledger stores at most 40 experiment records. Each record includes:
- The target lever and desired direction.
- A pre-registered hypothesis, baseline, target and optional due date.
- A state (planned, running, completed or cancelled).
- A manually entered result and whether the result met the target.

A success rate is calculated only over experiments explicitly marked completed. It is not a statistical confidence level or proof of causality. A measured outcome can be confounded by changes in traffic mix, sample size, seasonality, product version and other factors; record the cohort and measurement method in the hypothesis text.

The ledger remains in the current browser's localStorage. Users can export/import a versioned JSON backup (maximum 500 KB). Import validates schema, entries, IDs and duplicates before replacing the local list. Export the journal before clearing browser data. Do not enter credentials, personal data or sensitive client information.

## Validation

Run the model checks:

    npm run qa:games-model

The suite covers:
- Existing three-scenario calculation and uncertainty/risk dashboard.
- Cohort compounding, churn/price direction, cash-depletion logic and horizon bounds.
- Experiment creation validation, success/miss outcomes, direction-aware targets, terminal state transitions, capped local storage shape and import/export validation.
- CSV includes the additional cash-flow summary when that optional data is supplied; legacy CSV shape stays unchanged for existing callers.
- UI wiring and absence of network calls in the local analysis modules.

Production and real monetization remain separate deployment and activation decisions.
