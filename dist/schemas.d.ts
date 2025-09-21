import { z } from "zod";
export declare const memorySchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodNullable<z.ZodString>;
    content: z.ZodString;
    importance: z.ZodNullable<z.ZodNumber>;
    tags: z.ZodArray<z.ZodString, "many">;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tags: string[];
    content: string;
    metadata: Record<string, unknown>;
    updatedAt: string;
    id: string;
    title: string | null;
    importance: number | null;
    createdAt: string;
}, {
    tags: string[];
    content: string;
    metadata: Record<string, unknown>;
    updatedAt: string;
    id: string;
    title: string | null;
    importance: number | null;
    createdAt: string;
}>;
export declare const memoryListSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodNullable<z.ZodString>;
        content: z.ZodString;
        importance: z.ZodNullable<z.ZodNumber>;
        tags: z.ZodArray<z.ZodString, "many">;
        metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tags: string[];
        content: string;
        metadata: Record<string, unknown>;
        updatedAt: string;
        id: string;
        title: string | null;
        importance: number | null;
        createdAt: string;
    }, {
        tags: string[];
        content: string;
        metadata: Record<string, unknown>;
        updatedAt: string;
        id: string;
        title: string | null;
        importance: number | null;
        createdAt: string;
    }>, "many">;
    total: z.ZodNumber;
    limit: z.ZodNumber;
    offset: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    items: {
        tags: string[];
        content: string;
        metadata: Record<string, unknown>;
        updatedAt: string;
        id: string;
        title: string | null;
        importance: number | null;
        createdAt: string;
    }[];
    total: number;
}, {
    limit: number;
    offset: number;
    items: {
        tags: string[];
        content: string;
        metadata: Record<string, unknown>;
        updatedAt: string;
        id: string;
        title: string | null;
        importance: number | null;
        createdAt: string;
    }[];
    total: number;
}>;
export declare const createMemoryInputSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodString;
    importance: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    title?: string | undefined;
    importance?: number | undefined;
}, {
    content: string;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    title?: string | undefined;
    importance?: number | undefined;
}>;
export declare const updateMemoryInputSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodOptional<z.ZodString>;
    importance: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tags?: string[] | null | undefined;
    content?: string | undefined;
    metadata?: Record<string, unknown> | null | undefined;
    title?: string | null | undefined;
    importance?: number | null | undefined;
}, {
    id: string;
    tags?: string[] | null | undefined;
    content?: string | undefined;
    metadata?: Record<string, unknown> | null | undefined;
    title?: string | null | undefined;
    importance?: number | null | undefined;
}>;
export declare const deleteMemoryInputSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const getMemoryInputSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const listMemoryInputSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    minImportance: z.ZodOptional<z.ZodNumber>;
    maxImportance: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
    before: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    tags?: string[] | undefined;
    minImportance?: number | undefined;
    maxImportance?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    before?: string | undefined;
    after?: string | undefined;
}, {
    search?: string | undefined;
    tags?: string[] | undefined;
    minImportance?: number | undefined;
    maxImportance?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    before?: string | undefined;
    after?: string | undefined;
}>;
