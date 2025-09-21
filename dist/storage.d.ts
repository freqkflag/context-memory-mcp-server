import type { MemoryCreateInput, MemoryFilters, MemoryListResult, MemoryRecord, MemoryUpdateInput } from "./types.js";
export declare class MemoryStore {
    private readonly dbPath;
    private db;
    constructor(dbPath: string);
    private configure;
    private createSchema;
    addMemory(input: MemoryCreateInput): MemoryRecord;
    getMemory(id: string): MemoryRecord | null;
    listMemories(filters?: MemoryFilters): MemoryListResult;
    updateMemory(input: MemoryUpdateInput): MemoryRecord | null;
    deleteMemory(id: string): boolean;
    private mapRow;
}
