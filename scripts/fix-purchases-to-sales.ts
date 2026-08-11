import { migratePurchasesToSales } from "../src/lib/utils/migratePurchasesToSales";

async function main() {
  console.log("Starting migration of purchases records to sales...");
  // Replace with target business ID if running manually in standalone node runner
  const targetBusinessId = process.env.BUSINESS_ID || "biz_metromart";
  const result = await migratePurchasesToSales(targetBusinessId);
  console.log(`Migration complete! Successfully converted ${result.convertedCount} records from purchases to sales.`);
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
