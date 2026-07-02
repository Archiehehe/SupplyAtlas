import type { JSX } from "solid-js";

export function AppShell(props: { children: JSX.Element }) {
  return (
    <div class="app-shell">
      <nav class="app-nav">
        <div class="app-nav-inner">
          <a href="/" class="app-nav-brand">SupplyAtlas</a>
          <div class="app-nav-links">
            <a href="/themes">Themes</a>
            <a href="/portfolio">Portfolio</a>
          </div>
        </div>
      </nav>
      <main class="app-main">{props.children}</main>
      <footer class="app-footer">SupplyAtlas &middot; Public Research Database</footer>
    </div>
  );
}
