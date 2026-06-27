import { useParams } from "@solidjs/router";

export default function ThemeDetail() {
  const params = useParams();
  return (
    <div>
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Theme: {params.slug}</h1>
      <p class="text-gray-600">Details about {params.slug} will be displayed here.</p>
    </div>
  );
}
