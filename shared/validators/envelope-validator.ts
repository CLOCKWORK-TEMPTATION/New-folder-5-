import { z } from "zod";

export const envelopeSchema = z.object({
  protocolVersion: z.literal("research-task-envelope/v1"),
  runId: z.string().min(1),
  taskId: z.string().min(1),
  parentTaskId: z.string().nullable().optional(),
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
    attempt: z.number().int().min(1),
    timeoutSeconds: z.number().int().positive(),
  }),
  trace: z.object({
    createdAt: z.string().datetime(),
    createdBy: z.string().min(1),
    correlationId: z.string().min(1),
  }),
});

export type ParsedEnvelope = z.infer<typeof envelopeSchema>;

export function validateEnvelope(input: unknown): ParsedEnvelope {
  return envelopeSchema.parse(input);
}

export function safeValidateEnvelope(input: unknown) {
  return envelopeSchema.safeParse(input);
}

