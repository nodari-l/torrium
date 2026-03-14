export interface Word {
  lemma: string
  forms: {
    plural?: string | null
    praterium?: string | null
    partizip_2?: string | null
  }
  translations: Record<string, string[]>
}
