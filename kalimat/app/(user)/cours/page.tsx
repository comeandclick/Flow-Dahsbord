import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Empty from '@/components/ui/Empty'
import { levelLabel } from '@/lib/utils'

export default async function CoursPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, title, description, slug, level, order,
      words:words(count)
    `)
    .eq('is_published', true)
    .order('order')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Cours</h1>
        <p className="text-muted mt-1 text-sm">Explorez les différents thèmes pour apprendre l&apos;arabe.</p>
      </div>

      {!courses || courses.length === 0 ? (
        <Empty
          title="Aucun cours disponible"
          description="Les cours seront ajoutés prochainement par l'administrateur."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((course) => {
            const wordCount = Array.isArray(course.words) ? course.words[0]?.count ?? 0 : 0
            const levelVariant: Record<string, 'default' | 'success' | 'info' | 'warning'> = {
              beginner: 'success',
              intermediate: 'warning',
              advanced: 'info',
            }

            return (
              <Link
                key={course.id}
                href={`/cours/${course.slug}`}
                className="bg-surface rounded-2xl border border-border p-5 hover:border-accent/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="font-semibold text-primary group-hover:text-accent transition-colors">
                    {course.title}
                  </h2>
                  <Badge variant={levelVariant[course.level] ?? 'default'}>
                    {levelLabel(course.level)}
                  </Badge>
                </div>
                {course.description && (
                  <p className="text-sm text-muted mb-3 line-clamp-2">{course.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{wordCount} mot{wordCount > 1 ? 's' : ''}</span>
                  <svg className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
