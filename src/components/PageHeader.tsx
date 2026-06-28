import type { JSX } from "solid-js";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: JSX.Element;
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <div class="page-header">
      {props.eyebrow && <div class="page-header-eyebrow">{props.eyebrow}</div>}
      <h1 class="page-header-title">{props.title}</h1>
      {props.description && <p class="page-header-desc">{props.description}</p>}
      {props.actions && <div class="page-header-actions">{props.actions}</div>}
    </div>
  );
}
