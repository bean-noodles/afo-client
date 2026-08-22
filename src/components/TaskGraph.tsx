import { useMemo, useState } from "react";
import type { Task, TaskStatus } from "../data/tasks";

interface TaskGraphProps {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

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
  { border: "rgba(45, 217, 163, 0.35)", bg: "rgba(45, 217, 163, 0.06)", label: "#2dd9a3" },
  { border: "rgba(140, 122, 255, 0.35)", bg: "rgba(140, 122, 255, 0.07)", label: "#a99bff" },
  { border: "rgba(240, 148, 51, 0.35)", bg: "rgba(240, 148, 51, 0.06)", label: "#f0a447" },
  { border: "rgba(96, 165, 250, 0.35)", bg: "rgba(96, 165, 250, 0.06)", label: "#7dbaff" },
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

export function TaskGraph({ tasks, selectedId, onSelect }: TaskGraphProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(tasks.map((t) => t.id))
  );
  const { nodes, waves, width, height } = useMemo(
    () => layout(tasks, collapsedIds),
    [tasks, collapsedIds]
  );
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const waveByRow = useMemo(
    () => new Map(waves.map((w) => [w.waveNumber - 1, w])),
    [waves]
  );

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Outer top/bottom edge of a node, accounting for its wave box. */
  const topOf = (n: PositionedTask) => waveByRow.get(n.rowIndex)?.y ?? n.y;
  const bottomOf = (n: PositionedTask) => {
    const w = waveByRow.get(n.rowIndex);
    return w ? w.y + w.height : n.y + n.height;
  };

  return (
    <div className="task-graph" style={{ width, height }}>
      <svg className="task-graph__edges" width={width} height={height}>
        {nodes.map((n) => {
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
                <path
                  key={`${s.id}->${n.id}`}
                  d={branchPath(s.x + NODE_WIDTH / 2, bottomOf(s), tx, busY)}
                  className={`task-edge task-edge--${s.status}`}
                />
              ))}
              <path
                d={`M ${tx} ${busY} L ${tx} ${targetTop}`}
                className={`task-edge task-edge--${stemStatus}`}
              />
            </g>
          );
        })}
      </svg>

      {waves.map((w) => (
        <div
          key={`wave-${w.waveNumber}`}
          className="wave-box"
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
        </div>
      ))}

      {nodes.map((n) => {
        const progress = PROGRESS[n.status];
        const isCollapsed = collapsedIds.has(n.id);
        return (
          <button
            key={n.id}
            type="button"
            className={`task-node status-${n.status}${
              n.id === selectedId ? " is-selected" : ""
            }`}
            style={{ left: n.x, top: n.y, width: NODE_WIDTH, height: n.height }}
            onClick={() => {
              onSelect(n.id);
              toggleCollapsed(n.id);
            }}
          >
            <div className="task-node__header">
              <span
                className="task-node__swatch"
                style={{ background: agentColor(n.assignedToName) }}
              />
              <span className="task-node__agent">{n.assignedToName}</span>
            </div>

            <div className="task-node__title">{n.title}</div>

            <div className="task-node__divider" />

            {!isCollapsed && (
              <>
                <div className="task-node__section">
                  <span className="task-node__label">설명</span>
                  <p className="task-node__text task-node__text--desc">{n.description}</p>
                </div>

                <div className="task-node__section">
                  <span className="task-node__label">출력</span>
                  <p className="task-node__text task-node__text--output">
                    {n.output ?? "아직 출력이 없습니다."}
                  </p>
                </div>
              </>
            )}

            <div className="task-node__progress-row">
              <div className="task-node__track">
                <div
                  className="task-node__fill"
                  style={{ width: `${progress.pct}%`, background: progress.color }}
                />
              </div>
              <span className="task-node__status" style={{ color: progress.color }}>
                {progress.text}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
