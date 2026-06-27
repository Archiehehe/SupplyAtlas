import { useParams } from "@solidjs/router";

export default function CompanyDetail() {
  const params = useParams();
  return (
    <div>
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Company: {params.ticker}</h1>
      <p class="text-gray-600">Details about {params.ticker} will be displayed here.</p>
    </div>
  );
}
