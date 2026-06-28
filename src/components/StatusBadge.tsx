interface StatusBadgeProps {
  status?: string | null;
}

const BADGE_CLASSES: Record<string, string> = {
  approved: "badge badge-green",
  published: "badge badge-green",
  pending_review: "badge badge-yellow",
  draft: "badge badge-default",
  rejected: "badge badge-red",
  needs_source: "badge badge-yellow",
};

const BADGE_LABELS: Record<string, string> = {
  approved: "Approved",
  published: "Published",
  pending_review: "Pending Review",
  draft: "Draft",
  rejected: "Rejected",
  needs_source: "Needs Source",
};

export function StatusBadge(props: StatusBadgeProps) {
  const s = props.status || "";
  const cls = BADGE_CLASSES[s] || "badge badge-default";
  const label = BADGE_LABELS[s] || s.replace(/_/g, " ") || "Unknown";
  return <span class={cls}>{label}</span>;
}
