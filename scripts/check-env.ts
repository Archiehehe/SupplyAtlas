import dotenv from "dotenv";
import { getDatabaseEnv, getAuthEnv, getRuntimeProviderEnv, getIngestionEnv } from "../src/lib/env";

dotenv.config({ path: ".env.local" });

type EnvCheck = "all" | "database" | "auth" | "runtime" | "ingestion";

const checkType = process.argv[2] as EnvCheck || "all";

function checkAndReport<T>(
  name: string,
  checker: () => T
) {
  try {
    checker();
    console.log(`✅ ${name} env: all present`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.log(`❌ Missing ${name} env:`);
      const message = error.message;
      const varsMatch = message.match(/Missing required environment variables: (.*)/);
      if (varsMatch) {
        const vars = varsMatch[1].split(", ");
        vars.forEach(v => console.log(v));
      }
    }
    return false;
  }
}

let allPassed = true;

if (checkType === "all" || checkType === "database") {
  if (!checkAndReport("database", getDatabaseEnv)) allPassed = false;
}
if (checkType === "all" || checkType === "auth") {
  if (!checkAndReport("auth", getAuthEnv)) allPassed = false;
}
if (checkType === "all" || checkType === "runtime") {
  if (!checkAndReport("runtime provider", getRuntimeProviderEnv)) allPassed = false;
}
if (checkType === "all" || checkType === "ingestion") {
  if (!checkAndReport("ingestion", getIngestionEnv)) allPassed = false;
}

process.exit(allPassed ? 0 : 1);
