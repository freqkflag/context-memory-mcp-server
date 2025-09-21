import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "path";
import process from "process";
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

const DEFAULT_DB_NAME = "context-memory-wallet.db";

const instructions = `This server exposes a personal context memory vault.

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

const dataDir = process.env.MCP_CONTEXT_MEMORY_HOME ?? path.join(process.cwd(), "data");
const dbPath = process.env.MCP_CONTEXT_MEMORY_DB ?? path.join(dataDir, DEFAULT_DB_NAME);

const store = new MemoryStore(dbPath);

const server = new McpServer(
  {
    name: "context-memory-mcp-server",
    version,
  },
  {
    instructions,
  }
);

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start context memory MCP server", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  void server.close().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void server.close().finally(() => process.exit(0));
});
