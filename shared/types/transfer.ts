import type { WorkflowStage } from "./envelope.js";

export interface StageTransferRecord {
  transferId: string;
  timestamp: string;
  fromStage: WorkflowStage | "manager";
  toStage: WorkflowStage;
  envelopeId: string;
  status: "success" | "failure" | "retry";
  reason?: string;
  metadata: Record<string, unknown>;
}

