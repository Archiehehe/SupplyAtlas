import { createAsync, query, action, useAction, redirect } from "@solidjs/router";
import { Suspense, createSignal, For, Show } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { isDatabaseConfigured, isAuthConfigured } from "../lib/env";

const loadAdmin = query(async () => {
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return { type: "unauthenticated" } as const;
  const session = await getCurrentUser(event.request);
  if (!session) return { type: "unauthenticated" } as const;
  const user = session.user as { id: string; email: string; role?: string };
  if (user.role !== "admin") return { type: "forbidden" } as const;
  const adminQueries = await import("../db/queries/admin");
  const [themes, companies, nodes, edges, sourceDocuments, candidateEdges, auditLogs] = await Promise.all([
    adminQueries.getAdminThemes(),
    adminQueries.getAdminCompanies(),
    adminQueries.getAdminNodes(),
    adminQueries.getAdminEdges(),
    adminQueries.getAdminSourceDocuments(),
    adminQueries.getAdminCandidateEdges(),
    adminQueries.getAdminAuditLogs(),
  ]);
  return { type: "admin", user, themes, companies, nodes, edges, sourceDocuments, candidateEdges, auditLogs } as const;
}, "admin-data");

const createThemeAction = action(async (formData: FormData) => {
  "use server";
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return new Error("No request event");
  const session = await getCurrentUser(event.request);
  if (!session) return new Error("Unauthorized");
  if ((session.user as { role?: string }).role !== "admin") return new Error("Forbidden");
  const { createTheme } = await import("../db/queries/admin");
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string || undefined;
  const type = formData.get("type") as string || "other";
  await createTheme({ name, slug, description, type: type as "sector" | "thematic" | "regulatory" | "other" }, session.user.id);
  throw redirect("/admin");
});

const createCompanyAction = action(async (formData: FormData) => {
  "use server";
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return new Error("No request event");
  const session = await getCurrentUser(event.request);
  if (!session) return new Error("Unauthorized");
  if ((session.user as { role?: string }).role !== "admin") return new Error("Forbidden");
  const { createCompany } = await import("../db/queries/admin");
  await createCompany({
    name: formData.get("name") as string,
    ticker: formData.get("ticker") as string,
    exchange: formData.get("exchange") as string,
    sector: formData.get("sector") as string || undefined,
    industry: formData.get("industry") as string || undefined,
    website: formData.get("website") as string || undefined,
    description: formData.get("description") as string || undefined,
    headquarters: formData.get("headquarters") as string || undefined,
  }, session.user.id);
  throw redirect("/admin");
});

const createNodeAction = action(async (formData: FormData) => {
  "use server";
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return new Error("No request event");
  const session = await getCurrentUser(event.request);
  if (!session) return new Error("Unauthorized");
  if ((session.user as { role?: string }).role !== "admin") return new Error("Forbidden");
  const { createNode } = await import("../db/queries/admin");
  const importanceRaw = formData.get("importanceScore") as string;
  await createNode({
    themeId: formData.get("themeId") as string,
    companyId: formData.get("companyId") as string || undefined,
    type: formData.get("type") as string,
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    description: formData.get("description") as string || undefined,
    importanceScore: importanceRaw ? parseInt(importanceRaw) : undefined,
  }, session.user.id);
  throw redirect("/admin");
});

const createEdgeAction = action(async (formData: FormData) => {
  "use server";
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return new Error("No request event");
  const session = await getCurrentUser(event.request);
  if (!session) return new Error("Unauthorized");
  if ((session.user as { role?: string }).role !== "admin") return new Error("Forbidden");
  const { createEdge } = await import("../db/queries/admin");
  const confidenceRaw = formData.get("confidenceScore") as string;
  await createEdge({
    sourceNodeId: formData.get("sourceNodeId") as string,
    targetNodeId: formData.get("targetNodeId") as string,
    relationshipType: formData.get("relationshipType") as string,
    strength: parseInt(formData.get("strength") as string) || 5,
    confidenceScore: confidenceRaw ? parseFloat(confidenceRaw) : undefined,
    explanation: formData.get("explanation") as string || undefined,
    reviewStatus: (formData.get("reviewStatus") as "pending_review" | "approved" | "rejected") || "pending_review",
    published: formData.get("published") === "true",
  }, session.user.id);
  throw redirect("/admin");
});

