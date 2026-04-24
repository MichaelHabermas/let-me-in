/**
 * Enrollment-only entry to shared detection helpers — keeps `enroll-capture-frames`
 * from importing `detection-pipeline/internals` directly (gate vs enroll boundary).
 */

export { drawDetections, embedFace, handleDetectionCardinality } from '../detection-pipeline';
