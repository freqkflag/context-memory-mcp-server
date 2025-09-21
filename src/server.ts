import path from "path";
import process from "process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import pkg from "../package.json" with { type: "json" };
import { MemoryStore } from "./storage.js";
import {
  createMemoryInputSchema,
  deleteMemoryInputSchema,
  getMemoryInputSchema,
  listMemoryInputSchema,
  memoryListSchema,
  memorySchema,
  updateMemoryInputSchema,
} from "./schemas.js";
import type { MemoryRecord } from "./types.js";

export const DEFAULT_DB_NAME = "context-memory-wallet.db";

export const DEFAULT_INSTRUCTIONS = `This server exposes a personal context memory vault.

Available tools:
- memory.add: Persist a new memory entry with optional title, tags, metadata, and importance (0-10).
- memory.list: List and filter stored memories by search terms, tags, importance, or time window.
- memory.get: Retrieve a single memory by id.
- memory.update: Update any field on an existing memory by id.
- memory.delete: Remove a memory permanently by id.

Memories are stored durably on disk using SQLite. Tags are case-insensitive and deduplicated.
Use memory.list before updating or deleting to get the correct id.`;
type CreateMemoryArgs = z.infer<typeof createMemoryInputSchema>;
type ListMemoryArgs = z.infer<typeof listMemoryInputSchema>;
type GetMemoryArgs = z.infer<typeof getMemoryInputSchema>;
type UpdateMemoryArgs = z.infer<typeof updateMemoryInputSchema>;
type DeleteMemoryArgs = z.infer<typeof deleteMemoryInputSchema>;

const version = typeof pkg.version === "string" ? pkg.version : "0.1.0";

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
function toJsonContent(payload: unknown, message?: string) {
  const lines: string[] = [];
  if (message) {
    lines.push(message.trim());
  }
  lines.push("```json");
  lines.push(JSON.stringify(payload, null, 2));
  lines.push("```");
  return lines.join("\n");
}

function summarizeMemory(memory: MemoryRecord) {
  const lines = [
    memory.title ? `• ${memory.title}` : `• ${memory.id}`,
    `  id: ${memory.id}`,
    `  updated: ${memory.updatedAt}`,
    `  tags: ${memory.tags.join(", ") || "(none)"}`,
  ];
  if (memory.importance !== null && memory.importance !== undefined) {
    lines.push(`  importance: ${memory.importance}`);
  }
  return lines.join("\n");
}

