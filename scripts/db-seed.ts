import { connect } from "@/db/connect";
import { seedSampleData } from "@/db/seed";
import { env } from "@/lib/env";

async function main() {
  const connection = connect(env());
  try {
    await seedSampleData(connection.db);
    console.log(`Sample polls seeded (${connection.driver}), timestamps shifted to now.`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
