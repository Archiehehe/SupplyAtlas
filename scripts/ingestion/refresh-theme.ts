import dotenv from "dotenv";
import { getIngestionEnv } from "../../src/lib/env";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Validating ingestion environment...");
  const env = getIngestionEnv();
  console.log("Ingestion environment validated.");

  // TODO: Implement theme refresh
  console.log("Theme refresh not yet implemented.");
}

main().catch((error) => {
  console.error("Ingestion failed:", error);
  process.exit(1);
});
