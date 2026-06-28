import { For } from "solid-js";

interface SkeletonBlockProps {
  type?: "card" | "text" | "heading";
  lines?: number;
}

export function SkeletonBlock(props: SkeletonBlockProps) {
  if (props.type === "card") {
    return <div class="skeleton skeleton-card" />;
  }
  if (props.type === "heading") {
    return <div class="skeleton skeleton-heading" />;
  }
  const count = props.lines || 3;
  return (
    <div>
      <For each={Array.from({ length: count })}>{(_, i) =>
        <div class={`skeleton skeleton-text ${i() === count - 1 ? "short" : ""}`} />
      }</For>
    </div>
  );
}
