import { A } from "@solidjs/router";

export default function Themes() {
  return (
    <div class="p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Themes</h1>
      <div class="space-y-2">
        <A href="/themes/ai-datacenter-supply-chain" class="text-blue-600 hover:underline block">
          AI Datacenter Supply Chain
        </A>
      </div>
    </div>
  );
}
