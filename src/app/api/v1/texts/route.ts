import { prisma } from "@/lib/prisma"

const TEST_USER_EMAIL = "test@torrium.dev"

export async function GET() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAIL } })

  const texts = await prisma.text.findMany({
    where: { userId: user.id },
    orderBy: { id: "desc" },
    select: {
      uuid: true,
      content: true,
      sourceLanguage: true,
      targetLanguage: true,
      processedAt: true,
      createdAt: true,
    },
  })

  return new Response(JSON.stringify({ ok: true, texts }))
}
