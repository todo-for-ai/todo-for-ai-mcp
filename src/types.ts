/**
 * Todo for AI MCP Server Types
 */

export interface TodoConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  apiToken?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  color?: string;
  github_url?: string;
  project_context?: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  created_by: string;
  total_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  statistics?: {
    total_tasks: number;
    todo_tasks: number;
    in_progress_tasks: number;
    review_tasks: number;
    done_tasks: number;
    cancelled_tasks: number;
    completion_rate: number;
  };
  recent_tasks?: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    updated_at: string;
  }>;
}

export interface Task {
  id: number; // Note: This is bigint in database but JavaScript number can handle up to 2^53-1
  project_id: number;
  title: string;
  description?: string;
  content?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  related_files?: string[];
  is_ai_task: boolean;
  feedback_content?: string;
  feedback_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_prev: boolean;
    has_next: boolean;
    prev_num: number | null;
    next_num: number | null;
  };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    status_code: number;
    timestamp: string;
    path: string;
    code?: string;
    details?: any;
  };
}

export interface GetProjectTasksArgs {
  project_name: string;
  status_filter?: ('todo' | 'in_progress' | 'review')[];
}

export interface GetTaskByIdArgs {
  task_id: number;
}

export interface SubmitTaskFeedbackArgs {
  task_id: number;
  project_name: string;
  feedback_content: string;
  status: 'in_progress' | 'review' | 'done' | 'cancelled';
  ai_identifier?: string;
}

export interface CreateTaskArgs {
  project_id: number;
  title: string;
  content?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  related_files?: string[];
  required_capabilities?: string[];
  is_ai_task?: boolean;
  ai_identifier?: string;
}

export interface GetProjectInfoArgs {
  project_id?: number;
  project_name?: string;
}

export type AgentStatus = 'active' | 'paused' | 'offline' | 'disabled';
export type AgentKind = 'assistant' | 'autonomous' | 'coordinator' | 'external';
export type TaskAssignmentState =
  | 'assigned'
  | 'claimed'
  | 'running'
  | 'waiting_human'
  | 'review'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_prev: boolean;
  has_next: boolean;
  prev_num: number | null;
  next_num: number | null;
}

export interface ListResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface Agent {
  id: number;
  owner_id: number;
  name: string;
  description?: string;
  kind: AgentKind;
  status: AgentStatus;
  provider?: string;
  model?: string;
  capabilities: string[];
  config: Record<string, unknown>;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  stats?: {
    active_assignments: number;
    total_runs: number;
  };
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  agent_id: number;
  assigned_by_user_id?: number;
  state: TaskAssignmentState;
  lease_expires_at?: string;
  claimed_at?: string;
  completed_at?: string;
  last_heartbeat_at?: string;
  progress_rate: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  task?: Task;
  agent?: Pick<Agent, 'id' | 'name' | 'kind' | 'status'>;
}

export interface AgentRun {
  id: number;
  task_id: number;
  agent_id: number;
  assignment_id?: number;
  status: 'running' | 'waiting_human' | 'succeeded' | 'failed' | 'cancelled' | 'expired';
  started_at: string;
  ended_at?: string;
  output_summary?: string;
  error?: string;
  input_snapshot: Record<string, unknown>;
  run_metadata: Record<string, unknown>;
}

