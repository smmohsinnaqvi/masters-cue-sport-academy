const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const tables = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `snk-${index + 1}`,
    name: `S${index + 1}`,
    type: "SNOOKER",
    hourlyRate: index === 0 ? 350 : index < 3 ? 320 : 300,
    isActive: true,
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    id: `pool-${index + 1}`,
    name: `P${index + 1}`,
    type: "POOL",
    hourlyRate: 220,
    isActive: true,
  })),
];

async function main() {
  for (const table of tables) {
    await prisma.table.upsert({
      where: { id: table.id },
      update: table,
      create: table,
    });
  }

  const tableCount = await prisma.table.count();
  const sessionCount = await prisma.session.count();
  console.log(`Ready: ${tableCount} tables and ${sessionCount} existing sessions.`);
  console.log("No bookings or sessions were inserted.");
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
