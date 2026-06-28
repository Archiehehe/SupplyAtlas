import type { JSX } from "solid-js";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div class="empty-state">
      <div class="empty-state-icon">&#9679;</div>
      <h3 class="empty-state-title">{props.title}</h3>
      <p class="empty-state-desc">{props.description}</p>
      {props.action && <div class="empty-state-action">{props.action}</div>}
    </div>
  );
}