const createSourceDocAction = action(async (formData: FormData) => {
  "use server";
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return new Error("No request event");
  const session = await getCurrentUser(event.request);
  if (!session) return new Error("Unauthorized");
  if ((session.user as { role?: string }).role !== "admin") return new Error("Forbidden");
  const { createSourceDocument } = await import("../db/queries/admin");
  await createSourceDocument({
    sourceType: formData.get("sourceType") as string,
    title: formData.get("title") as string || undefined,
    url: formData.get("url") as string || undefined,
    content: formData.get("content") as string || undefined,
    publishedAt: formData.get("publishedAt") as string || undefined,
  }, session.user.id);
  throw redirect("/admin");
});

const attachEvidenceAction = action(async (formData: FormData) => {
  "use server";
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return new Error("No request event");
  const session = await getCurrentUser(event.request);
  if (!session) return new Error("Unauthorized");
  if ((session.user as { role?: string }).role !== "admin") return new Error("Forbidden");
  const { attachEvidenceToEdge } = await import("../db/queries/admin");
  await attachEvidenceToEdge({
    edgeId: formData.get("edgeId") as string,
    sourceDocumentId: formData.get("sourceDocumentId") as string,
    quote: formData.get("quote") as string || undefined,
    sourceUrl: formData.get("sourceUrl") as string || undefined,
    extractionMethod: formData.get("extractionMethod") as string || "manual",
  }, session.user.id);
  throw redirect("/admin");
});

function TextInput(props: { name: string; label: string; value?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label class="block text-xs font-medium text-gray-700 mb-1">{props.label}</label>
      <input type="text" name={props.name} value={props.value || ""} placeholder={props.placeholder} required={props.required}
        class="border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-md" />
    </div>
  );
}

function SelectInput(props: { name: string; label: string; options: { value: string; label: string }[]; required?: boolean }) {
  return (
    <div>
      <label class="block text-xs font-medium text-gray-700 mb-1">{props.label}</label>
      <select name={props.name} required={props.required} class="border border-gray-300 rounded px-2 py-1 text-sm max-w-xs w-full">
        <option value="">-- select --</option>
        <For each={props.options}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
      </select>
    </div>
  );
}

function Card(props: { title: string; children: any }) {
  return (
    <div class="border border-gray-300 rounded p-4 mb-6">
      <h3 class="text-sm font-semibold text-gray-800 mb-3">{props.title}</h3>
      {props.children}
    </div>
  );
}

function DataTable(props: { columns: { label: string; key: string }[]; rows: any[] | undefined | null; emptyMsg: string }) {
  const rows = () => props.rows ?? [];
  return (
    <div class="overflow-x-auto">
      {rows().length === 0 ? (
        <p class="text-sm text-gray-500 italic">{props.emptyMsg}</p>
      ) : (
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-gray-100 text-left">
              <For each={props.columns}>{(col) => <th class="px-2 py-1 border border-gray-300 font-medium">{col.label}</th>}</For>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>{(row) =>
              <tr class="hover:bg-gray-50">
                <For each={props.columns}>{(col) =>
                  <td class="px-2 py-1 border border-gray-300">{String(row[col.key] ?? "")}</td>
                }</For>
              </tr>
            }</For>
          </tbody>
        </table>
      )}
    </div>
  );
}

function ThemesSection(props: { data: any[] | undefined; action: any }) {
  const [showForm, setShowForm] = createSignal(false);
  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-900">Themes</h2>
        <button onClick={() => setShowForm(!showForm())} class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          {showForm() ? "Cancel" : "New Theme"}
        </button>
      </div>
      <Show when={showForm()}>
        <Card title="Create Theme">
          <form action={props.action} method="post" class="space-y-2">
            <TextInput name="name" label="Name" required />
            <TextInput name="slug" label="Slug (lowercase kebab-case)" placeholder="e.g. ai-semiconductors" required />
            <TextInput name="description" label="Description" />
            <SelectInput name="type" label="Type" options={[
              { value: "sector", label: "Sector" },
              { value: "thematic", label: "Thematic" },
              { value: "regulatory", label: "Regulatory" },
              { value: "other", label: "Other" },
            ]} />
            <button type="submit" class="mt-2 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
          </form>
        </Card>
      </Show>
      <DataTable columns={[
        { label: "Name", key: "name" },
        { label: "Slug", key: "slug" },
        { label: "Type", key: "type" },
        { label: "Description", key: "description" },
        { label: "Created", key: "createdAt" },
      ]} rows={props.data} emptyMsg="No themes created yet." />
    </div>
  );
}

