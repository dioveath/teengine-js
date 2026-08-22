import { z } from "zod";

export const GENERATION_MODES = ["image", "sfx"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const GenerationRequestSchema = z.object({
  prompt: z.string().min(1),
  mode: z.enum(GENERATION_MODES),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

export type GenerationResult = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export type GenerationRunner = {
  run(request: GenerationRequest, signal?: AbortSignal): Promise<GenerationResult>;
};
