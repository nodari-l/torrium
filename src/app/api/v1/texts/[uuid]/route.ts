import { prisma } from "@/lib/prisma"

const TEST_USER_EMAIL = "test@torrium.dev"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params
  const user = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAIL } })

  const text = await prisma.text.findFirst({
    where: { uuid, userId: user.id },
    select: {
      uuid: true,
      content: true,
      sourceLanguage: true,
      targetLanguage: true,
      processedAt: true,
      createdAt: true,
      textWords: {
        select: {
          word: {
            select: { uuid: true, lemma: true, data: true },
          },
        },
      },
    },
  })

  if (!text) {
    return new Response(JSON.stringify({ ok: false, err: "NotFound" }), { status: 404 })
  }

  const words = text.textWords.map((tw) => tw.word)
  return new Response(JSON.stringify({ ok: true, text: { ...text, textWords: undefined, words } }))
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params
  const user = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAIL } })

  const text = await prisma.text.findFirst({ where: { uuid, userId: user.id } })

  if (!text) {
    return new Response(JSON.stringify({ ok: false, err: "NotFound" }), { status: 404 })
  }

  await prisma.text.delete({ where: { id: text.id } })

  return new Response(JSON.stringify({ ok: true }))
}