function CompaniesSection(props: { data: any[] | undefined; action: any }) {
  const [showForm, setShowForm] = createSignal(false);
  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-900">Companies</h2>
        <button onClick={() => setShowForm(!showForm())} class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          {showForm() ? "Cancel" : "New Company"}
        </button>
      </div>
      <Show when={showForm()}>
        <Card title="Create Company">
          <form action={props.action} method="post" class="space-y-2">
            <TextInput name="name" label="Company Name" required />
            <TextInput name="ticker" label="Ticker" placeholder="e.g. AAPL" required />
            <TextInput name="exchange" label="Exchange" placeholder="e.g. NASDAQ" required />
            <TextInput name="sector" label="Sector" />
            <TextInput name="industry" label="Industry" />
            <TextInput name="website" label="Website" />
            <TextInput name="headquarters" label="Headquarters" />
            <TextInput name="description" label="Description" />
            <button type="submit" class="mt-2 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
          </form>
        </Card>
      </Show>
      <DataTable columns={[
        { label: "Name", key: "name" },
        { label: "Sector", key: "sector" },
        { label: "Industry", key: "industry" },
        { label: "Website", key: "website" },
        { label: "Created", key: "createdAt" },
      ]} rows={props.data} emptyMsg="No companies created yet." />
    </div>
  );
}

function NodesSection(props: { data: any[] | undefined; themes: any[] | undefined; action: any }) {
  const [showForm, setShowForm] = createSignal(false);
  const themeOptions = () => (props.themes ?? []).map((t: any) => ({ value: t.id, label: t.name }));
  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-900">Nodes</h2>
        <button onClick={() => setShowForm(!showForm())} class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          {showForm() ? "Cancel" : "New Node"}
        </button>
      </div>
      <Show when={showForm()}>
        <Card title="Create Node">
          <form action={props.action} method="post" class="space-y-2">
            <SelectInput name="themeId" label="Theme" required options={themeOptions()} />
            <SelectInput name="type" label="Node Type" required options={[
              { value: "company", label: "Company" },
              { value: "supplier", label: "Supplier" },
              { value: "customer", label: "Customer" },
              { value: "technology", label: "Technology" },
              { value: "country", label: "Country" },
              { value: "risk", label: "Risk" },
              { value: "catalyst", label: "Catalyst" },
              { value: "regulatory", label: "Regulatory" },
              { value: "other", label: "Other" },
            ]} />
            <TextInput name="name" label="Label" required />
            <TextInput name="slug" label="Slug" required />
            <TextInput name="description" label="Description" />
            <TextInput name="importanceScore" label="Importance (0-100)" />
            <button type="submit" class="mt-2 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
          </form>
        </Card>
      </Show>
      <DataTable columns={[
        { label: "Name", key: "name" },
        { label: "Slug", key: "slug" },
        { label: "Type", key: "type" },
        { label: "Theme ID", key: "themeId" },
        { label: "Created", key: "createdAt" },
      ]} rows={props.data} emptyMsg="No nodes created yet." />
    </div>
  );
}

function EdgesSection(props: { data: any[] | undefined; nodes: any[] | undefined; action: any }) {
  const [showForm, setShowForm] = createSignal(false);
  const nodeOptions = () => (props.nodes ?? []).map((n: any) => ({ value: n.id, label: `${n.name} (${n.type})` }));
  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-900">Edges</h2>
        <button onClick={() => setShowForm(!showForm())} class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          {showForm() ? "Cancel" : "New Edge"}
        </button>
      </div>
      <Show when={showForm()}>
        <Card title="Create Edge">
          <form action={props.action} method="post" class="space-y-2">
            <SelectInput name="sourceNodeId" label="Source Node" required options={nodeOptions()} />
            <SelectInput name="targetNodeId" label="Target Node" required options={nodeOptions()} />
            <TextInput name="relationshipType" label="Relationship Type" placeholder="e.g. supplies, competes_with" required />
            <TextInput name="strength" label="Strength (1-10)" value="5" />
            <TextInput name="confidenceScore" label="Confidence (0-1)" />
            <TextInput name="explanation" label="Explanation" />
            <SelectInput name="reviewStatus" label="Review Status" options={[
              { value: "pending_review", label: "Pending Review" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]} />
            <label class="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" name="published" value="true" class="border border-gray-300 rounded" />
              Published
            </label>
            <button type="submit" class="mt-2 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
          </form>
        </Card>
      </Show>
      <DataTable columns={[
        { label: "Source", key: "sourceNodeId" },
        { label: "Target", key: "targetNodeId" },
        { label: "Relationship", key: "relationshipType" },
        { label: "Strength", key: "strength" },
        { label: "Status", key: "reviewStatus" },
        { label: "Published", key: "published" },
        { label: "Created", key: "createdAt" },
      ]} rows={props.data} emptyMsg="No edges created yet." />
    </div>
  );
}

