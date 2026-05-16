interface FlashCardProps {
  question: string
  answer: string
  isFlipped: boolean
  isArabicQuestion: boolean
  phonetic?: string | null
  example?: string | null
}

export default function FlashCard({ question, answer, isFlipped, isArabicQuestion, phonetic, example }: FlashCardProps) {
  return (
    <div className="card-container w-full" style={{ height: '200px' }}>
      <div className={`card-inner w-full h-full ${isFlipped ? 'flipped' : ''}`}>
        {/* Front */}
        <div className="card-face absolute inset-0 bg-surface rounded-2xl border border-border flex flex-col items-center justify-center p-6">
          <p className={`text-3xl font-semibold text-primary ${isArabicQuestion ? 'arabic' : ''}`}>
            {question}
          </p>
          {phonetic && isArabicQuestion && (
            <p className="text-sm text-muted mt-2">{phonetic}</p>
          )}
        </div>

        {/* Back */}
        <div className="card-face card-back absolute inset-0 bg-primary rounded-2xl flex flex-col items-center justify-center p-6 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50 mb-2">
            Traduction
          </p>
          <p className={`text-3xl font-semibold ${!isArabicQuestion ? 'arabic' : ''}`}>
            {answer}
          </p>
          {example && (
            <p className={`text-sm text-white/70 mt-3 text-center ${!isArabicQuestion ? 'arabic text-base' : ''}`}>
              {example}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