export interface ListAgentsArgs {
  status?: AgentStatus;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface CreateAgentArgs {
  name: string;
  description?: string;
  kind?: AgentKind;
  status?: AgentStatus;
  provider?: string;
  model?: string;
  capabilities?: string[];
  config?: Record<string, unknown>;
}

export interface UpdateAgentArgs {
  agent_id: number;
  name?: string;
  description?: string;
  kind?: AgentKind;
  status?: AgentStatus;
  provider?: string;
  model?: string;
  capabilities?: string[];
  config?: Record<string, unknown>;
}

export interface HeartbeatAgentArgs {
  agent_id: number;
  status?: AgentStatus;
}

export interface ListAgentAssignmentsArgs {
  agent_id: number;
  state?: TaskAssignmentState;
  page?: number;
  per_page?: number;
}

export interface ListTaskAssignmentsArgs {
  task_id: number;
  state?: TaskAssignmentState | 'active';
  page?: number;
  per_page?: number;
}

export interface TaskEvent {
  id: number;
  task_id: number;
  event_type: string;
  actor_type: 'system' | 'user' | 'agent';
  actor_user_id?: number;
  actor_agent_id?: number;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  actor_agent?: Pick<Agent, 'id' | 'name' | 'kind' | 'status'>;
  actor_user?: {
    id: number;
    name?: string;
    email?: string;
  };
}

export interface ListTaskEventsArgs {
  task_id: number;
  page?: number;
  per_page?: number;
}

export type PostableTaskEventType =
  | 'message'
  | 'note'
  | 'question'
  | 'answer'
  | 'handoff'
  | 'blocker'
  | 'decision'
  | 'info';

export interface PostTaskEventArgs {
  task_id: number;
  content?: string;
  event_type?: PostableTaskEventType;
  agent_id?: number;
  to_agent_id?: number;
  payload?: Record<string, unknown>;
}

export interface GetAgentInboxArgs {
  agent_id: number;
  since_id?: number;
  per_page?: number;
  include_self?: boolean;
}

export interface AgentInboxResult {
  items: TaskEvent[];
  agent_id: number;
  count?: number;
  latest_id?: number;
  since_id?: number;
}

export type ReviewQueueAction = 'all' | 'human_feedback' | 'final_review';

export interface ReviewQueueItem {
  assignment: TaskAssignment;
  task?: Task;
  agent?: Agent;
  action: Exclude<ReviewQueueAction, 'all'> | 'review';
  available_actions: string[];
}

export interface ListReviewQueueArgs {
  action?: ReviewQueueAction;
  page?: number;
  per_page?: number;
}

export interface ClaimAgentTaskArgs {
  agent_id: number;
  task_id?: number;
  project_id?: number;
  lease_seconds?: number;
  match_capabilities?: boolean;
  dispatch_source?: 'human';
  dispatch_notes?: string;
  run_metadata?: Record<string, unknown>;
}

export interface ClaimAgentTaskResult {
  agent: Agent;
  assignment: TaskAssignment;
  run: AgentRun;
}

export interface HandoffTaskArgs {
  task_id: number;
  to_agent_id: number;
  from_assignment_id?: number;
  lease_seconds?: number;
  reason?: string;
  notes?: string;
}

export interface HandoffTaskResult {
  from_assignment: TaskAssignment | null;
  assignment: TaskAssignment;
  run: AgentRun;
}

export interface DispatchTasksArgs {
  agent_id: number;
  project_id?: number;
  max_assignments?: number;
  lease_seconds?: number;
  match_capabilities?: boolean;
  require_capability_match?: boolean;
  candidate_agent_ids?: number[];
  include_self?: boolean;
}

export interface DispatchAssignment {
  assignment: TaskAssignment;
  run: AgentRun;
  agent: Agent;
  strategy: 'capability_match' | 'priority_fifo';
  score: number;
  matched_capabilities: string[];
}

export interface DispatchTasksResult {
  coordinator: Agent;
  assignments: DispatchAssignment[];
  summary: {
    claimable_tasks: number;
    available_agents: number;
    dispatched: number;
    skipped_no_match: number;
  };
}

export interface CreateSubtaskArgs {
  task_id: number;
  title: string;
  content?: string;
  priority?: string;
  tags?: string[];
  agent_id?: number;
}

export interface UpdateAgentAssignmentArgs {
  agent_id: number;
  assignment_id: number;
  state?: TaskAssignmentState;
  progress_rate?: number;
  notes?: string;
  feedback_content?: string;
  output_summary?: string;
  error?: string;
  lease_seconds?: number;
  task_status?: Task['status'];
  run_metadata?: Record<string, unknown>;
}

export interface UpdateTaskAssignmentArgs extends Omit<UpdateAgentAssignmentArgs, 'agent_id'> {
  task_id: number;
}

// --- Notifications ---

export interface NotificationItem {
  id: number;
  user_id: number;
  event_type: string;
  task_id?: number;
  agent_id?: number;
  payload: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  agent_name?: string;
  task_title?: string;
  created_at: string;
  updated_at: string;
}

export interface ListNotificationsArgs {
  since_id?: number;
  unread_only?: boolean;
  per_page?: number;
}

export interface ListNotificationsResult {
  items: NotificationItem[];
  unread_count: number;
  since_id?: number;
}

export interface MarkNotificationsReadArgs {
  ids?: number[];
  all?: boolean;
}

// --- Shared Context ---

export interface SharedContextEntry {
  id: number;
  task_id: number;
  key: string;
  value: string;
  author_agent_id?: number;
  author_user_id?: number;
  author_agent_name?: string;
  author_user_name?: string;
  created_at: string;
  updated_at: string;
}

export interface GetSharedContextArgs {
  task_id: number;
  key?: string;
}

export interface SetSharedContextArgs {
  task_id: number;
  key: string;
  value: string;
  agent_id?: number;
}

export interface DeleteSharedContextArgs {
  task_id: number;
  entry_id: number;
}

// --- Run Logs ---

export type RunLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RunLogEntry {
  id: number;
  run_id: number;
  level: RunLogLevel;
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GetRunLogsArgs {
  run_id: number;
  since_id?: number;
  level?: RunLogLevel;
  per_page?: number;
}

export interface GetRunLogsResult {
  items: RunLogEntry[];
  latest_id: number;
  since_id?: number;
  run_id: number;
}

export interface AppendRunLogEntry {
  level?: RunLogLevel;
  message: string;
  meta?: Record<string, unknown>;
}

export interface AppendRunLogsArgs {
  run_id: number;
  entries: AppendRunLogEntry[];
}

// --- Task Templates ---

export interface TaskTemplate {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  title_template: string;
  content_template: string;
  priority: string;
  tags: string[];
  is_ai_task: boolean;
  capabilities: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTaskTemplateArgs {
  name: string;
  description?: string;
  title_template?: string;
  content_template?: string;
  priority?: string;
  tags?: string[];
  is_ai_task?: boolean;
  capabilities?: string[];
}

export interface InstantiateTaskTemplateArgs {
  template_id: number;
  project_id: number;
  title?: string;
  content?: string;
}

// --- Workflows ---

export interface WorkflowStepDef {
  step_key: string;
  name?: string;
  description?: string;
  order?: number;
  required_capabilities?: string[];
  agent_id?: number;
  task_template_id?: number;
  depends_on?: string[];
  timeout_seconds?: number;
  retry_count?: number;
  on_failure?: 'abort' | 'skip' | 'continue';
}

export interface WorkflowItem {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  version: number;
  definition: Record<string, unknown>;
  is_active: boolean;
  steps: WorkflowStepItem[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepItem {
  id: number;
  workflow_id: number;
  step_key: string;
  name: string;
  description: string;
  order: number;
  required_capabilities: string[];
  agent_id?: number;
  task_template_id?: number;
  depends_on: string[];
  timeout_seconds?: number;
  retry_count: number;
  on_failure: string;
}

export interface CreateWorkflowArgs {
  name: string;
  description?: string;
  definition?: Record<string, unknown>;
  is_active?: boolean;
  steps: WorkflowStepDef[];
}

export interface UpdateWorkflowArgs {
  workflow_id: number;
  name?: string;
  description?: string;
  definition?: Record<string, unknown>;
  is_active?: boolean;
  steps?: WorkflowStepDef[];
}

export interface LaunchWorkflowArgs {
  workflow_id: number;
  project_id: number;
  root_task_id?: number;
  context?: Record<string, unknown>;
}

export interface WorkflowStepRunItem {
  id: number;
  run_id: number;
  step_key: string;
  task_id?: number;
  assignment_id?: number;
  agent_id?: number;
  status: string;
  started_at?: string;
  finished_at?: string;
  error?: string;
  attempt: number;
}

export interface WorkflowRunItem {
  id: number;
  workflow_id: number;
  root_task_id?: number;
  project_id: number;
  owner_id: number;
  status: string;
  context: Record<string, unknown>;
  error?: string;
  started_at?: string;
  finished_at?: string;
  step_runs: WorkflowStepRunItem[];
  created_at: string;
  updated_at: string;
}

export interface CompleteWorkflowStepArgs {
  run_id: number;
  step_key: string;
  success?: boolean;
  error?: string;
  result_summary?: string;
}

// --- Agent Capability Registration ---

export interface RegisterCapabilitiesArgs {
  agent_id: number;
  capabilities: string[];
  mode?: 'replace' | 'merge';
}
