# Bulk user import (JSON)

Epic E8 canonical contract: a single JSON **array** of objects. Each object describes one user to enroll.

## Row shape

| Field          | Type   | Required | Description                                                |
| -------------- | ------ | -------- | ---------------------------------------------------------- |
| `name`         | string | yes      | Display name (trimmed for storage).                        |
| `role`         | string | yes      | Must match an allowed role (see below).                    |
| `imageBase64`  | string | yes      | Base64-encoded image bytes (JPEG/PNG). Optional `data:image/...;base64,` prefix is accepted. |

## Root shape

```json
[
  { "name": "Ada", "role": "Staff", "imageBase64": "<base64>" },
  { "name": "Bob", "role": "Visitor", "imageBase64": "<base64>" }
]
```

## Allowed roles

`role` is matched **case-insensitively** against the `USER_ROLES` list in [`src/domain/user-roles.ts`](../src/domain/user-roles.ts). The value stored in the database uses the **canonical** spelling from that array (for example `staff` in JSON becomes `Staff`).

## Duplicate names

Rows with the same `name` after **trim + case-insensitive** comparison are flagged as **duplicate warnings**. Import may still proceed after admin confirmation.

## Processing

For each valid row the app decodes the image, runs the same **detect → single-face crop → embed → persist** path as interactive admin enrollment.

## Export format (Epic E17)

Roster export is a JSON **array** that keeps import compatibility while adding optional backup fidelity.

- The required import-compatible fields remain:
  - `name` (string)
  - `role` (string)
  - `imageBase64` (string)
- Export also adds a `backup` object for restore/audit metadata.
- Existing import parsing ignores unknown fields, so exported rows can be re-imported directly.

### Export row shape

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Display name. |
| `role` | string | yes | Canonical role label. |
| `imageBase64` | string | yes | Base64 image payload for import symmetry. |
| `backup.schemaVersion` | number | yes | Export schema version (current `1`). |
| `backup.userId` | string | yes | Original persisted user id. |
| `backup.createdAt` | number | yes | Original Unix timestamp (ms). |
| `backup.referenceImageBase64` | string | yes | Base64 bytes from `referenceImageBlob`. |
| `backup.embedding.encoding` | string | yes | Always `float32le-base64`. |
| `backup.embedding.dimensions` | number | yes | Vector length. |
| `backup.embedding.base64` | string | yes | Raw Float32 bytes, little-endian, base64 encoded. |

### Canonicalization notes

- `imageBase64` and `backup.referenceImageBase64` are the same bytes.
- Embeddings are serialized from the exact in-memory `Float32Array` byte view; no rounding or text conversion.
- JSON is emitted in stable key order by object construction and pretty-printed with 2-space indentation.
