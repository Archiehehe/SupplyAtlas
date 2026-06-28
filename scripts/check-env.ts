import dotenv from "dotenv";
import { getDatabaseEnv, getIngestionEnv } from "../src/lib/env";

dotenv.config({ path: ".env.local" });

type EnvCheck = "all" | "database" | "ingestion";

const checkType = process.argv[2] as EnvCheck || "all";

function checkAndReport<T>(
  name: string,
  checker: () => T
) {
  const result = checker();
  if (result !== null) {
    console.log(`\u2705 ${name} env: all present`);
    return true;
  }
  console.log(`\u274c ${name} env: missing`);
  return false;
}

let allPassed = true;

if (checkType === "all" || checkType === "database") {
  if (!checkAndReport("database", getDatabaseEnv)) allPassed = false;
}
if (checkType === "all" || checkType === "ingestion") {
  if (!checkAndReport("ingestion", getIngestionEnv)) allPassed = false;
}

process.exit(allPassed ? 0 : 1);
