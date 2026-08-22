import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Task, TaskStatus } from "../data/tasks";

interface TaskGraphProps {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Fires once, the moment the reveal sequence finishes its last wave. */
  onSequenceComplete?: () => void;
}

/** How fast the 설명/출력 text types out. */
const TYPE_CHARS_PER_TICK = 2;
const TYPE_TICK_MS = 16;
/** Beat between a wave finishing and the next one opening. */
const WAVE_HOLD_MS = 600;
/** How slowly a connecting line draws in when it first appears. */
const EDGE_DRAW_S = 0.7;
/** How slowly a node/wave box grows or shrinks when it (auto- or manually-)
 * expands or collapses. */
const COLLAPSE_TRANSITION = { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const };

/**
 * A wave runs: nodes open expanded and type their text while the progress bar
 * climbs in step with it — the whole processing time is one even rise, not a
 * flat wait followed by a fast catch-up. Once typing lands, it holds at 100%
 * briefly, then collapses and the next wave opens.
 */
type WavePhase = "typing" | "hold";

const outputTextOf = (t: Task) => t.output ?? "아직 출력이 없습니다.";

const COLUMN_WIDTH = 328;
const NODE_WIDTH = 304;
const NODE_HEIGHT = 292;
const COLLAPSED_NODE_HEIGHT = 140;
const V_GAP = 32;
const WAVE_PAD = 13;
const WAVE_LABEL_H = 22;
const CORNER = 10;
const BUS_OFFSET = 16;

const AGENT_COLORS: Record<string, string> = {
  연구자: "#2dd9a3",
  분석가: "#6d7bff",
  요약가: "#ec4899",
};

function agentColor(name: string) {
  return AGENT_COLORS[name] ?? "#8b8798";
}

const PROGRESS: Record<TaskStatus, { pct: number; text: string; color: string }> = {
  pending: { pct: 0, text: "Waiting", color: "#6b7280" },
  in_progress: { pct: 55, text: "Processing...", color: "#f0b429" },
  done: { pct: 100, text: "Complete!", color: "#34d399" },
  failed: { pct: 100, text: "Failed", color: "#f87171" },
};

/** Wave box accent, cycled by wave index. */
const WAVE_TINTS = [
  { border: "rgba(45, 217, 163, 0.35)", bg: "rgba(45, 217, 163, 0.16)", label: "#2dd9a3" },
  { border: "rgba(140, 122, 255, 0.35)", bg: "rgba(140, 122, 255, 0.17)", label: "#a99bff" },
  { border: "rgba(240, 148, 51, 0.35)", bg: "rgba(240, 148, 51, 0.16)", label: "#f0a447" },
  { border: "rgba(96, 165, 250, 0.35)", bg: "rgba(96, 165, 250, 0.16)", label: "#7dbaff" },
];

interface PositionedTask extends Task {
  x: number;
  y: number;
  height: number;
  rowIndex: number;
}

interface WaveBox {
  waveNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tint: (typeof WAVE_TINTS)[number];
}

/**
 * Dependency depth per task — the wave a task belongs to. Depends only on the
 * task list, so the reveal animation can derive collapse state from it without
 * feeding back into `layout`'s own collapse-driven heights.
 */
function rowIndexMap(tasks: Task[]) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const cache = new Map<string, number>();

  function depthOf(id: string): number {
    if (cache.has(id)) return cache.get(id)!;
    const t = byId.get(id);
    const d = !t || t.dependsOn.length === 0 ? 0 : 1 + Math.max(...t.dependsOn.map(depthOf));
    cache.set(id, d);
    return d;
  }

  return new Map(tasks.map((t) => [t.id, depthOf(t.id)]));
}

