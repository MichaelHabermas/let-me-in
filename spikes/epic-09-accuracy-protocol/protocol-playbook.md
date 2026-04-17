# Protocol playbook — subject roster and capture rules (E9-T1, F9.1)

This document defines **structure only**. Names and consent are **TBD** until a supervisor approves ethics and campus rules (**E9-T6**).

## Enrollment rules (for the later live study)

1. **Who may appear in the gallery:** Only people who have signed the consent checklist (see below) and are explicitly listed as **enrolled** for the test.
2. **Enrollment capture (MVP-aligned):** One primary enrollment photo per enrolled identity, taken at the kiosk with guided framing (“look at the camera → detect → capture → enter name/role → save”), matching the product flow in SPECS. **Stretch (documented optional):** second enrollment angle (e.g. slight turn) if the team later decides it improves robustness—call it out in the run log if used.
3. **Labeling:** Each enrolled row gets a stable test ID (e.g. `ENR-01`), display name, and role string used by the app.
4. **Data handling (pre-implementation note):** Store enrollment captures and door-session frames only per campus/supervisor policy; default assumption is **no public repo uploads** of real faces.

## Lighting buckets (door attempts)

Each **door session** is tagged with one bucket. Runners record bucket + time of day + weather (if near windows).

| Code | Description | Intent |
| --- | --- | --- |
| **L1** | Bright, even indoor (overhead + fill) | “Good” lighting per evaluation table |
| **L2** | Dim indoor (fewer lights / evening simulation) | Stress weak-accept behavior |
| **L3** | Strong side light / window sidelight | Asymmetric face illumination |
| **L4** | Strong backlight (subject between camera and bright source) | Hard silhouette / partial face |

## Attempt counts and cooldown

- **Cooldown:** Follow product spec: **at least 3 seconds** between verification attempts on the same device ([docs/SPECS.txt](../../docs/SPECS.txt) — Cooldown Timer).
- **Per visit (recommended for the later study):** Up to **3** door attempts per subject per lighting bucket per visit, separated by cooldown, unless the runner stops early because the decision is stable (e.g. three consecutive identical outcomes). Record every attempt either way.
- **Enrollment day:** One enrollment sequence per enrolled identity; if enrollment fails (no face), allow up to **5** enrollment tries same day before postponing.

## Identity roster (≥ 20 placeholders)

Twelve rows are **designated enrolled** for positive trials; eight are **not enrolled** (or play impostor / stranger roles) for negative trials. Reassign after approval if needed; keep **≥ 20** distinct planned identities.

| Test ID | Planned role | Enrolled? (Y/N) | Consent | Notes |
| --- | --- | --- | --- | --- |
| Subject 01 | Resident A | Y | TBD | Primary enrolled gallery |
| Subject 02 | Resident B | Y | TBD | |
| Subject 03 | Resident C | Y | TBD | |
| Subject 04 | Resident D | Y | TBD | |
| Subject 05 | Resident E | Y | TBD | |
| Subject 06 | Resident F | Y | TBD | |
| Subject 07 | Resident G | Y | TBD | |
| Subject 08 | Resident H | Y | TBD | |
| Subject 09 | Resident I | Y | TBD | |
| Subject 10 | Resident J | Y | TBD | |
| Subject 11 | Resident K | Y | TBD | |
| Subject 12 | Resident L | Y | TBD | |
| Subject 13 | Visitor / not enrolled | N | TBD | Unenrolled door attempts |
| Subject 14 | Visitor / not enrolled | N | TBD | |
| Subject 15 | Visitor / not enrolled | N | TBD | |
| Subject 16 | “Impostor” (claims wrong name) | N | TBD | Not in gallery; optional script |
| Subject 17 | “Impostor” | N | TBD | |
| Subject 18 | Two-person scenario partner | N | TBD | Paired with enrolled for #6 |
| Subject 19 | Two-person scenario partner | N | TBD | |
| Subject 20 | Photo-print holder (enrolled print) | TBD | TBD | SPECS #5; consent for **use of their image on print** |

**Optional Subject 21+** if the supervisor asks for more margin on the “20+ faces” test set: add `Subject 21`, `Subject 22` as extra not-enrolled visitors.

## How images would be captured (later)

1. **Enrollment:** Webcam at the deployment kiosk, admin flow, single face in frame; save thumbnail + embedding per product design.
2. **Door attempts:** Same kiosk; runner starts session, ensures bucket label, stands or positions subject per protocol; each attempt logs timestamp, bucket, decision, displayed name/score if available.
3. **Printed-photo trials (#5):** Use a **physical print** of an **enrolled** subject’s enrollment image (quality and size documented in [protocol-negative-trials.md](./protocol-negative-trials.md)); holder may be Subject 20 or a staff member with written permission to hold the print—not the enrolled person in front of the camera.

## Consent — checklist (for supervisors to adapt)

- [ ] Purpose explained (testing a class door-check demo, not production security).
- [ ] What is collected (face images/video frames during visit).
- [ ] Where data lives and retention (lab machine only / deleted after course / etc.—**TBD by campus**).
- [ ] Right to stop; no course grade tied to participation (**TBD by instructor**).
- [ ] Whether re-enrollment or extra angles are requested.
- [ ] For **two-person** trials: both people consent to appear together on camera.
- [ ] For **printed photo** trials: enrolled subject consents to their likeness being printed for this test.

## Consent — template wording (placeholder)

> I understand I am being asked to help test a student-built door demo that uses a camera. My face may be recorded during enrollment and/or during test visits. I have read the retention and deletion plan for this study. I agree to participate and I understand I can stop at any time.

_Replace bracketed campus policies before use. Legal review may be required._

## Cross-links

- Positive trial counts: [protocol-positive-trials.md](./protocol-positive-trials.md)
- Negative trial counts: [protocol-negative-trials.md](./protocol-negative-trials.md)
- SPECS mapping: [protocol-specs-mapping.md](./protocol-specs-mapping.md)
- Metrics and bands: [protocol-metrics.md](./protocol-metrics.md)
