/* ── Query Layer ── */
export interface QueryLayerItem {
  in: string[] | string[][];
  ex: string[] | string[][];
}

export interface SearchQuery {
  query_layer?: QueryLayerItem[] | null;
  region?: string | null;
  list_medium?: string[];
  list_author_id?: string[];
  lang_abbr?: string | null;
  exclude_channel_links?: string[];
}

/* ── Timestamp Schema (milliseconds) ── */
import { z } from "zod/v3";

export const TimestampMs = z.number().positive().refine(
  (val) => val > 1000000000000,
  { message: "Timestamp must be in milliseconds (13-digit integer), not seconds. Multiply seconds by 1000." }
);
export type TimestampMs = z.infer<typeof TimestampMs>;

/* ── Date Range ── */
export interface DateRange {
  /** Unix timestamp in MILLISECONDS (13-digit integer), NOT seconds */
  from: TimestampMs;
  /** Unix timestamp in MILLISECONDS (13-digit integer), NOT seconds */
  to: TimestampMs;
}

/* ── Core Entities ── */
export interface Post {
  id: string;
  hash: string;
  country: string;
  lang_abbr: string;
  medium: string;
  channel: string;
  channel_link: string;
  site: string;
  thread_link: string;
  post_link: string;
  thread_title: string;
  post_message: string;
  post_timestamp: string;
  /** Unix timestamp in MILLISECONDS (13-digit integer), NOT seconds */
  unix_timestamp: number;
  author_name: string;
  author_id?: string;
  author_image?: string;
  author_link?: string;
  is_comment: boolean;
  comment_order?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
  reaction_count?: number;
  reaction_like?: number;
  reaction_dislike?: number;
  reaction_love?: number;
  reaction_wow?: number;
  reaction_haha?: number;
  reaction_sad?: number;
  reaction_angry?: number;
  sentiment_score?: number;
}

export interface Task {
  task_id: number;
  task_name: string;
  task_type: string;
  language: string;
  date_range?: DateRange;
  search_query?: SearchQuery;
  prompts?: Record<string, string | null>;
  created_at?: string;
  updated_at?: string;
}

export interface Pagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

/* ── API Error ── */
export interface ErrorResponse {
  message: string;
  error?: string;
}

/* ── Request Bodies ── */
export interface CreateSearchQuery {
  query_layer: QueryLayerItem[];
  region?: "Hong Kong" | "China" | "Taiwan" | "USA";
  list_medium?: ("Facebook" | "Instagram" | "Social" | "News" | "Forum" | "Blog" | "Videos")[];
}

export interface CreateTaskRequest {
  task_type: "live" | "adhoc";
  task_name: string;
  language: "zh-t" | "zh-s" | "en";
  date_range?: DateRange;
  search_query: CreateSearchQuery;
}

export interface UpdateTaskRequest {
  task_name?: string;
  search_query?: SearchQuery;
  prompts?: Record<string, string | null>;
}

export interface ExportTaskRequest {
  task_ids?: number[];
  /** Unix timestamp in MILLISECONDS (13-digit integer), NOT seconds */
  unix_start: TimestampMs;
  /** Unix timestamp in MILLISECONDS (13-digit integer), NOT seconds */
  unix_end: TimestampMs;
  columns: string[];
  file_format: "csv" | "xlsx";
  email: string;
  is_comment?: boolean;
  dedupe?: boolean;
  limit?: number;
  recipients?: string[];
  email_subject?: string;
  timezone?: string;
}

/* ── Response Envelopes ── */
export interface ListTasksResponse {
  data: Task[];
  pagination: Pagination;
}

export interface GetTaskResponse {
  data: Task;
}

export interface CreateTaskResponse {
  data: Record<string, unknown>;
}

export interface UpdateTaskResponse {
  data: {
    task_id: number;
    updated: boolean;
  };
}

export interface DeleteTaskResponse {
  data: {
    task_id: number;
    deleted: boolean;
  };
}

export interface GetTaskDataParams {
  /** Start unix timestamp in MILLISECONDS (13-digit integer), inclusive. NOT seconds. */
  from: TimestampMs;
  /** End unix timestamp in MILLISECONDS (13-digit integer), inclusive. NOT seconds. */
  to: TimestampMs;
  size: number;
  /** Cursor for pagination: pass the last post's unix_timestamp in MILLISECONDS (13-digit integer). NOT seconds. */
  search_after?: TimestampMs;
}

export interface GetTaskDataResponse {
  data: Post[];
  total: number;
}

export interface ExportTaskResponse {
  result: "success" | "error";
  job_id?: string;
  message?: string;
  error?: string;
}