function layout(tasks: Task[], collapsedIds: Set<string>) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const depthCache = new Map<string, number>();
  const heightOf = (t: Task) => (collapsedIds.has(t.id) ? COLLAPSED_NODE_HEIGHT : NODE_HEIGHT);

  function depthOf(id: string): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const t = byId.get(id);
    const d = !t || t.dependsOn.length === 0 ? 0 : 1 + Math.max(...t.dependsOn.map(depthOf));
    depthCache.set(id, d);
    return d;
  }

  const rows: Task[][] = [];
  tasks.forEach((t) => {
    const d = depthOf(t.id);
    (rows[d] ??= []).push(t);
  });

  const maxCols = Math.max(...rows.map((r) => r.length));
  const contentWidth = maxCols * COLUMN_WIDTH - (COLUMN_WIDTH - NODE_WIDTH);
  // leave room so a wave box around the widest row is not clipped
  const width = contentWidth + WAVE_PAD * 2;
  const centerX = width / 2;

  const positions = new Map<string, { x: number; y: number; height: number }>();
  const waves: WaveBox[] = [];
  let cursorY = 0;

  rows.forEach((row, rowIndex) => {
    const isWave = row.length > 1;
    const rowWidth = row.length * COLUMN_WIDTH - (COLUMN_WIDTH - NODE_WIDTH);
    const startX = centerX - rowWidth / 2;
    const nodeY = cursorY + (isWave ? WAVE_PAD + WAVE_LABEL_H : 0);
    const rowHeight = Math.max(...row.map(heightOf));

    row.forEach((t, colIndex) => {
      positions.set(t.id, { x: startX + colIndex * COLUMN_WIDTH, y: nodeY, height: heightOf(t) });
    });

    if (isWave) {
      waves.push({
        waveNumber: rowIndex + 1,
        x: startX - WAVE_PAD,
        y: cursorY,
        width: rowWidth + WAVE_PAD * 2,
        height: WAVE_LABEL_H + WAVE_PAD * 2 + rowHeight,
        tint: WAVE_TINTS[rowIndex % WAVE_TINTS.length],
      });
    }

    cursorY = nodeY + rowHeight + (isWave ? WAVE_PAD : 0) + V_GAP;
  });

  const nodes: PositionedTask[] = tasks.map((t) => {
    const d = depthOf(t.id);
    return { ...t, ...positions.get(t.id)!, rowIndex: d };
  });

  return { nodes, waves, width, height: Math.max(0, cursorY - V_GAP) };
}

/**
 * Branch from a source's bottom-center down to the shared bus line, then
 * horizontally toward the target's center. The vertical drop into the target
 * is drawn once as a separate stem, so the branches visually merge into it.
 */
function branchPath(sx: number, sy: number, tx: number, busY: number) {
  if (Math.abs(tx - sx) < 1) return `M ${sx} ${sy} L ${sx} ${busY}`;
  const dir = tx > sx ? 1 : -1;
  return [
    `M ${sx} ${sy}`,
    `L ${sx} ${busY - CORNER}`,
    `Q ${sx} ${busY} ${sx + dir * CORNER} ${busY}`,
    `L ${tx} ${busY}`,
  ].join(" ");
}