function EvidenceSection(props: {
  sourceDocuments: any[] | undefined;
  edges: any[] | undefined;
  docAction: any;
  attachAction: any;
}) {
  const [showDocForm, setShowDocForm] = createSignal(false);
  const [showAttachForm, setShowAttachForm] = createSignal(false);
  const edgeOptions = () => (props.edges ?? []).map((e: any) => ({
    value: e.id, label: `${e.relationshipType} (${e.sourceNodeId} \u2192 ${e.targetNodeId})`
  }));
  const docOptions = () => (props.sourceDocuments ?? []).map((d: any) => ({
    value: d.id, label: d.title || d.id
  }));
  return (
    <div>
      <h2 class="text-lg font-bold text-gray-900 mb-4">Evidence</h2>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-800">Source Documents</h3>
        <button onClick={() => setShowDocForm(!showDocForm())} class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          {showDocForm() ? "Cancel" : "New Document"}
        </button>
      </div>
      <Show when={showDocForm()}>
        <Card title="Create Source Document">
          <form action={props.docAction} method="post" class="space-y-2">
            <TextInput name="sourceType" label="Source Type" placeholder="e.g. filing, news, report" required />
            <TextInput name="title" label="Title" />
            <TextInput name="url" label="URL" />
            <TextInput name="content" label="Content" />
            <TextInput name="publishedAt" label="Published Date" placeholder="YYYY-MM-DD" />
            <button type="submit" class="mt-2 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
          </form>
        </Card>
      </Show>
      <DataTable columns={[
        { label: "Title", key: "title" },
        { label: "Type", key: "sourceType" },
        { label: "URL", key: "url" },
        { label: "Created", key: "createdAt" },
      ]} rows={props.sourceDocuments} emptyMsg="No source documents created yet." />
      <div class="flex items-center justify-between mb-4 mt-6">
        <h3 class="text-sm font-semibold text-gray-800">Attach Evidence to Edge</h3>
        <button onClick={() => setShowAttachForm(!showAttachForm())} class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          {showAttachForm() ? "Cancel" : "Attach Evidence"}
        </button>
      </div>
      <Show when={showAttachForm()}>
        <Card title="Attach Evidence">
          <form action={props.attachAction} method="post" class="space-y-2">
            <SelectInput name="edgeId" label="Edge" required options={edgeOptions()} />
            <SelectInput name="sourceDocumentId" label="Source Document" required options={docOptions()} />
            <TextInput name="quote" label="Evidence Quote" />
            <TextInput name="sourceUrl" label="Source URL" />
            <button type="submit" class="mt-2 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Attach</button>
          </form>
        </Card>
      </Show>
    </div>
  );
}

function CandidateEdgesSection(props: { data: any[] | undefined }) {
  return (
    <div>
      <h2 class="text-lg font-bold text-gray-900 mb-4">Candidate Edges</h2>
      <DataTable columns={[
        { label: "Source", key: "sourceLabel" },
        { label: "Target", key: "targetLabel" },
        { label: "Relationship", key: "relationshipType" },
        { label: "Confidence", key: "confidenceScore" },
        { label: "Status", key: "reviewStatus" },
        { label: "Created", key: "createdAt" },
      ]} rows={props.data} emptyMsg="No candidate edges pending review." />
    </div>
  );
}

function AuditLogsSection(props: { data: any[] | undefined }) {
  return (
    <div>
      <h2 class="text-lg font-bold text-gray-900 mb-4">Audit Logs</h2>
      <DataTable columns={[
        { label: "Action", key: "action" },
        { label: "Entity", key: "entityType" },
        { label: "Entity ID", key: "entityId" },
        { label: "Created", key: "createdAt" },
      ]} rows={props.data} emptyMsg="No audit logs recorded." />
    </div>
  );
}

function IngestionRunsSection() {
  return (
    <div>
      <h2 class="text-lg font-bold text-gray-900 mb-4">Ingestion Runs</h2>
      <p class="text-sm text-gray-500 italic">No ingestion runs recorded.</p>
    </div>
  );
}

