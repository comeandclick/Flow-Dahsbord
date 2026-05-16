import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WritingSession from '@/components/writing/WritingSession'
import Link from 'next/link'
interface SearchParams {
  cours?: string
}

interface CourseFilter {
  id: string
  title: string
  slug: string
}

export default async function EcriturePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const courseSlug = searchParams.cours

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('is_published', true)
    .order('order')

  let query = supabase
    .from('words')
    .select('*')
    .eq('is_published', true)

  if (courseSlug) {
    const course = (courses ?? []).find((c: CourseFilter) => c.slug === courseSlug)
    if (course) query = query.eq('course_id', course.id)
  }

  const { data: words } = await query.order('created_at')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Écriture</h1>
        <p className="text-muted mt-1 text-sm">Entraînez-vous à écrire les mots en arabe.</p>
      </div>

      {/* Course filter */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/ecriture"
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${!courseSlug ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted hover:text-primary'}`}
        >
          Tous
        </Link>
        {(courses ?? []).map((c: CourseFilter) => (
          <Link
            key={c.id}
            href={`/ecriture?cours=${c.slug}`}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${courseSlug === c.slug ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted hover:text-primary'}`}
          >
            {c.title}
          </Link>
        ))}
      </div>

      <WritingSession words={words ?? []} userId={user.id} />
    </div>
  )
}
