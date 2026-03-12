import type { WorkflowStage } from "./envelope.js";

export interface RecoveryDecision {
  failureReason: string;
  failedStage: WorkflowStage;
  lastValidCheckpoint: string;
  retryCount: number;
  maxRetries: number;
  action: "retry" | "resume_from_checkpoint" | "abort";
  backoffMs: number;
  justification: string;
  nextAction: string;
}

