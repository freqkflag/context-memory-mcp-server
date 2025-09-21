import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { MemoryStore } from "./storage.js";
export declare const DEFAULT_DB_NAME = "context-memory-wallet.db";
export declare const DEFAULT_INSTRUCTIONS = "This server exposes a personal context memory vault.\n\nAvailable tools:\n- memory.add: Persist a new memory entry with optional title, tags, metadata, and importance (0-10).\n- memory.list: List and filter stored memories by search terms, tags, importance, or time window.\n- memory.get: Retrieve a single memory by id.\n- memory.update: Update any field on an existing memory by id.\n- memory.delete: Remove a memory permanently by id.\n\nMemories are stored durably on disk using SQLite. Tags are case-insensitive and deduplicated.\nUse memory.list before updating or deleting to get the correct id.";
export interface ContextMemoryServerOptions {
    dataDir?: string;
    dbPath?: string;
    store?: MemoryStore;
    instructions?: string;
    serverInfo?: Partial<Implementation>;
}
export interface StartServerOptions extends ContextMemoryServerOptions {
    transport?: StdioServerTransport;
    enableSignalHandlers?: boolean;
}
export interface StartServerResult {
    server: McpServer;
    store: MemoryStore;
    transport: StdioServerTransport;
    dataDir: string;
    dbPath: string;
    waitUntilClosed: Promise<void>;
    shutdown: () => Promise<void>;
}
export declare function resolveStoragePaths(options?: ContextMemoryServerOptions): {
    dataDir: string;
    dbPath: string;
};
export declare function createContextMemoryServer(options?: ContextMemoryServerOptions): {
    server: McpServer;
    store: MemoryStore;
    dataDir: string;
    dbPath: string;
};
export declare function startContextMemoryServer(options?: StartServerOptions): Promise<StartServerResult>;
