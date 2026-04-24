# Accuracy trial results (Epic E10.S2.F1.T2)

**Status:** Pending operator-run trial (>=20 identities) per `docs/ACCURACY_TRIAL.md`.

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
