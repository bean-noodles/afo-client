// Mirrors the AFO API's Pydantic response shapes (AFO-api/app/schemas/*.py)
// field-for-field, snake_case JSON as-is.

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SquadAgent {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  role_type: string;
  role_label: string;
  system_prompt: string | null;
  model_id: string | null;
}

export interface SessionSummary {
  id: string;
  execution_id: string;
  request: string | null;
  status: string;
  started_at: string | null;
  duration_ms: number;
  task_count: number;
  agent_names: string[];
  total_tokens: number;
}

export interface SquadSummary {
  id: string;
  squad_id: string | null;
  squad_name: string | null;
  description: string | null;
  session_count: number;
  created_at: string;
  updated_at: string;
}

export interface SquadDetail extends SquadSummary {
  workspace_path: string | null;
  planner_agent_id: string | null;
  warnings: string[];
  agents: SquadAgent[];
  sessions: SessionSummary[];
}

export interface SessionLogLine {
  timestamp: string;
  level: string;
  agent_id: string | null;
  message: string;
}

export interface SquadEvent {
  id: number;
  event_type: string;
  squad_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface EnrichedTask {
  task_id: string;
  title: string;
  agent_id: string;
  agent_name: string;
  status: string;
  output: string | null;
  error: string | null;
  duration_ms: number;
  token_usage: TokenUsage;
  description: string | null;
  priority: string | null;
  depends_on: string[];
  wave: number | null;
  agent_icon: string | null;
  agent_role: string | null;
  progress_log: string | null;
}

export interface SessionDetail {
  id: string;
  execution_id: string;
  request: string | null;
  plan_title: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number;
  waves: string[][];
  tasks: EnrichedTask[];
  final_result: string | null;
  total_token_usage: TokenUsage;
  per_agent_token_usage: Record<string, TokenUsage>;
  timeline: SessionLogLine[];
  events: SquadEvent[];
  report: string | null;
  planner_warning: string | null;
}

export interface UploadResult {
  squad: SquadSummary;
  warnings: string[];
}