export function resolveStoragePaths(options: ContextMemoryServerOptions = {}) {
  const envDataDir = process.env.MCP_CONTEXT_MEMORY_HOME;
  const envDbPath = process.env.MCP_CONTEXT_MEMORY_DB;
  const dataDir =
    options.dataDir ??
    (options.dbPath
      ? path.dirname(options.dbPath)
      : envDataDir ?? path.join(process.cwd(), "data"));
  const dbPath = options.dbPath ?? envDbPath ?? path.join(dataDir, DEFAULT_DB_NAME);
  return { dataDir, dbPath };
}
export function createContextMemoryServer(options: ContextMemoryServerOptions = {}) {
  const { dataDir, dbPath } = resolveStoragePaths(options);
  const store = options.store ?? new MemoryStore(dbPath);
  const serverInfo: Implementation = {
    name: options.serverInfo?.name ?? "context-memory-mcp-server",
    version: options.serverInfo?.version ?? version,
  };

  const server = new McpServer(
    serverInfo,
    {
      instructions: options.instructions ?? DEFAULT_INSTRUCTIONS,
    }
  );
  server.registerTool(
    "memory.add",
    {
      title: "Capture a new memory entry",
      description: "Persist contextual information for later recall.",
      inputSchema: createMemoryInputSchema.shape,
    },
    async (args: CreateMemoryArgs) => {
      const record = store.addMemory(args);
      await server.sendLoggingMessage({
        level: "info",
        message: `Added memory ${record.id}`,
      });
      return {
        content: [
          {
            type: "text",
            text: toJsonContent({ memory: record }, "Memory stored"),
          },
        ],
      };
    }
  );
  server.registerTool(
    "memory.list",
    {
      title: "List stored memories",
      description: "Browse or filter the memory vault.",
      inputSchema: listMemoryInputSchema.shape,
    },
    async (args: ListMemoryArgs) => {
      if (
        typeof args.minImportance === "number" &&
        typeof args.maxImportance === "number" &&
        args.minImportance > args.maxImportance
      ) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "minImportance cannot be greater than maxImportance",
            },
          ],
        };
      }
      const result = store.listMemories(args);
      const summary = result.items.map(summarizeMemory).join("\n");
      const text = summary
        ? `${summary}\n\nTotal: ${result.total} (showing ${result.items.length})`
        : "No memories matched the supplied filters.";
      return {
        content: [
          {
            type: "text",
            text,
          },
          {
            type: "text",
            text: toJsonContent(memoryListSchema.parse(result), "Structured results"),
          },
        ],
      };
    }
  );
  server.registerTool(
    "memory.get",
    {
      title: "Fetch a memory by id",
      description: "Retrieve the full payload of a stored memory entry.",
      inputSchema: getMemoryInputSchema.shape,
    },
    async (args: GetMemoryArgs) => {
      const record = store.getMemory(args.id);
      if (!record) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No memory found for id ${args.id}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: toJsonContent(memorySchema.parse(record), "Memory"),
          },
        ],
      };
    }
  );
  server.registerTool(
    "memory.update",
    {
      title: "Edit an existing memory",
      description: "Modify content, tags, metadata, title, or importance for a memory.",
      inputSchema: updateMemoryInputSchema.shape,
    },
    async (args: UpdateMemoryArgs) => {
      const updated = store.updateMemory(args);
      if (!updated) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No memory found for id ${args.id}`,
            },
          ],
        };
      }
      await server.sendLoggingMessage({
        level: "info",
        message: `Updated memory ${args.id}`,
      });
      return {
        content: [
          {
            type: "text",
            text: toJsonContent(memorySchema.parse(updated), "Memory updated"),
          },
        ],
      };
    }
  );
  server.registerTool(
    "memory.delete",
    {
      title: "Delete a memory entry",
      description: "Remove a memory from the vault.",
      inputSchema: deleteMemoryInputSchema.shape,
    },
    async (args: DeleteMemoryArgs) => {
      const success = store.deleteMemory(args.id);
      if (!success) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No memory found for id ${args.id}`,
            },
          ],
        };
      }
      await server.sendLoggingMessage({
        level: "info",
        message: `Deleted memory ${args.id}`,
      });
      return {
        content: [
          {
            type: "text",
            text: `Memory ${args.id} deleted.`,
          },
        ],
      };
    }
  );

  return { server, store, dataDir, dbPath };
}
export async function startContextMemoryServer(
  options: StartServerOptions = {}
): Promise<StartServerResult> {
  const { transport = new StdioServerTransport(), enableSignalHandlers = true } = options;
  const { server, store, dataDir, dbPath } = createContextMemoryServer(options);

  await server.connect(transport);

  let closing = false;
  let closed = false;

  let resolveWait!: () => void;
  let rejectWait!: (reason: unknown) => void;

  const waitUntilClosed = new Promise<void>((resolve, reject) => {
    resolveWait = resolve;
    rejectWait = reject;
  });

  const signalHandlers: Array<{ signal: NodeJS.Signals; handler: () => void }> = [];
  const finalize = () => {
    if (closed) {
      return;
    }
    closed = true;
    for (const { signal, handler } of signalHandlers) {
      process.off(signal, handler);
    }
    resolveWait();
  };

  const shutdown = async (signal?: NodeJS.Signals) => {
    if (closing) {
      return;
    }
    closing = true;

    if (signal) {
      await server
        .sendLoggingMessage({
          level: "info",
          message: `Received ${signal}, shutting down context-memory-mcp-server`,
        })
        .catch(() => {
          /* ignore logging errors during shutdown */
        });
    }

    try {
      await server.close();
    } catch (error) {
      console.error("Failed to close context memory MCP server cleanly", error);
    }

    try {
      await transport.close();
    } catch (error) {
      console.error("Failed to close context memory MCP transport cleanly", error);
    }

    finalize();
  };
  transport.onclose = finalize;
  transport.onerror = (error: unknown) => {
    console.error("Context memory MCP server transport error", error);
    rejectWait(error);
    void shutdown();
  };

  if (enableSignalHandlers) {
    const makeHandler = (signal: NodeJS.Signals) => () => {
      void shutdown(signal);
    };

    const sigintHandler = makeHandler("SIGINT");
    const sigtermHandler = makeHandler("SIGTERM");

    signalHandlers.push({ signal: "SIGINT", handler: sigintHandler });
    signalHandlers.push({ signal: "SIGTERM", handler: sigtermHandler });

    process.once("SIGINT", sigintHandler);
    process.once("SIGTERM", sigtermHandler);
  }

  return {
    server,
    store,
    transport,
    dataDir,
    dbPath,
    waitUntilClosed,
    shutdown: () => shutdown(),
  };
}
