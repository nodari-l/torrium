import { GoogleGenAI } from "@google/genai"
import { prisma } from "@/lib/prisma"

const AI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const TEST_USER_EMAIL = "test@torrium.dev"

function getPrompt(text: string): string {
  return `
    You are given a text in German. This text needs to be processed following these rules

    * turn every word into it's infinitive form
    * if it's a noun add a proper article and a plural form in parenthesis
    * if it's a verb add Präteritum and Partizip 2 in parenthesis
    * for reflexive verbs add pronoun sich to the verb. Example "ich interessiere mich" has to be "sich interessieren (...)"
    * if a verb is used with a specific preposition add this preposition
    * try to remove duplicates in the output
    * add a translation of this word in English and Russian

    Make the output as structured JSON. Example:
    [
        {
            "lemma": "endlich",
            "forms": { "plural": null, "praterium": null, "partizip_2": null },
            "translations": { "en": ["finally"], "ru": ["наконец"] }
        },
        {
            "lemma": "sein",
            "forms": { "plural": null, "praterium": "war", "partizip_2": "ist gewesen" },
            "translations": { "en": ["to be"], "ru": ["быть"] }
        },
        {
            "lemma": "das Wochenende",
            "forms": { "plural": "die Wochenenden", "praterium": null, "partizip_2": null },
            "translations": { "en": ["weekend"], "ru": ["выходные"] }
        }
    ]

    Important! Provide only JSON. Do not spit out any additional information or comments. Only provide JSON.

    Text to process: ${text}
  `
}

interface LLMWord {
  lemma: string
  forms: {
    plural?: string | null
    praterium?: string | null
    partizip_2?: string | null
  }
  translations: Record<string, string[]>
}

async function makeGeminiQuery(contents: string): Promise<string> {
  const response = await AI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: { responseMimeType: "application/json" },
  })
  return response.text ?? ""
}

export async function GET() {
  return new Response(JSON.stringify({ ok: true, method: "GET" }))
}

export async function POST(req: Request) {
  const body = await req.json()

  if (!body.text) {
    return new Response(
      JSON.stringify({ ok: false, err: "BadRequest", msg: "Parameter `text` is mandatory" }),
      { status: 400 }
    )
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAIL } })

  const existingText = await prisma.text.findFirst({
    where: {
      userId: user.id,
      content: body.text,
      processedAt: { not: null },
    },
    include: {
      textWords: {
        include: { word: true },
      },
    },
  })

  if (existingText) {
    const words = existingText.textWords.map((tw) => tw.word.data)
    return new Response(JSON.stringify({ ok: true, cached: true, words }))
  }

  const text = await prisma.text.create({
    data: {
      userId: user.id,
      content: body.text,
      sourceLanguage: body.sourceLanguage ?? "de",
      targetLanguage: body.targetLanguage ?? "en",
    },
  })

  const raw = await makeGeminiQuery(getPrompt(body.text))
  const llmWords: LLMWord[] = JSON.parse(raw)

  await prisma.$transaction(
    llmWords.map((w) =>
      prisma.word.create({
        data: {
          lemma: w.lemma,
          data: w,
          textWords: {
            create: { textId: text.id },
          },
        },
      })
    )
  )

  await prisma.text.update({
    where: { id: text.id },
    data: { processedAt: new Date() },
  })

  return new Response(JSON.stringify({ ok: true, cached: false, words: llmWords }))
}
