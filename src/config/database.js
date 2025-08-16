import { PrismaClient } from "@prisma/client";

let prisma;

try {
  prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
    errorFormat: "pretty",
  });
} catch (error) {
  console.error("Failed to initialize Prisma Client:", error);
  process.exit(1);
}

export { prisma };

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
