import { connect } from "@/db/connect";
import { SAMPLE_CREATOR_EMAIL, seedSampleData } from "@/db/seed";
import { env } from "@/lib/env";

async function main() {
  const config = env();
  const connection = connect(config);
  try {
    await seedSampleData(connection.db, { samplePassword: config.SAMPLE_CREATOR_PASSWORD });
    console.log(`Sample polls seeded (${connection.driver}), timestamps shifted to now.`);
    if (config.SAMPLE_CREATOR_PASSWORD) {
      console.log(`You can log in as ${SAMPLE_CREATOR_EMAIL} with SAMPLE_CREATOR_PASSWORD.`);
    }
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
