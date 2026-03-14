export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("./lib/prisma")

    await prisma.user.upsert({
      where: { email: "test@torrium.dev" },
      update: {},
      create: {
        email: "test@torrium.dev",
        firstName: "Test",
        lastName: "User",
      },
    })
  }
}
