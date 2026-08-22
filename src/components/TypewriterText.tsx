import { useEffect, useState } from "react";

// Matches the pace TaskGraph types out a node's 설명/출력 at, so the whole
// canvas — prompt, nodes, final answer — reads as one consistent typing style.
const CHARS_PER_TICK = 2;
const TICK_MS = 16;

interface TypewriterTextProps {
  text: string;
}

/** Reveals `text` a couple characters at a time; restarts when `text` changes. */
export function TypewriterText({ text }: TypewriterTextProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
  }, [text]);

  useEffect(() => {
    if (shown >= text.length) return;
    const id = setTimeout(
      () => setShown((c) => Math.min(c + CHARS_PER_TICK, text.length)),
      TICK_MS
    );
    return () => clearTimeout(id);
  }, [shown, text]);

  return <>{text.slice(0, shown)}</>;
}
