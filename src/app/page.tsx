"use client"

import {useState} from "react";
import {GoogleGenAI} from '@google/genai';
const GEMINI_API_KEY = "";

const AI = new GoogleGenAI({apiKey: GEMINI_API_KEY});


function getPrompt(text:string): string {
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
            "de": "endlich"
            "de_plural": null,
            "de_praterium": null,
            "de_partizip_2": null,
            "en": "finally"
            "ru": "наконец"
        },
        {
            "de": "sein"
            "de_plural": null,
            "de_praterium": "war",
            "de_partizip_2": "ist gewesen",
            "en": "to be"
            "ru": "быть"
        },
        {
            "de": "das Wochenende"
            "de_plural": "die Wochenenden",
            "de_praterium": null",
            "de_partizip_2": null,
            "en": "weekend"
            "ru": "выходные"
        },
    ]

    Important! Provide only JSON. Do not spit out any additional information or comments. Only provide JSON. Do not use  unstructured text because this output is than processed further.

    Text to process: ${text}
  `;
}

interface Word {
  de: string;
  en?: string;
  ru?: string;
  de_plural?: string | null;
  de_praterium?: string | null;
  de_partizip_2?: string | null;
}

const TO_BE_FILTERED = new Set<string>([
    "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "eines", "einer", "kein", "keine", "keinen", "keinem", "keines", "keiner",
    ".", ",", ";", ":", "!", "?", "-", "(", ")", "[", "]", "{", "}", "'", '"', "...", "/", "\\", "&", "@", "*", "_", "~",
    
])

export function process(text: string) : string[] {
    const cleanText = text.replace(/[\p{P}\p{S}]/gu, "");
    const splitted = cleanText.split(" ");

    // filter out articles, prepositions and conjunctions, punctuation etc.
    const filtered = splitted.filter(word=> !TO_BE_FILTERED.has(word.toLowerCase()));
    // remove duplicates
    
    return [... new Set(filtered)];
}

export default function Home() {
  const [formText, setFormText] = useState("");
  const [words, setWords] = useState<Word[]>([]);
  const [error, setError] = useState("");

  async function handleProcessClick(text: string) {
    // const processed =process(text)
    console.log("Handling submit");
    const response = await AI.models.generateContent({
      // model: "gemini-3-pro-preview",
      model: "gemini-3-flash-preview",
      contents: getPrompt(text),
      config: {
        responseMimeType: "application/json",
      },
    });
    console.log("waiting for results...")
    console.log("RESULT", response);

    if (!response.text) {
      setError("No result returned");
      return;
    }
    
    try {
      setWords(JSON.parse(response.text));
    } catch(e) {
      setError("Invalid JSON in response");
      setWords([]);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        { error ? (<div>{error}</div>) : null}
        
        <div className="text-xl font-bold">Paste or write your text here</div>
        <textarea 
          id="text"
          className="border-1 border-grey-100 min-w-full h-100 p-2 outline-none"
          onChange={(e) => {setFormText(e.target.value)}}
        ></textarea>
        <button 
          className="bg-blue-500 p-2 text-white cursor-pointer"
          onClick={(e) => {e.preventDefault();handleProcessClick(formText);}}
        >Process</button>
        {words.length > 0 && (
            <div id="result">
              {words.map((word, index) => (
                <div key={index} className="border-b p-2">
                  <div className="font-bold">
                    {word.de} 
                    {word.de_plural && ` (${word.de_plural})`}
                    {word.de_praterium && ` (${word.de_praterium} | ${word.de_partizip_2})`}
                  </div>
                  <div className="text-gray-600">{word.ru}</div>
                  <div className="text-gray-600">{word.en}</div>
                </div>
              ))}
            </div>
        )}
      </main>
    </div>
  );
}
