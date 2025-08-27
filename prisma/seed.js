  import { PrismaClient } from "@prisma/client";
  import bcrypt from "bcryptjs";

  const prisma = new PrismaClient();

  async function main() {
    console.log("Start seeding ...");

    const superuserEmail = process.env.SUPERUSER_EMAIL;
    const superuserPassword = process.env.SUPERUSER_PASSWORD;

    if (!superuserEmail || !superuserPassword) {
      throw new Error(
        "SUPERUSER_EMAIL and SUPERUSER_PASSWORD must be set in .env file"
      );
    }

    const hashedPassword = await bcrypt.hash(superuserPassword, 12);

    const superuser = await prisma.user.upsert({
      where: { email: superuserEmail },
      update: {},
      create: {
        email: superuserEmail,
        username: "SuperUser",
        password: hashedPassword,
        role: "SUPERUSER",
      },
    });

    console.log({ superuser });
    console.log("Seeding finished.");
  }

  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
