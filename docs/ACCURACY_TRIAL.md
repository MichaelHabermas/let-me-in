# Accuracy trial protocol (Epic E10.S2)

## Purpose

Demonstrate **≥85% true positive rate** at **≤5% false positive rate** on **≥20** enrolled identities, per `docs/SPECS.txt` and `docs/PRD.md` Epic E10.S2.

## Consent

- Each participant receives a plain-language description of: local-only storage, embeddings + reference image in IndexedDB, withdrawal/deletion path, and that results are for course grading.
- Signed consent (paper or e-sign) stored outside the repo; keep an anonymized roster ID mapping for the trial operator only.

## Capture procedure

1. Enroll each participant once under a unique roster label (no government IDs in filenames).
2. For each enrolled face, run **same-person** probes (TP) and **impostor** probes (FP) using other participants’ live captures or withheld sessions per protocol.
3. Record raw match scores and threshold decisions in a spreadsheet; copy summary counts into `docs/ACCURACY_RESULTS.md`.

## Anonymization

- After the trial, strip names from working notes; retain only aggregate confusion matrix and threshold tuning rationale.

## Offline math helpers

`tests/accuracy/trial.js` exports `truePositiveRate`, `falsePositiveRate`, and `formatRates` for sanity-checking pasted counts.
