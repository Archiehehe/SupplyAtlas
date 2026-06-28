import "./styles/app.css";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { AppShell } from "./components/AppShell";

export default function App() {
  return (
    <Router
      root={(props) => (
        <AppShell>
          <Suspense fallback={<div class="p-8 skeleton skeleton-card" />}>
            {props.children}
          </Suspense>
        </AppShell>
      )}
    />
  );
}
