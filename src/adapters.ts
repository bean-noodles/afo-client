// Maps AFO API response shapes onto the shapes the UI already speaks
// (data/tasks.ts's Task, and the log entries the System Log panel renders).

import type { Task, TaskStatus } from "./data/tasks";
import type { EnrichedTask, SessionDetail, SessionLogLine } from "./types";

/**
 * The API's `status` is a free-form string: it passes through from the
 * uploaded squad archive and falls back to "unknown" when absent, with no
 * enum constraint in the schema. So map the values we know and treat
 * anything unrecognized as pending rather than trusting the string.
 */
const STATUS_BY_NAME: Record<string, TaskStatus> = {
  completed: "done",
  complete: "done",
  done: "done",
  success: "done",
  succeeded: "done",
  failed: "failed",
  failure: "failed",
  error: "failed",
  cancelled: "failed",
  running: "in_progress",
  in_progress: "in_progress",
  "in-progress": "in_progress",
  active: "in_progress",
  started: "in_progress",
  pending: "pending",
  waiting: "pending",
  queued: "pending",
  todo: "pending",
};

export function toTaskStatus(raw: string): TaskStatus {
  return STATUS_BY_NAME[raw.trim().toLowerCase()] ?? "pending";
}

/**
 * The API omits per-task start/finish timestamps (the columns exist in the
 * backend's `tasks` table but `EnrichedTask` never surfaces them), so the
 * fields our Task carries stay null and the log is built from the session
 * timeline instead.
 */
export function toTask(task: EnrichedTask): Task {
  return {
    id: task.task_id,
    title: task.title,
    description: task.description ?? "",
    output: task.output,
    status: toTaskStatus(task.status),
    assignedToName: task.agent_name,
    assignedToIcon: task.agent_icon ?? "",
    dependsOn: task.depends_on,
    startedAt: null,
    completedAt: null,
  };
}

/**
 * The graph derives waves from `dependsOn`, but the backend already decided
 * them (`session.waves`, mirrored per task as `wave`). Rewriting each task's
 * dependencies to point at the previous wave keeps the rendered waves
 * identical to the backend's without changing the layout algorithm.
 */
export function toTasks(session: SessionDetail): Task[] {
  const tasks = session.tasks.map(toTask);
  const waveOf = new Map(session.tasks.map((t) => [t.task_id, t.wave]));
  const hasWaves = session.tasks.some((t) => t.wave !== null);
  if (!hasWaves) return tasks;

  const idsByWave = new Map<number, string[]>();
  for (const t of session.tasks) {
    if (t.wave === null) continue;
    const bucket = idsByWave.get(t.wave) ?? [];
    bucket.push(t.task_id);
    idsByWave.set(t.wave, bucket);
  }

  return tasks.map((task) => {
    const wave = waveOf.get(task.id);
    if (wave === null || wave === undefined || wave === 0) {
      return { ...task, dependsOn: wave === 0 ? [] : task.dependsOn };
    }
    // Keep real dependencies when they already sit in the previous wave;
    // otherwise anchor to that wave so depth matches the backend's index.
    const previous = idsByWave.get(wave - 1) ?? [];
    const kept = task.dependsOn.filter((id) => previous.includes(id));
    return { ...task, dependsOn: kept.length > 0 ? kept : previous };
  });
}

export interface LogEntry {
  id: string;
  time: string;
  agentName: string;
  text: string;
}

export function toLogEntries(timeline: SessionLogLine[]): LogEntry[] {
  return timeline.map((line, index) => ({
    id: `${index}-${line.timestamp}`,
    time: line.timestamp,
    agentName: line.agent_id ?? line.level,
    text: line.message,
  }));
}
