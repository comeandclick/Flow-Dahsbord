import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { successRate } from '@/lib/utils'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileResult, statsResult, coursesResult] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user!.id).single(),
    supabase.from('user_stats').select('*').eq('user_id', user!.id).single(),
    supabase.from('courses').select('id, title, slug').eq('is_published', true).order('order').limit(4),
  ])

  const profile = profileResult.data
  const stats = statsResult.data
  const courses = coursesResult.data ?? []

  const rate = stats ? successRate(stats.total_correct, stats.total_correct + stats.total_incorrect) : 0

  const modules = [
    {
      href: '/cartes',
      title: 'Cartes',
      description: 'Apprenez le vocabulaire avec des cartes interactives',
      color: 'bg-blue-50 text-blue-700 border-blue-100',
    },
    {
      href: '/ecriture',
      title: 'Écriture',
      description: 'Entraînez-vous à écrire les mots en arabe',
      color: 'bg-violet-50 text-violet-700 border-violet-100',
    },
    {
      href: '/cours',
      title: 'Cours',
      description: 'Explorez les cours par thème',
      color: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    {
      href: '/classement',
      title: 'Classement',
      description: 'Comparez votre progression aux autres apprenants',
      color: 'bg-green-50 text-green-700 border-green-100',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary">
          Bonjour, {profile?.username ?? 'apprenant'}
        </h1>
        <p className="text-muted mt-1">Continuez votre apprentissage de l&apos;arabe.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Réussites', value: stats.total_correct },
            { label: 'Erreurs', value: stats.total_incorrect },
            { label: 'Taux de réussite', value: `${rate}%` },
            { label: 'Série', value: `${stats.streak_days}j` },
          ].map((s) => (
            <div key={s.label} className="bg-surface rounded-xl border border-border p-4">
              <p className="text-2xl font-semibold text-primary">{s.value}</p>
              <p className="text-xs text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modules */}
      <div>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="bg-surface rounded-xl border border-border p-5 hover:border-accent/40 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-primary">{m.title}</h3>
                <svg className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="text-sm text-muted">{m.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Courses */}
      {courses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wide">Cours disponibles</h2>
            <Link href="/cours" className="text-sm text-accent hover:underline">Voir tout</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/cours/${course.slug}`}
                className="bg-surface rounded-xl border border-border p-4 hover:border-accent/40 transition-colors text-sm font-medium text-primary"
              >
                {course.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
