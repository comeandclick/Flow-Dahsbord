'use client'

import { useState, useEffect, useCallback } from 'react'
import { Word, Direction } from '@/types'
import { shuffle, checkAnswer } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import FlashCard from './FlashCard'
import Empty from '@/components/ui/Empty'
import Link from 'next/link'

interface CardSessionProps {
  words: Word[]
  userId: string
}

type AnswerState = 'idle' | 'wrong' | 'correct'

interface CardWithOptions {
  word: Word
  options: string[]
  correctOption: string
}

function buildCardOptions(word: Word, allWords: Word[], direction: Direction): CardWithOptions {
  const correctOption = direction === 'ar-fr' ? word.french : word.arabic

  // Gather wrong options: first from word.options, then from other words
  let wrongOptions: string[] = []

  if (word.options && word.options.length > 0) {
    const lang = direction === 'ar-fr' ? 'french' : 'arabic'
    wrongOptions = word.options
      .filter((o) => o.language === lang)
      .map((o) => o.option_text)
  }

  // Fill remaining slots from other words
  if (wrongOptions.length < 3) {
    const pool = allWords
      .filter((w) => w.id !== word.id)
      .map((w) => (direction === 'ar-fr' ? w.french : w.arabic))
      .filter((o) => o !== correctOption && !wrongOptions.includes(o))

    const shuffled = shuffle(pool)
    wrongOptions = [...wrongOptions, ...shuffled].slice(0, 3)
  } else {
    wrongOptions = shuffle(wrongOptions).slice(0, 3)
  }

  const options = shuffle([correctOption, ...wrongOptions])

  return { word, options, correctOption }
}

export default function CardSession({ words, userId }: CardSessionProps) {
  const supabase = createClient()
  const [direction, setDirection] = useState<Direction>('ar-fr')
  const [deck, setDeck] = useState<CardWithOptions[]>([])
  const [index, setIndex] = useState(0)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionErrors, setSessionErrors] = useState(0)
  const [finished, setFinished] = useState(false)

  const buildDeck = useCallback(() => {
    const shuffled = shuffle(words)
    return shuffled.map((w) => buildCardOptions(w, words, direction))
  }, [words, direction])

  useEffect(() => {
    setDeck(buildDeck())
    setIndex(0)
    setAnswerState('idle')
    setSelectedOption(null)
    setFinished(false)
    setSessionCorrect(0)
    setSessionErrors(0)
  }, [buildDeck, direction])

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
          <p className="text-muted text-sm mb-6">{words.length} carte{words.length > 1 ? 's' : ''} parcourue{words.length > 1 ? 's' : ''}</p>
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
          <Button onClick={() => { setDeck(buildDeck()); setIndex(0); setAnswerState('idle'); setSelectedOption(null); setFinished(false); setSessionCorrect(0); setSessionErrors(0) }} className="w-full">
            Recommencer
          </Button>
        </div>
      </div>
    )
  }

  const current = deck[index]
  if (!current) return null

  const question = direction === 'ar-fr' ? current.word.arabic : current.word.french
  const remaining = deck.length - index

  async function recordAttempt(isCorrect: boolean) {
    await supabase.from('attempts').insert({
      user_id: userId,
      word_id: current.word.id,
      module: 'cartes',
      is_correct: isCorrect,
    })

    // Update user stats
    const field = isCorrect ? 'total_correct' : 'total_incorrect'
    await supabase.rpc('increment_stat', { uid: userId, stat_name: field })

    if (isCorrect) {
      await supabase.rpc('increment_stat', { uid: userId, stat_name: 'cards_completed' })
    }
  }

  function handleOptionClick(option: string) {
    if (answerState === 'correct') return

    const isCorrect = checkAnswer(option, current.correctOption, direction === 'ar-fr' ? 'french' : 'arabic')
    setSelectedOption(option)

    if (isCorrect) {
      setAnswerState('correct')
      setSessionCorrect((p) => p + 1)
      recordAttempt(true)
    } else {
      setAnswerState('wrong')
      setSessionErrors((p) => p + 1)
      recordAttempt(false)
    }
  }

  function handleNext() {
    if (index + 1 >= deck.length) {
      setFinished(true)
    } else {
      setIndex((p) => p + 1)
      setAnswerState('idle')
      setSelectedOption(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {remaining} carte{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
          </span>
          <div className="h-1.5 w-32 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${((deck.length - remaining) / deck.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setDirection((d) => (d === 'ar-fr' ? 'fr-ar' : 'ar-fr'))}
          className="text-xs font-medium text-muted border border-border rounded-lg px-3 py-1.5 hover:text-primary hover:border-primary/30 transition-colors"
        >
          {direction === 'ar-fr' ? 'AR → FR' : 'FR → AR'}
        </button>
      </div>

      {/* Card */}
      <FlashCard
        question={question}
        answer={current.correctOption}
        isFlipped={answerState === 'correct'}
        isArabicQuestion={direction === 'ar-fr'}
        phonetic={current.word.phonetic}
        example={direction === 'ar-fr' ? current.word.example_french : current.word.example_arabic}
      />

      {/* Options */}
      {answerState !== 'correct' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.options.map((option) => {
            const isSelected = selectedOption === option
            const isWrong = isSelected && answerState === 'wrong'

            return (
              <button
                key={option}
                onClick={() => handleOptionClick(option)}
                className={[
                  'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150',
                  direction === 'fr-ar' ? 'font-arabic text-base text-right' : '',
                  isWrong
                    ? 'bg-red-50 border-error text-error'
                    : 'bg-surface border-border text-primary hover:border-accent/50 hover:bg-accent/5 active:scale-[0.98]',
                ].filter(Boolean).join(' ')}
              >
                {option}
              </button>
            )
          })}
        </div>
      )}

      {/* Wrong feedback */}
      {answerState === 'wrong' && (
        <p className="text-sm text-error text-center font-medium">
          Réessaie, ce n&apos;est pas la bonne réponse.
        </p>
      )}

      {/* Next button */}
      {answerState === 'correct' && (
        <div className="flex justify-center">
          <Button onClick={handleNext} size="lg">
            {index + 1 >= deck.length ? 'Terminer' : 'Suivant'}
          </Button>
        </div>
      )}
    </div>
  )
}
