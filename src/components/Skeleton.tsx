import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={`skeleton${className ? ` ${className}` : ""}`} style={style} />;
}

/** Placeholder rows shown under a squad folder while its sessions load. */
export function SessionListSkeleton() {
  return (
    <div className="project-group__items">
      {[72, 55, 63].map((widthPct, i) => (
        <div key={i} className="chat-item chat-item--skeleton">
          <Skeleton style={{ width: `${widthPct}%`, height: 14 }} />
        </div>
      ))}
    </div>
  );
}

/** Placeholder graph shown while a session's tasks/waves are loading. */
export function TaskGraphSkeleton() {
  return (
    <div className="task-graph-skeleton" aria-label="불러오는 중">
      <div className="task-graph-skeleton__wave">
        <Skeleton className="task-graph-skeleton__node" />
        <Skeleton className="task-graph-skeleton__node" />
      </div>
      <div className="task-graph-skeleton__connector" />
      <Skeleton className="task-graph-skeleton__node task-graph-skeleton__node--single" />
    </div>
  );
}
