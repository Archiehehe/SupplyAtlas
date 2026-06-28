import type { JSX } from "solid-js";

interface SectionCardProps {
  title?: string;
  children: JSX.Element;
  class?: string;
}

export function SectionCard(props: SectionCardProps) {
  return (
    <div class={`card ${props.class || ""}`}>
      {props.title && <h3 class="section-title">{props.title}</h3>}
      {props.children}
    </div>
  );
}
