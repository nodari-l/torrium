"use client"

import { useState, useEffect } from "react"
import { Word } from "@types"

interface SavedText {
  uuid: string
  content: string
  sourceLanguage: string
  targetLanguage: string
  processedAt: string | null
  createdAt: string
}

export default function Home() {
  const [formText, setFormText] = useState("")
  const [words, setWords] = useState<Word[]>([])
  const [error, setError] = useState("")
  const [savedTexts, setSavedTexts] = useState<SavedText[]>([])
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)

  useEffect(() => {
    loadTexts()
  }, [])

  async function loadTexts() {
    const resp = await fetch("/api/v1/texts")
    if (!resp.ok) return
    const data = await resp.json()
    setSavedTexts(data.texts)
  }

  async function handleProcessClick(text: string) {
    setError("")
    const resp = await fetch("/api/v1/texts/process", {
      method: "POST",
      body: JSON.stringify({ text }),
    })

    if (!resp.ok) {
      setError("Failed to process the text")
      return
    }

    const data = await resp.json()
    setWords(data.words)
    setSelectedUuid(null)
    await loadTexts()
  }

  async function handleSelectText(text: SavedText) {
    setSelectedUuid(text.uuid)
    setFormText(text.content)
    setError("")

    const resp = await fetch(`/api/v1/texts/${text.uuid}`)
    if (!resp.ok) return
    const data = await resp.json()
    setWords(data.text.words.map((w: { data: Word }) => w.data))
  }

  async function handleDeleteText(uuid: string) {
    await fetch(`/api/v1/texts/${uuid}`, { method: "DELETE" })
    if (selectedUuid === uuid) {
      setSelectedUuid(null)
      setWords([])
      setFormText("")
    }
    await loadTexts()
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <aside className="w-72 min-h-screen border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="p-4 font-bold text-lg border-b border-zinc-200 dark:border-zinc-800">Saved Texts</div>
        <div className="flex-1 overflow-y-auto">
          {savedTexts.length === 0 && (
            <div className="p-4 text-sm text-zinc-400">No texts yet</div>
          )}
          {savedTexts.map((text) => (
            <div
              key={text.uuid}
              className={`group p-3 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${selectedUuid === text.uuid ? "bg-blue-50 dark:bg-zinc-700" : ""}`}
              onClick={() => handleSelectText(text)}
            >
              <div className="text-sm truncate">{text.content.slice(0, 60)}{text.content.length > 60 ? "…" : ""}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-zinc-400">{text.sourceLanguage} → {text.targetLanguage}</span>
                <button
                  className="text-xs text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleDeleteText(text.uuid) }}
                >delete</button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-12 max-w-3xl">
        {error && <div className="mb-4 text-red-500">{error}</div>}

        <div className="text-xl font-bold mb-2">Paste or write your text here</div>
        <textarea
          id="text"
          className="border border-zinc-200 dark:border-zinc-700 min-w-full h-40 p-2 outline-none mb-4 resize-none"
          value={formText}
          onChange={(e) => setFormText(e.target.value)}
        />
        <button
          className="self-start bg-blue-500 px-4 py-2 text-white cursor-pointer mb-8"
          onClick={(e) => { e.preventDefault(); handleProcessClick(formText) }}
        >Process</button>

        {words.length > 0 && (
          <div>
            {words.map((word, index) => (
              <div key={index} className="border-b border-zinc-100 dark:border-zinc-800 py-2">
                <div className="font-bold">
                  {word.lemma}
                  {word.forms?.plural && ` (${word.forms.plural})`}
                  {word.forms?.praterium && ` (${word.forms.praterium} | ${word.forms.partizip_2})`}
                </div>
                {Object.entries(word.translations).map(([lang, values]) => (
                  <div key={lang} className="text-zinc-500 text-sm">{lang}: {values.join(", ")}</div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
