import { config } from "dotenv";
config({ path: ".env.local" });

import { seed } from "./seed";

seed().catch(console.error).finally(() => process.exit(0));
