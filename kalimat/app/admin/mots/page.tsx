import { createClient } from '@/lib/supabase/server'
import WordManager from '@/components/admin/WordManager'

export default async function AdminMotsPage() {
  const supabase = createClient()

  const [wordsRes, coursesRes] = await Promise.all([
    supabase
      .from('words')
      .select('*, course:courses(id, title), options:word_options(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('courses')
      .select('id, title')
      .order('order'),
  ])

  return (
    <WordManager
      initialWords={wordsRes.data ?? []}
      courses={coursesRes.data ?? []}
    />
  )
}
