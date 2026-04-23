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
