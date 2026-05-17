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

/* ── Date Range ── */
export interface DateRange {
  from: number;
  to: number;
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
export interface CreateTaskRequest {
  task_type: "live" | "adhoc";
  task_name: string;
  language: "zh-t" | "zh-s" | "en";
  date_range?: DateRange;
  search_query: SearchQuery;
}

export interface UpdateTaskRequest {
  task_name?: string;
  search_query?: SearchQuery;
}

export interface ExportTaskRequest {
  task_ids?: number[];
  unix_start: number;
  unix_end: number;
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
  from: number;
  to: number;
  size: number;
  search_after?: number;
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
