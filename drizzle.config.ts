import type {Config} from 'drizzle-kit'
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });


export default {
    driver: "pg",
    schema: "./src/lib/db/schema.ts",
    dbCredentials: {
      connectionString: process.env.DATABASE_URL!,
    },
  } satisfies Config;

// npx drizzle-kit push:pg (takes a look at schema and makes sure that the db in neon is synched up with the schema)
