import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type {
  MemoryCreateInput,
  MemoryFilters,
  MemoryListResult,
  MemoryRecord,
  MemoryUpdateInput,
} from "./types.js";

function ensureDirectoryExists(filePath: string) {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function normalizeTags(tags?: string[] | null): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag) return false;
      const lower = tag.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
}

function serializeJson(value: Record<string, unknown> | null | undefined) {
  return JSON.stringify(value ?? {});
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class MemoryStore {
  private db: Database.Database;

  constructor(private readonly dbPath: string) {
    ensureDirectoryExists(dbPath);
    this.db = new Database(dbPath);
    this.configure();
    this.createSchema();
  }

  private configure() {
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  private createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT NOT NULL,
        importance INTEGER,
        tags TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at DESC);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    `);
  }

  addMemory(input: MemoryCreateInput): MemoryRecord {
    const id = uuidv4();
    const now = new Date().toISOString();
    const normalizedTags = normalizeTags(input.tags);

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, title, content, importance, tags, metadata, created_at, updated_at)
      VALUES (@id, @title, @content, @importance, @tags, @metadata, @created_at, @updated_at)
    `);

    stmt.run({
      id,
      title: input.title ?? null,
      content: input.content,
      importance:
        typeof input.importance === "number" ? Math.max(0, Math.min(10, input.importance)) : null,
      tags: JSON.stringify(normalizedTags),
      metadata: serializeJson(input.metadata),
      created_at: now,
      updated_at: now,
    });

    return {
      id,
      title: input.title ?? null,
      content: input.content,
      importance:
        typeof input.importance === "number" ? Math.max(0, Math.min(10, input.importance)) : null,
      tags: normalizedTags,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
  }

  getMemory(id: string): MemoryRecord | null {
    const row = this.db.prepare(`SELECT * FROM memories WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return this.mapRow(row);
  }

  listMemories(filters: MemoryFilters = {}): MemoryListResult {
    const {
      search,
      tags,
      minImportance,
      maxImportance,
      limit = 50,
      offset = 0,
      before,
      after,
    } = filters;

    const whereClauses: string[] = [];
    const params: Record<string, unknown> = {};

    if (search && search.trim()) {
      whereClauses.push(`(title LIKE @search OR content LIKE @search)`);
      params.search = `%${search.trim()}%`;
    }

    if (tags && tags.length > 0) {
      const normalizedTags = normalizeTags(tags);
      normalizedTags.forEach((tag, index) => {
        const paramName = `tag${index}`;
        whereClauses.push(
          `EXISTS (SELECT 1 FROM json_each(memories.tags) WHERE value = @${paramName})`
        );
        params[paramName] = tag;
      });
    }

    if (typeof minImportance === "number") {
      whereClauses.push(`importance >= @minImportance`);
      params.minImportance = minImportance;
    }
    if (typeof maxImportance === "number") {
      whereClauses.push(`importance <= @maxImportance`);
      params.maxImportance = maxImportance;
    }

    if (before) {
      whereClauses.push(`updated_at <= @before`);
      params.before = before;
    }

    if (after) {
      whereClauses.push(`updated_at >= @after`);
      params.after = after;
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const limitSafe = Math.min(Math.max(limit, 1), 200);
    const offsetSafe = Math.max(offset, 0);

    const rows = this.db
      .prepare(
        `SELECT * FROM memories ${where} ORDER BY updated_at DESC LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit: limitSafe, offset: offsetSafe }) as Record<string, unknown>[];

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM memories ${where}`)
      .get(params) as { count: number } | undefined;

    return {
      items: rows.map((row) => this.mapRow(row)),
      total: totalRow?.count ?? 0,
      limit: limitSafe,
      offset: offsetSafe,
    };
  }

  updateMemory(input: MemoryUpdateInput): MemoryRecord | null {
    const existing = this.getMemory(input.id);
    if (!existing) return null;

    const nextTitle = input.title !== undefined ? input.title : existing.title;
    const nextContent = input.content ?? existing.content;
    const nextImportance =
      input.importance !== undefined ? input.importance : existing.importance;
    const nextTags =
      input.tags !== undefined ? normalizeTags(input.tags ?? undefined) : existing.tags;
    const nextMetadata =
      input.metadata !== undefined ? input.metadata ?? {} : existing.metadata;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE memories SET title = @title, content = @content, importance = @importance, tags = @tags, metadata = @metadata, updated_at = @updated_at WHERE id = @id`
      )
      .run({
        id: input.id,
        title: nextTitle,
        content: nextContent,
        importance:
          typeof nextImportance === "number"
            ? Math.max(0, Math.min(10, nextImportance))
            : null,
        tags: JSON.stringify(nextTags),
        metadata: serializeJson(nextMetadata),
        updated_at: now,
      });

    return {
      ...existing,
      title: nextTitle ?? null,
      content: nextContent,
      importance:
        typeof nextImportance === "number"
          ? Math.max(0, Math.min(10, nextImportance))
          : null,
      tags: nextTags,
      metadata: nextMetadata,
      updatedAt: now,
    };
  }

  deleteMemory(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  private mapRow(row: Record<string, unknown>): MemoryRecord {
    const tags = Array.isArray(row.tags)
      ? normalizeTags(row.tags as string[])
      : normalizeTags(parseJson<string[]>(row.tags as string | null, []));
    const metadata = parseJson<Record<string, unknown>>(row.metadata as string | null, {});

    return {
      id: row.id as string,
      title: (row.title as string | null) ?? null,
      content: row.content as string,
      importance:
        typeof row.importance === "number"
          ? Math.max(0, Math.min(10, row.importance))
          : row.importance !== null && row.importance !== undefined
            ? Number(row.importance)
            : null,
      tags,
      metadata,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
