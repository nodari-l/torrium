import { prisma } from "@/lib/prisma"

const TEST_USER_EMAIL = "test@torrium.dev"

export async function GET() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAIL } })

  const words = await prisma.word.findMany({
    where: {
      textWords: {
        some: {
          text: { userId: user.id },
        },
      },
    },
    select: {
      uuid: true,
      lemma: true,
      data: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
  })

  return new Response(JSON.stringify({ ok: true, words }))
}
