/**
 * Enrollment-only entry to shared detection helpers — keeps `enroll-capture-frames`
 * from importing `detection-pipeline/internals` directly (gate vs enroll boundary).
 * Contract: import **only** from this file in `enrollment/*`; do not re-wrap these exports.
 */

export { drawDetections, embedFace, handleDetectionCardinality } from '../detection-pipeline';
