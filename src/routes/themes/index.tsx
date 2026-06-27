import { A } from "@solidjs/router";

export default function Themes() {
  return (
    <div>
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Themes</h1>
      <div class="space-y-2">
        <A href="/themes/technology" class="text-blue-600 hover:underline">Technology</A>
        <br />
        <A href="/themes/renewable-energy" class="text-blue-600 hover:underline">Renewable Energy</A>
        <br />
        <A href="/themes/fintech" class="text-blue-600 hover:underline">Fintech</A>
      </div>
    </div>
  );
}
