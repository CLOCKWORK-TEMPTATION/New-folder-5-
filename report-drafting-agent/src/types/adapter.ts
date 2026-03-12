import { z } from "zod";

export const executionEnvelopeSchema = z.object({
  protocolVersion: z.literal("research-task-envelope/v1"),
  runId: z.string().min(1),
  taskId: z.string().min(1),
  workflowStage: z.enum(["search", "extract", "analyze", "draft"]),
  sender: z.string().min(1),
  targetAgent: z.string().min(1),
  objective: z.string().min(1),
  userRequest: z.string().min(1),
  constraints: z.record(z.string(), z.unknown()),
  inputs: z.object({
    artifacts: z.array(z.string()),
    inlineData: z.record(z.string(), z.unknown()),
    sharedStatePath: z.string().min(1),
  }),
  execution: z.object({
    attempt: z.number().int().positive(),
    timeoutSeconds: z.number().int().positive(),
  }),
  trace: z.object({
    createdAt: z.string(),
    createdBy: z.string(),
    correlationId: z.string(),
  }),
});

export type ExecutionEnvelope = z.infer<typeof executionEnvelopeSchema>;

export function parseEnvelope(input: unknown): ExecutionEnvelope {
  return executionEnvelopeSchema.parse(input);
}
