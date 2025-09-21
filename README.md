# Context Memory MCP Server

A Model Context Protocol (MCP) server that turns your local machine into a persistent "memory wallet" for AI copilots. It exposes tools for adding, listing, retrieving, updating, and deleting durable context memories, and is ready to plug into VS Code Insiders (or any MCP-compatible client).

## Features

- **Persistent storage** backed by SQLite with WAL journaling for reliability and speed
- **Rich metadata** per entry: title, free-form content, importance (0-10), tags, and arbitrary JSON metadata
- **Querying & filters** for search, tag filtering, importance thresholds, and temporal windows
- **Full lifecycle tools** (`memory.add`, `memory.list`, `memory.get`, `memory.update`, `memory.delete`)
- **Structured JSON outputs** alongside human readable summaries for easy UI rendering
- **Configurable data path** via environment variables so you can keep memories anywhere (including synced drives)

## Installation

```bash
cd context-memory-mcp-server
npm install
npm run build
```

During development you can use `npm run dev` to run the TypeScript source directly (note that the process will remain attached to the terminal waiting for MCP messages).

## Running the server

The build step creates `dist/index.js`. You can launch the server with:

```bash
node dist/index.js
```

### Smithery

If you prefer to orchestrate MCP servers with [Smithery](https://smithery.ai/), this package now exposes both a CLI and programmatic entry points that Smithery understands:

- **CLI**: the npm bin `context-memory-mcp-server` starts the stdio transport, so Smithery can invoke it directly.
- **Module export**: importing `startContextMemoryServer` (or `createContextMemoryServer`) from `context-memory-mcp-server` returns the configured `McpServer`, which Smithery can wire up to any transport it launches.

Environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `MCP_CONTEXT_MEMORY_HOME` | Directory where the SQLite file should live | `<cwd>/data` |
| `MCP_CONTEXT_MEMORY_DB` | Full path to the SQLite file. Overrides `MCP_CONTEXT_MEMORY_HOME`. | `<MCP_CONTEXT_MEMORY_HOME>/context-memory-wallet.db` |

When first launched the database (and intermediate directories) are created automatically.

## VS Code Insiders integration

1. **Install a client** that speaks MCP inside VS Code Insiders. The official "AI Agents" preview (Settings → Features → AI → Enable AI Agent tools) or extensions like *Claude for VS Code* support custom MCP servers.
2. **Add a server definition** to your VS Code settings. Below is a sample for the Insiders AI Agent preview (uses the experimental `mcp.servers` setting):

```jsonc
// .vscode/settings.json or global settings
{
  "mcp.servers": {
    "context-memory": {
      "command": "node",
      "transport": "stdio",
      "args": [
        "/absolute/path/to/context-memory-mcp-server/dist/index.js"
      ],
      "env": {
        "MCP_CONTEXT_MEMORY_HOME": "/absolute/path/to/memory-data"
      }
    }
  }
}
```

   For the Claude extension, use the analogous `claude-dev.modelContextServers` setting:

```jsonc
{
  "claudeDev.modelContextServers": [
    {
      "name": "context-memory",
      "command": "node",
      "args": [
        "/absolute/path/to/context-memory-mcp-server/dist/index.js"
      ],
      "env": {
        "MCP_CONTEXT_MEMORY_HOME": "/absolute/path/to/memory-data"
      }
    }
  ]
}
```

3. **Reload VS Code**. The client should detect the server via stdio and register the five memory tools. Each tool returns both a readable summary and a JSON block you can parse or render in the side panel.

### Tool reference

| Tool | Purpose | Required params | Optional params |
| --- | --- | --- | --- |
| `memory.add` | Persist a new memory entry | `content` | `title`, `importance`, `tags[]`, `metadata` |
| `memory.list` | List & filter memories | – | `search`, `tags[]`, `minImportance`, `maxImportance`, `before`, `after`, `limit`, `offset` |
| `memory.get` | Fetch a single memory by ID | `id` | – |
| `memory.update` | Update an existing entry | `id` | `title`, `content`, `importance`, `tags[]`, `metadata` (any subset) |
| `memory.delete` | Delete an entry | `id` | – |

All responses contain a Markdown-formatted summary plus a JSON payload (wrapped in triple backticks) to keep clients machine-friendly.

## Development notes

- The project uses TypeScript with NodeNext module resolution; Node 18+ is required.
- Storage logic lives in `src/storage.ts`; schemas in `src/schemas.ts`; the MCP bootstrap is in `src/index.ts`.
- `npm run build` runs `tsc` and emits ESM output to `dist/`.
- You can adjust the DB location or swap backend storage by editing `MemoryStore`.

## Roadmap ideas

- Support for embedding vectors / similarity scoring
- Optional encryption at rest for private workspace setups
- MCP resource templates so memories appear as browsable URIs inside compatible clients

Feel free to extend and adapt the server for your own copilots!
