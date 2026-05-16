import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = createClient()

  const [usersRes, wordsRes, coursesRes, attemptsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('words').select('id', { count: 'exact' }),
    supabase.from('courses').select('id', { count: 'exact' }),
    supabase.from('attempts').select('is_correct', { count: 'exact' }),
  ])

  const totalCorrect = attemptsRes.data?.filter((a) => a.is_correct).length ?? 0
  const totalIncorrect = (attemptsRes.count ?? 0) - totalCorrect

  const stats = [
    { label: 'Utilisateurs', value: usersRes.count ?? 0 },
    { label: 'Mots', value: wordsRes.count ?? 0 },
    { label: 'Cours', value: coursesRes.count ?? 0 },
    { label: 'Exercices', value: attemptsRes.count ?? 0 },
    { label: 'Réussites', value: totalCorrect },
    { label: 'Erreurs', value: totalIncorrect },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Tableau de bord</h1>
        <p className="text-muted text-sm mt-1">Vue d&apos;ensemble de l&apos;application.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-border p-5">
            <p className="text-3xl font-semibold text-primary">{s.value.toLocaleString('fr-FR')}</p>
            <p className="text-sm text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="font-medium text-primary mb-3">Actions rapides</h3>
          <div className="space-y-2">
            {[
              { href: '/admin/mots', label: 'Gérer les mots' },
              { href: '/admin/cours', label: 'Gérer les cours' },
              { href: '/admin/utilisateurs', label: 'Voir les utilisateurs' },
              { href: '/admin/statistiques', label: 'Statistiques détaillées' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-background text-sm text-primary transition-colors"
              >
                {link.label}
                <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="font-medium text-primary mb-3">Taux de réussite global</h3>
          {attemptsRes.count && attemptsRes.count > 0 ? (
            <>
              <p className="text-4xl font-bold text-primary mb-2">
                {Math.round((totalCorrect / (attemptsRes.count ?? 1)) * 100)}%
              </p>
              <p className="text-sm text-muted">
                {totalCorrect.toLocaleString('fr-FR')} bonnes réponses sur {(attemptsRes.count ?? 0).toLocaleString('fr-FR')} exercices
              </p>
              <div className="mt-4 h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full"
                  style={{ width: `${Math.round((totalCorrect / (attemptsRes.count ?? 1)) * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Aucun exercice enregistré.</p>
          )}
        </div>
      </div>
    </div>
  )
}
