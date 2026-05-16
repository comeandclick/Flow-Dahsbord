import { createClient } from '@/lib/supabase/server'
import { successRate } from '@/lib/utils'

export default async function AdminStatsPage() {
  const supabase = createClient()

  const [attemptsRes, courseStatsRes] = await Promise.all([
    supabase
      .from('attempts')
      .select('is_correct, module, word:words(course_id, course:courses(title))')
      .order('created_at', { ascending: false }),
    supabase
      .from('courses')
      .select(`
        id, title,
        words:words(id)
      `)
      .eq('is_published', true),
  ])

  const attempts = attemptsRes.data ?? []
  const courses = courseStatsRes.data ?? []

  // Global stats
  const totalAttempts = attempts.length
  const totalCorrect = attempts.filter((a) => a.is_correct).length
  const totalIncorrect = totalAttempts - totalCorrect
  const globalRate = successRate(totalCorrect, totalAttempts)

  // By module
  const moduleStats = ['cartes', 'ecriture'].map((mod) => {
    const modAttempts = attempts.filter((a) => a.module === mod)
    const correct = modAttempts.filter((a) => a.is_correct).length
    return {
      module: mod === 'cartes' ? 'Cartes' : 'Écriture',
      total: modAttempts.length,
      correct,
      rate: successRate(correct, modAttempts.length),
    }
  })

  // By course
  const courseAttemptMap: Record<string, { title: string; correct: number; total: number }> = {}
  for (const attempt of attempts) {
    const word = Array.isArray(attempt.word) ? attempt.word[0] : attempt.word
    const course = Array.isArray(word?.course) ? word?.course[0] : word?.course
    if (!course) continue
    const key = course.title
    if (!courseAttemptMap[key]) courseAttemptMap[key] = { title: key, correct: 0, total: 0 }
    courseAttemptMap[key].total++
    if (attempt.is_correct) courseAttemptMap[key].correct++
  }
  const courseStats = Object.values(courseAttemptMap).sort((a, b) => b.total - a.total).slice(0, 10)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Statistiques</h1>
        <p className="text-sm text-muted mt-0.5">Analyse détaillée de l&apos;utilisation.</p>
      </div>

      {/* Global */}
      <div>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Global</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total exercices', value: totalAttempts },
            { label: 'Réussites', value: totalCorrect },
            { label: 'Erreurs', value: totalIncorrect },
            { label: 'Taux de réussite', value: `${globalRate}%` },
          ].map((s) => (
            <div key={s.label} className="bg-surface rounded-xl border border-border p-4">
              <p className="text-2xl font-semibold text-primary">{typeof s.value === 'number' ? s.value.toLocaleString('fr-FR') : s.value}</p>
              <p className="text-xs text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* By module */}
      <div>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Par module</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {moduleStats.map((mod) => (
            <div key={mod.module} className="bg-surface rounded-xl border border-border p-5">
              <h3 className="font-medium text-primary mb-3">{mod.module}</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-xl font-semibold text-primary">{mod.total}</p>
                  <p className="text-xs text-muted">Exercices</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-success">{mod.correct}</p>
                  <p className="text-xs text-muted">Réussites</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-primary">{mod.rate}%</p>
                  <p className="text-xs text-muted">Taux</p>
                </div>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: `${mod.rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* By course */}
      {courseStats.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Par cours</h2>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted px-5 py-3">Cours</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3">Exercices</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3">Réussites</th>
                  <th className="text-left text-xs font-medium text-muted px-5 py-3">Taux</th>
                </tr>
              </thead>
              <tbody>
                {courseStats.map((c) => (
                  <tr key={c.title} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-5 py-3 text-sm font-medium text-primary">{c.title}</td>
                    <td className="px-5 py-3 text-sm text-muted">{c.total}</td>
                    <td className="px-5 py-3 text-sm text-success">{c.correct}</td>
                    <td className="px-5 py-3 text-sm text-primary">{successRate(c.correct, c.total)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
