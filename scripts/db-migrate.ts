import { connect } from "@/db/connect";
import { runMigrations } from "@/db/migrate";
import { env } from "@/lib/env";

async function main() {
  const connection = connect(env());
  try {
    await runMigrations(connection);
    console.log(`Migrations applied (${connection.driver}).`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
