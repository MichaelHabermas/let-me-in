# Accuracy trial results (Epic E10.S2.F1.T2, E16.S2.F1.T1)

**Status:** Pending operator-run trial (>=20 identities) per `docs/ACCURACY_TRIAL.md`.

## Epic E16 blocker note

- The E16 requirement needs real participant trial data (>=20 identities, TP/FP/FN/TN) captured with consent process from `docs/ACCURACY_TRIAL.md`.
- No synthetic or stub run is being substituted for this matrix.
- Until the operator-run trial is completed, E16.S2.F1.T1 remains open.

## Threshold used

- Source: IndexedDB `settings.thresholds` row (not `src/config.ts` defaults), per PRD §6.

## Confusion matrix (counts)

|  | Predicted accept | Predicted reject |
| --- | ---: | ---: |
| **Same person** | TP = _PENDING_ | FN = _PENDING_ |
| **Impostor** | FP = _PENDING_ | TN = _PENDING_ |

## Rates

- TPR = TP / (TP + FN) — target **≥ 0.85**
- FPR = FP / (FP + TN) — target **≤ 0.05**

_Compute with `node -e "import('./tests/accuracy/trial.js').then(m => console.log(m.formatRates({tpr:m.truePositiveRate(0,0), fpr:m.falsePositiveRate(0,0)})))"` after filling counts._

## Notes

- Lighting / distance / glasses variance.
- Any threshold retuning and why.
