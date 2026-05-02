/** Domain row and match shapes — persistence maps these; UI and future matching consume them. */

export type Decision = 'GRANTED' | 'UNCERTAIN' | 'DENIED';
export type ReviewedDecision = 'GRANTED' | 'DENIED';

export interface User {
  id: string;
  name: string;
  role: string;
  referenceImageBlob: Blob;
  embedding: Float32Array;
  createdAt: number;
}

export interface AccessLogRow {
  timestamp: number;
  userId: string | null;
  similarity01: number;
  decision: Decision;
  capturedFrameBlob: Blob;
  livenessScore?: number;
  livenessDecision?: 'CHECKING' | 'PASS' | 'FAIL';
  livenessReason?: string;
  reviewedDecision?: ReviewedDecision;
  reviewedAt?: number;
  reviewedBy?: string | null;
}

export interface MatchResult {
  best: { userId: string; score: number };
  runnerUp: { userId: string; score: number } | null;
}

export interface BboxPixels {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