export default function Admin() {
  const data = createAsync(() => loadAdmin());
  const [tab, setTab] = createSignal("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "themes", label: "Themes" },
    { id: "companies", label: "Companies" },
    { id: "nodes", label: "Nodes" },
    { id: "edges", label: "Edges" },
    { id: "evidence", label: "Evidence" },
    { id: "candidate-edges", label: "Candidate Edges" },
    { id: "ingestion", label: "Ingestion Runs" },
    { id: "audit", label: "Audit Logs" },
  ];

  return (
    <div class="p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Admin Data Studio</h1>
      <Suspense fallback={<p class="text-sm text-gray-500">Loading...</p>}>
        {!isAuthConfigured() ? (
          <p class="text-sm text-gray-600">Auth is not configured. Set BETTER_AUTH_SECRET, BETTER_AUTH_URL, GITHUB_CLIENT_ID, and GITHUB_CLIENT_SECRET in your environment.</p>
        ) : !isDatabaseConfigured() ? (
          <p class="text-sm text-gray-600">Database is not configured. Add DATABASE_URL to continue.</p>
        ) : null}
        <Show when={data()} keyed>{(d) =>
          d.type === "unauthenticated" ? (
            <div>
              <p class="text-sm text-gray-600 mb-4">Please sign in with an authorized admin account.</p>
              <p class="text-xs text-gray-500">After your first GitHub login, promote your user to admin via SQL:</p>
              <pre class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">UPDATE users SET role = 'admin' WHERE email = 'your@email.com';</pre>
            </div>
          ) : d.type === "forbidden" ? (
            <p class="text-sm text-gray-600">You do not have admin access.</p>
          ) : d.type === "admin" ? (
            <div>
              <div class="flex flex-wrap gap-1 mb-6 border-b border-gray-300 pb-1">
                <For each={tabs}>{(t) =>
                  <button onClick={() => setTab(t.id)}
                    classList={{ "bg-blue-600 text-white": tab() === t.id, "text-gray-600 hover:bg-gray-100": tab() !== t.id }}
                    class="text-xs px-3 py-1.5 rounded-t">{t.label}</button>
                }</For>
              </div>
              <div class="min-h-[300px]">
                <Show when={tab() === "overview"}>
                  <div>
                    <h2 class="text-lg font-bold text-gray-900 mb-2">Overview</h2>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                      <div class="border border-gray-300 rounded p-3"><div class="text-2xl font-bold">{d.themes.length}</div><div class="text-xs text-gray-500">Themes</div></div>
                      <div class="border border-gray-300 rounded p-3"><div class="text-2xl font-bold">{d.companies.length}</div><div class="text-xs text-gray-500">Companies</div></div>
                      <div class="border border-gray-300 rounded p-3"><div class="text-2xl font-bold">{d.nodes.length}</div><div class="text-xs text-gray-500">Nodes</div></div>
                      <div class="border border-gray-300 rounded p-3"><div class="text-2xl font-bold">{d.edges.length}</div><div class="text-xs text-gray-500">Edges</div></div>
                      <div class="border border-gray-300 rounded p-3"><div class="text-2xl font-bold">{d.candidateEdges.length}</div><div class="text-xs text-gray-500">Candidate Edges</div></div>
                      <div class="border border-gray-300 rounded p-3"><div class="text-2xl font-bold">{d.sourceDocuments.length}</div><div class="text-xs text-gray-500">Source Documents</div></div>
                    </div>
                    <p class="text-xs text-gray-500">Use the tabs above to create and manage database records. All data is written directly to the database.</p>
                  </div>
                </Show>
                <Show when={tab() === "themes"}><ThemesSection data={d.themes} action={createThemeAction} /></Show>
                <Show when={tab() === "companies"}><CompaniesSection data={d.companies} action={createCompanyAction} /></Show>
                <Show when={tab() === "nodes"}><NodesSection data={d.nodes} themes={d.themes} action={createNodeAction} /></Show>
                <Show when={tab() === "edges"}><EdgesSection data={d.edges} nodes={d.nodes} action={createEdgeAction} /></Show>
                <Show when={tab() === "evidence"}><EvidenceSection sourceDocuments={d.sourceDocuments} edges={d.edges} docAction={createSourceDocAction} attachAction={attachEvidenceAction} /></Show>
                <Show when={tab() === "candidate-edges"}><CandidateEdgesSection data={d.candidateEdges} /></Show>
                <Show when={tab() === "ingestion"}><IngestionRunsSection /></Show>
                <Show when={tab() === "audit"}><AuditLogsSection data={d.auditLogs} /></Show>
              </div>
            </div>
          ) : null}
        </Show>
      </Suspense>
    </div>
  );
}
