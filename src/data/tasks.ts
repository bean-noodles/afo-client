export type TaskStatus = "pending" | "in_progress" | "done" | "failed";

export interface Task {
  id: string;
  title: string;
  description: string;
  /** Agent's produced text; `null` until the task yields a result. */
  output: string | null;
  status: TaskStatus;
  assignedToName: string;
  assignedToIcon: string;
  dependsOn: string[];
  startedAt: string | null;
  completedAt: string | null;
}

export const tasks: Task[] = [
  {
    id: "7ecb84e1-8144-4e4f-a2bc-174863c86e65",
    title: "Identify RST Writer Class",
    description:
      "Locate the RST writer class in the Astropy codebase that handles 'ascii.rst' format. Determine where the __init__ method is defined and how it processes arguments.",
    output:
      "The RST writer lives in astropy/io/ascii/rst.py as the `RST` class, subclassing `FixedWidth`. Its `__init__` accepts no explicit keyword arguments.",
    status: "done",
    assignedToName: "연구자",
    assignedToIcon: "🔍",
    dependsOn: [],
    startedAt: "2026-08-22T06:49:45Z",
    completedAt: "2026-08-22T06:50:01Z",
  },
  {
    id: "a1111111-1111-4111-8111-111111111111",
    title: "Locate __init__ Method Definition",
    description:
      "Trace the __init__ method of the RST writer class and document how header_rows and other constructor arguments are captured.",
    output:
      "`RST.__init__(self)` calls `super().__init__(delimiter_pad=None, bookend=False)` without forwarding **kwargs, so any caller-supplied header_rows is silently dropped.",
    status: "done",
    assignedToName: "연구자",
    assignedToIcon: "🔍",
    dependsOn: ["7ecb84e1-8144-4e4f-a2bc-174863c86e65"],
    startedAt: "2026-08-22T06:50:02Z",
    completedAt: "2026-08-22T06:51:10Z",
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    title: "Analyze header_rows Argument Handling",
    description:
      "Evaluate how the header_rows argument flows through the writer and identify where it diverges from the documented behavior.",
    output:
      "FixedWidth accepts header_rows and renders each requested row, but because RST never forwards it, the writer always emits a single header row regardless of the caller's request.",
    status: "in_progress",
    assignedToName: "분석가",
    assignedToIcon: "📊",
    dependsOn: ["a1111111-1111-4111-8111-111111111111"],
    startedAt: "2026-08-22T06:51:12Z",
    completedAt: null,
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    title: "Search Related GitHub Issues",
    description:
      "Search the Astropy issue tracker for prior reports about ascii.rst header handling to see whether this behavior was previously flagged.",
    output:
      "Found two related reports discussing header_rows support across ascii writers; neither covers the RST writer specifically, so this path appears unreported.",
    status: "done",
    assignedToName: "연구자",
    assignedToIcon: "🔍",
    dependsOn: [],
    startedAt: "2026-08-22T06:49:50Z",
    completedAt: "2026-08-22T06:50:40Z",
  },
  {
    id: "a4444444-4444-4444-8444-444444444444",
    title: "Cross-reference Issues with Class Behavior",
    description:
      "Compare the reported GitHub issues against the traced class behavior to confirm whether they describe the same root cause.",
    output: null,
    status: "pending",
    assignedToName: "분석가",
    assignedToIcon: "📊",
    dependsOn: ["a2222222-2222-4222-8222-222222222222", "a3333333-3333-4333-8333-333333333333"],
    startedAt: null,
    completedAt: null,
  },
  {
    id: "a5555555-5555-4555-8555-555555555555",
    title: "Draft Fix Proposal",
    description:
      "Summarize findings and draft a concrete fix proposal for the header_rows handling in the RST writer.",
    output: null,
    status: "pending",
    assignedToName: "요약가",
    assignedToIcon: "📄",
    dependsOn: ["a4444444-4444-4444-8444-444444444444"],
    startedAt: null,
    completedAt: null,
  },
];

/**
 * Mirrors the backend's `finalResult` (the `squad:execution-completed` event
 * payload). `null` until the execution finishes.
 */
export const finalResult: string | null =
  "Astropy의 `ascii.rst` writer는 `RST` 클래스의 `__init__`에서 `header_rows` 인자를 상위 클래스로 전달하지 않아 무시됩니다. `FixedWidth` 계열과 동일하게 `**kwargs`를 통해 전달하도록 수정하면 해결됩니다.";
