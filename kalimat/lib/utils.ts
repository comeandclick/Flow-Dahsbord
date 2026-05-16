export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}

export function normalizeArabic(text: string): string {
  return text
    .trim()
    .replace(/[ً-ٟ]/g, '') // remove tashkeel (diacritics)
    .replace(/[آأإ]/g, 'ا') // normalize alef variants
    .replace(/ة/g, 'ه') // normalize taa marbouta
    .replace(/[يى]/g, 'ي') // normalize yaa
}

export function normalizeFrench(text: string): string {
  return text.trim().toLowerCase()
}

export function checkAnswer(userInput: string, correct: string, language: 'arabic' | 'french'): boolean {
  if (language === 'arabic') {
    return normalizeArabic(userInput) === normalizeArabic(correct)
  }
  return normalizeFrench(userInput) === normalizeFrench(correct)
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function successRate(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function levelLabel(level: string): string {
  const map: Record<string, string> = {
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
  }
  return map[level] ?? level
}
