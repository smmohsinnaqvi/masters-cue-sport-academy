const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");

for (const file of [".env", ".env.local"]) {
  if (fs.existsSync(file)) {
    process.loadEnvFile(file);
  }
}

const prisma = new PrismaClient();
const expectedTables = [
  { id: "snk-1", name: "T1", type: "SNOOKER", hourlyRate: 210 },
  { id: "snk-2", name: "T2", type: "SNOOKER", hourlyRate: 210 },
  { id: "snk-3", name: "T3", type: "SNOOKER", hourlyRate: 210 },
  { id: "snk-4", name: "T4", type: "SNOOKER", hourlyRate: 210 },
  { id: "pool-1", name: "P1", type: "POOL", hourlyRate: 120 },
  { id: "pool-2", name: "P2", type: "POOL", hourlyRate: 120 },
];

async function seedTables() {
  await prisma.$transaction(async (transaction) => {
    for (const table of expectedTables) {
      await transaction.table.upsert({
        where: { id: table.id },
        create: { ...table, isActive: true },
        update: {
          name: table.name,
          type: table.type,
          isActive: true,
        },
      });
    }

    await transaction.table.updateMany({
      where: { type: "SNOOKER", name: { notIn: ["T1", "T2", "T3", "T4"] } },
      data: { isActive: false },
    });
    await transaction.table.updateMany({
      where: { type: "POOL", name: { notIn: ["P1", "P2"] } },
      data: { isActive: false },
    });
  });

  const activeTables = await prisma.table.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { name: true, type: true },
  });
  const counts = {
    SNOOKER: activeTables.filter((table) => table.type === "SNOOKER").length,
    POOL: activeTables.filter((table) => table.type === "POOL").length,
  };

  if (counts.SNOOKER !== 4 || counts.POOL !== 2 || activeTables.length !== 6) {
    throw new Error(
      `Expected active tables T1-T4 and P1-P2; found ${counts.SNOOKER} snooker and ${counts.POOL} pool tables.`,
    );
  }

  console.log(`Seeded active tables: ${activeTables.map((table) => table.name).join(", ")}`);
}

seedTables()
  .catch((error) => {
    console.error("Failed to seed table inventory:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
