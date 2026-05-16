'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Word, Direction } from '@/types'
import { checkAnswer, shuffle } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Empty from '@/components/ui/Empty'
import Link from 'next/link'

interface WritingSessionProps {
  words: Word[]
  userId: string
}

type AnswerState = 'idle' | 'correct' | 'wrong'

export default function WritingSession({ words, userId }: WritingSessionProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [direction, setDirection] = useState<Direction>('fr-ar')
  const [deck, setDeck] = useState<Word[]>([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionErrors, setSessionErrors] = useState(0)
  const [finished, setFinished] = useState(false)

  const buildDeck = useCallback(() => shuffle(words), [words])

  useEffect(() => {
    setDeck(buildDeck())
    setIndex(0)
    setInput('')
    setAnswerState('idle')
    setFinished(false)
    setSessionCorrect(0)
    setSessionErrors(0)
  }, [buildDeck, direction])

  useEffect(() => {
    if (answerState === 'idle') {
      inputRef.current?.focus()
    }
  }, [index, answerState])

  if (words.length === 0) {
    return (
      <Empty
        title="Aucun mot disponible"
        description="Ajoutez des mots dans l'administration pour commencer."
        action={<Link href="/cours"><Button variant="secondary">Voir les cours</Button></Link>}
      />
    )
  }

  if (finished) {
    const total = sessionCorrect + sessionErrors
    const rate = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-surface rounded-2xl border border-border p-8 max-w-sm w-full">
          <h2 className="text-xl font-semibold text-primary mb-1">Session terminée</h2>
          <p className="text-muted text-sm mb-6">{words.length} mot{words.length > 1 ? 's' : ''} traité{words.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-2xl font-semibold text-success">{sessionCorrect}</p>
              <p className="text-xs text-green-700 mt-0.5">Réussites</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-2xl font-semibold text-error">{sessionErrors}</p>
              <p className="text-xs text-red-700 mt-0.5">Erreurs</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-primary mb-6">{rate}%</p>
          <Button onClick={() => { setDeck(buildDeck()); setIndex(0); setInput(''); setAnswerState('idle'); setFinished(false); setSessionCorrect(0); setSessionErrors(0) }} className="w-full">
            Recommencer
          </Button>
        </div>
      </div>
    )
  }

  const current = deck[index]
  if (!current) return null

  const prompt = direction === 'fr-ar' ? current.french : current.arabic
  const correct = direction === 'fr-ar' ? current.arabic : current.french
  const answerLanguage = direction === 'fr-ar' ? 'arabic' : 'french'
  const remaining = deck.length - index

  async function recordAttempt(isCorrect: boolean) {
    await supabase.from('attempts').insert({
      user_id: userId,
      word_id: current.id,
      module: 'ecriture',
      is_correct: isCorrect,
    })
    const field = isCorrect ? 'total_correct' : 'total_incorrect'
    await supabase.rpc('increment_stat', { uid: userId, stat_name: field })
  }

  function handleValidate() {
    if (!input.trim()) return
    const isCorrect = checkAnswer(input, correct, answerLanguage)
    setAnswerState(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) setSessionCorrect((p) => p + 1)
    else setSessionErrors((p) => p + 1)
    recordAttempt(isCorrect)
  }

  function handleNext() {
    if (index + 1 >= deck.length) {
      setFinished(true)
    } else {
      setIndex((p) => p + 1)
      setInput('')
      setAnswerState('idle')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (answerState === 'idle') handleValidate()
      else handleNext()
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {remaining} mot{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}
          </span>
          <div className="h-1.5 w-32 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${((deck.length - remaining) / deck.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setDirection((d) => (d === 'fr-ar' ? 'ar-fr' : 'fr-ar'))}
          className="text-xs font-medium text-muted border border-border rounded-lg px-3 py-1.5 hover:text-primary hover:border-primary/30 transition-colors"
        >
          {direction === 'fr-ar' ? 'FR → AR' : 'AR → FR'}
        </button>
      </div>

      {/* Prompt */}
      <div className="bg-surface rounded-2xl border border-border p-8 text-center">
        <p className="text-xs text-muted uppercase tracking-wide mb-3">
          {direction === 'fr-ar' ? 'Écrivez en arabe' : 'Écrivez en français'}
        </p>
        <p className={`text-3xl font-semibold text-primary ${direction === 'ar-fr' ? 'arabic' : ''}`}>
          {prompt}
        </p>
        {direction === 'ar-fr' && current.phonetic && (
          <p className="text-sm text-muted mt-2">{current.phonetic}</p>
        )}
      </div>

      {/* Input */}
      <div className="space-y-3">
        <input
          ref={inputRef}
          lang={direction === 'fr-ar' ? 'ar' : 'fr'}
          value={input}
          onChange={(e) => {
            if (answerState === 'idle') setInput(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={direction === 'fr-ar' ? 'اكتب هنا...' : 'Écrivez ici...'}
          disabled={answerState !== 'idle'}
          className={[
            'w-full h-12 rounded-xl border px-4 text-sm transition-colors focus:outline-none',
            direction === 'fr-ar' ? 'font-arabic text-right text-base' : '',
            answerState === 'correct' ? 'bg-green-50 border-success text-success' : '',
            answerState === 'wrong' ? 'bg-red-50 border-error text-error' : '',
            answerState === 'idle' ? 'bg-surface border-border text-primary focus:border-accent' : '',
          ].filter(Boolean).join(' ')}
        />

        {answerState === 'idle' && (
          <Button onClick={handleValidate} className="w-full" size="lg" disabled={!input.trim()}>
            Valider
          </Button>
        )}

        {answerState !== 'idle' && (
          <div className="space-y-3">
            <div className={`rounded-xl border p-4 ${answerState === 'correct' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-sm font-medium ${answerState === 'correct' ? 'text-success' : 'text-error'}`}>
                {answerState === 'correct' ? 'Bonne réponse !' : 'Réponse incorrecte'}
              </p>
              {answerState === 'wrong' && (
                <p className={`text-sm mt-1 text-primary ${direction === 'fr-ar' ? 'arabic text-base' : ''}`}>
                  Réponse correcte : <span className="font-semibold">{correct}</span>
                </p>
              )}
            </div>
            <Button onClick={handleNext} className="w-full" size="lg">
              {index + 1 >= deck.length ? 'Terminer' : 'Suivant'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
