# Production cost projections (SPECS-aligned)

Inference is client-side, so operating cost is mostly hosting and transfer. This table mirrors the required SPECS projection bands.

| Cost Category | 100 Users | 1K Users | 10K Users | 100K Users |
| --- | --- | --- | --- | --- |
| Static Hosting (CDN) | $0/mo (free tier) | $5/mo | $20/mo | $80/mo |
| Model File Transfer (25MB) | $0.02/mo | $0.20/mo | $2.00/mo | $20/mo |
| IndexedDB (client-side) | $0 | $0 | $0 | $0 |
| Optional: Cloud Backup Storage | $1/mo | $5/mo | $25/mo | $150/mo |
| Optional: Analytics/Logging API | $0 | $10/mo | $50/mo | $200/mo |
| Estimated Monthly Total | $1-2 | $20-25 | $95-100 | $450-500 |

## Assumptions

- Average model downloads are low after first-run because cached model assets avoid repeat transfer on most sessions.
- Verification attempts are frequent but compute remains client-side, so server-side cost scales with hosting/transfer rather than inference volume.
- Enrolled user images and embeddings remain client-side (IndexedDB) unless optional backup sync is enabled.
- Optional cloud backup and analytics rows are budgeted as additive services, not baseline requirements for core gate operation.
