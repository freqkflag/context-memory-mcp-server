import { z } from "zod";

export const memorySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  importance: z.number().int().min(0).max(10).nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const memoryListSchema = z.object({
  items: z.array(memorySchema),
  total: z.number().nonnegative(),
  limit: z.number().nonnegative(),
  offset: z.number().nonnegative(),
});

export const createMemoryInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1, { message: "content is required" }),
  importance: z
    .number({ invalid_type_error: "importance must be a number" })
    .int()
    .min(0)
    .max(10)
    .optional(),
  tags: z
    .array(z.string().trim().min(1))
    .max(25, { message: "Please limit tags to 25 entries" })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateMemoryInputSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
  title: z.string().trim().min(1).max(200).nullable().optional(),
  content: z.string().trim().min(1).optional(),
  importance: z
    .number({ invalid_type_error: "importance must be a number" })
    .int()
    .min(0)
    .max(10)
    .nullable()
    .optional(),
  tags: z.array(z.string().trim().min(1)).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const deleteMemoryInputSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export const getMemoryInputSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export const listMemoryInputSchema = z.object({
  search: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  minImportance: z.number().int().min(0).max(10).optional(),
  maxImportance: z.number().int().min(0).max(10).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
  before: z.string().datetime({ offset: true }).optional(),
  after: z.string().datetime({ offset: true }).optional(),
});
