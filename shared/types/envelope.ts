export type WorkflowStage = "search" | "extract" | "analyze" | "draft";

export interface ExecutionHandoffEnvelope {
  protocolVersion: "research-task-envelope/v1";
  runId: string;
  taskId: string;
  parentTaskId?: string | null;
  workflowStage: WorkflowStage;
  sender: string;
  targetAgent: string;
  objective: string;
  userRequest: string;
  constraints: Record<string, unknown>;
  inputs: {
    artifacts: string[];
    inlineData: Record<string, unknown>;
    sharedStatePath: string;
  };
  execution: {
    attempt: number;
    timeoutSeconds: number;
  };
  trace: {
    createdAt: string;
    createdBy: string;
    correlationId: string;
  };
}