export function TaskGraph({
  tasks,
  selectedId,
  onSelect,
  onSequenceComplete,
}: TaskGraphProps) {
  const rowIndexById = useMemo(() => rowIndexMap(tasks), [tasks]);
  const rowCount = useMemo(
    () => Math.max(0, ...[...rowIndexById.values()].map((r) => r + 1)),
    [rowIndexById]
  );

  // The reveal cursor. Swapping these two for backend-driven values is all it
  // should take to hand the sequence over to real execution events.
  const [activeRow, setActiveRow] = useState(0);
  const [phase, setPhase] = useState<WavePhase>("typing");
  const [typed, setTyped] = useState(0);
  // Nodes the user manually clicked open/closed, overriding the auto state —
  // this is what lets a finished, auto-collapsed node be reopened by hand.
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());
  const activeNodeRef = useRef<HTMLButtonElement | null>(null);

  const finished = activeRow >= rowCount;

  const toggleManualOverride = (id: string) => {
    setManualOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Longest 설명+출력 in the running wave — typing ends when this is reached. */
  const rowChars = useMemo(() => {
    const lengths = tasks
      .filter((t) => rowIndexById.get(t.id) === activeRow)
      .map((t) => t.description.length + outputTextOf(t).length);
    return lengths.length ? Math.max(...lengths) : 0;
  }, [tasks, rowIndexById, activeRow]);

  useEffect(() => {
    if (finished || phase !== "typing") return;
    if (typed >= rowChars) {
      setPhase("hold");
      return;
    }
    const id = setTimeout(
      () => setTyped((c) => Math.min(c + TYPE_CHARS_PER_TICK, rowChars)),
      TYPE_TICK_MS
    );
    return () => clearTimeout(id);
  }, [finished, phase, typed, rowChars]);

  useEffect(() => {
    if (finished || phase !== "hold") return;
    const id = setTimeout(() => {
      // Drop any manual open/close the user set on this row while it was
      // running — it just auto-collapsed, and should start there cleanly.
      setManualOverrides((prev) => {
        const next = new Set(prev);
        tasks.forEach((t) => {
          if (rowIndexById.get(t.id) === activeRow) next.delete(t.id);
        });
        return next;
      });
      setActiveRow((r) => r + 1);
      setTyped(0);
      setPhase("typing");
    }, WAVE_HOLD_MS);
    return () => clearTimeout(id);
  }, [finished, phase, activeRow, tasks, rowIndexById]);

  // Follow the run: scroll the newly active wave into view as it opens.
  useEffect(() => {
    activeNodeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeRow]);

  // Let the parent know the reveal actually finished — e.g. so a final
  // summary waits for the last wave instead of showing up alongside it.
  useEffect(() => {
    if (finished) onSequenceComplete?.();
  }, [finished]);

  // Only the running wave is expanded; finished waves fold back up — unless
  // the user manually toggled a node, which flips its effective state. This
  // feeds `layout()` directly so a manually-reopened past node gets its full
  // height back instead of staying clipped at the collapsed height.
  const collapsedIds = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => {
      const autoCollapsed = rowIndexById.get(t.id) !== activeRow;
      const collapsed = manualOverrides.has(t.id) ? !autoCollapsed : autoCollapsed;
      if (collapsed) s.add(t.id);
    });
    return s;
  }, [tasks, rowIndexById, activeRow, manualOverrides]);

  const { nodes, waves, width } = useMemo(
    () => layout(tasks, collapsedIds),
    [tasks, collapsedIds]
  );
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const waveByRow = useMemo(
    () => new Map(waves.map((w) => [w.waveNumber - 1, w])),
    [waves]
  );

  /** Outer top/bottom edge of a node, accounting for its wave box. */
  const topOf = (n: PositionedTask) => waveByRow.get(n.rowIndex)?.y ?? n.y;
  const bottomOf = (n: PositionedTask) => {
    const w = waveByRow.get(n.rowIndex);
    return w ? w.y + w.height : n.y + n.height;
  };

  // Waves past the cursor are not drawn at all, so the graph grows downward as
  // the run advances. Width still comes from the full layout, so revealing a
  // wider wave never shifts what is already on screen.
  const revealedNodes = nodes.filter((n) => n.rowIndex <= activeRow);
  const revealedWaves = waves.filter((w) => w.waveNumber - 1 <= activeRow);
  const height = revealedNodes.length
    ? Math.max(...revealedNodes.map(bottomOf))
    : 0;

  return (
    // Not itself layout-animated: its children are absolutely positioned, so
    // resizing it instantly never clips anything, and skipping it here avoids
    // a wobble from nesting two layout-animated boxes inside one another.
    <div className="task-graph" style={{ width, height }}>
      <svg className="task-graph__edges" width={width} height={height}>
        {revealedNodes.map((n) => {
          const sources = n.dependsOn
            .map((id) => nodeById.get(id))
            .filter((s): s is PositionedTask => !!s);
          if (sources.length === 0) return null;

          const tx = n.x + NODE_WIDTH / 2;
          const targetTop = topOf(n);
          const busY = targetTop - BUS_OFFSET;
          const allDone = sources.every((s) => s.status === "done");
          const stemStatus = allDone ? "done" : "pending";

          return (
            <g key={`edges-${n.id}`}>
              {sources.map((s) => (
                <motion.path
                  key={`${s.id}->${n.id}`}
                  d={branchPath(s.x + NODE_WIDTH / 2, bottomOf(s), tx, busY)}
                  className={`task-edge task-edge--${s.status}`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: EDGE_DRAW_S, ease: "easeInOut" }}
                />
              ))}
              <motion.path
                d={`M ${tx} ${busY} L ${tx} ${targetTop}`}
                className={`task-edge task-edge--${stemStatus}`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: EDGE_DRAW_S, ease: "easeInOut", delay: EDGE_DRAW_S }}
              />
            </g>
          );
        })}
      </svg>

      {revealedWaves.map((w) => (
        <motion.div
          key={`wave-${w.waveNumber}`}
          className="wave-box"
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: "easeOut", layout: COLLAPSE_TRANSITION }}
          style={{
            left: w.x,
            top: w.y,
            width: w.width,
            height: w.height,
            borderColor: w.tint.border,
            background: w.tint.bg,
          }}
        >
          <span className="wave-box__label" style={{ color: w.tint.label }}>
            Wave {w.waveNumber}
          </span>
        </motion.div>
      ))}

      {revealedNodes.map((n) => {
        const isRunning = n.rowIndex === activeRow;
        // `collapsedIds` already folds in manualOverrides (see above), so it
        // is both the source `layout()` sized this node from and the source
        // of truth for whether to render the 설명/출력 sections here.
        const isCollapsed = collapsedIds.has(n.id);

        // Waves behind the cursor have finished. The running one climbs in
        // lockstep with typing, so the whole processing time — not just a
        // burst at the end — is spent rising evenly to 100%.
        const typedPct = rowChars ? Math.min(100, (typed / rowChars) * 100) : 100;
        const progress = !isRunning
          ? { ...PROGRESS.done, pct: 100 }
          : phase === "hold"
            ? { ...PROGRESS.done, pct: 100 }
            : { ...PROGRESS.in_progress, pct: typedPct };

        // 설명 types out first, then 출력 picks up where it left off.
        const description = n.description;
        const output = outputTextOf(n);
        const shownDescription = isRunning ? description.slice(0, typed) : description;
        const shownOutput = !isRunning
          ? output
          : typed > description.length
            ? output.slice(0, typed - description.length)
            : "";

        return (
          <motion.button
            key={n.id}
            ref={isRunning ? activeNodeRef : undefined}
            type="button"
            className={`task-node status-${n.status}${
              n.id === selectedId ? " is-selected" : ""
            }`}
            layout
            // Only opacity animates on mount — a manual `y` tween here would
            // fight the `layout` projection for control of `transform` and
            // starve the collapse/expand animation of its own transition.
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.35, ease: "easeOut", layout: COLLAPSE_TRANSITION }}
            style={{ left: n.x, top: n.y, width: NODE_WIDTH, height: n.height }}
            onClick={() => {
              onSelect(n.id);
              toggleManualOverride(n.id);
            }}
          >
            {/* Each direct child gets its own `layout`, so framer-motion
                counter-scales it against the button's collapse/expand FLIP
                transform — without this, text visibly stretches vertically
                for the first frame of the animation. */}
            <motion.div layout className="task-node__header">
              <span
                className="task-node__swatch"
                style={{ background: agentColor(n.assignedToName) }}
              />
              <span className="task-node__agent">{n.assignedToName}</span>
            </motion.div>

            <motion.div layout className="task-node__title">
              {n.title}
            </motion.div>

            <motion.div layout className="task-node__divider" />

            {!isCollapsed && (
              <>
                <motion.div layout className="task-node__section">
                  <span className="task-node__label">설명</span>
                  <p className="task-node__text task-node__text--desc">
                    {shownDescription}
                  </p>
                </motion.div>

                <motion.div layout className="task-node__section">
                  <span className="task-node__label">출력</span>
                  <p className="task-node__text task-node__text--output">
                    {shownOutput}
                  </p>
                </motion.div>
              </>
            )}

            <motion.div layout className="task-node__progress-row">
              <div className="task-node__track">
                <div
                  className="task-node__fill"
                  style={{ width: `${progress.pct}%`, background: progress.color }}
                />
              </div>
              <span className="task-node__status" style={{ color: progress.color }}>
                {progress.text}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
}
