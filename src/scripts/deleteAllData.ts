import { db } from "../core/db";
import { sql } from "drizzle-orm";

import { codeSnippets, examples, interviewProblems, interviews, problemTopics, problems, submissions, testCases, topics } from "../drizzle/schema";

async function resetDatabase() {
  await db.execute(sql`
    TRUNCATE TABLE
      ${codeSnippets},
      ${examples},
      ${interviewProblems},
      ${interviews},
      ${problemTopics},
      ${problems},
      ${submissions},
      ${testCases},
      ${topics}
    RESTART IDENTITY CASCADE;
  `);

  console.log("✅ All data cleared. Tables kept intact.");
}

resetDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
