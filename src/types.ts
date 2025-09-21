export interface MemoryRecord {
  id: string;
  title: string | null;
  content: string;
  importance: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface MemoryFilters {
  search?: string;
  tags?: string[];
  minImportance?: number;
  maxImportance?: number;
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
}

export interface MemoryListResult {
  items: MemoryRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface MemoryCreateInput {
  title?: string;
  content: string;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryUpdateInput {
  id: string;
  title?: string | null;
  content?: string;
  importance?: number | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
}
