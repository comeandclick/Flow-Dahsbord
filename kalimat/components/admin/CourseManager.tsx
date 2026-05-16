'use client'

import { useState } from 'react'
import { Course } from '@/types'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Empty from '@/components/ui/Empty'

interface Props {
  initialCourses: (Course & { words?: { count: number }[] })[]
}

type FormLevel = 'beginner' | 'intermediate' | 'advanced'

interface CourseForm {
  title: string
  description: string
  slug: string
  level: FormLevel
  order: number
  is_published: boolean
}

const emptyForm: CourseForm = {
  title: '',
  description: '',
  slug: '',
  level: 'beginner',
  order: 0,
  is_published: true,
}

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function CourseManager({ initialCourses }: Props) {
  const supabase = createClient()
  const [courses, setCourses] = useState(initialCourses)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openCreate() {
    setEditingCourse(null)
    setForm(emptyForm)
    setError('')
    setIsModalOpen(true)
  }

  function openEdit(course: Course) {
    setEditingCourse(course)
    setForm({
      title: course.title,
      description: course.description ?? '',
      slug: course.slug,
      level: course.level,
      order: course.order,
      is_published: course.is_published,
    })
    setError('')
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Le titre est obligatoire.')
      return
    }

    const slug = form.slug.trim() || toSlug(form.title)
    setSaving(true)
    setError('')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      slug,
      level: form.level,
      order: form.order,
      is_published: form.is_published,
    }

    try {
      if (editingCourse) {
        const { error: e } = await supabase.from('courses').update(payload).eq('id', editingCourse.id)
        if (e) throw e
        setCourses((prev) => prev.map((c) => c.id === editingCourse.id ? { ...c, ...payload } : c))
      } else {
        const { data, error: e } = await supabase.from('courses').insert(payload).select().single()
        if (e) throw e
        setCourses((prev) => [...prev, { ...data, words: [] }])
      }
      setIsModalOpen(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(course: Course) {
    if (!confirm(`Supprimer le cours "${course.title}" ? Les mots associés ne seront pas supprimés.`)) return
    const { error } = await supabase.from('courses').delete().eq('id', course.id)
    if (!error) setCourses((prev) => prev.filter((c) => c.id !== course.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Cours</h1>
          <p className="text-sm text-muted mt-0.5">{courses.length} cours au total</p>
        </div>
        <Button onClick={openCreate}>Ajouter un cours</Button>
      </div>

      {courses.length === 0 ? (
        <Empty
          title="Aucun cours"
          description="Créez votre premier cours."
          action={<Button onClick={openCreate}>Ajouter un cours</Button>}
        />
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const wordCount = Array.isArray(course.words) ? course.words[0]?.count ?? 0 : 0
            return (
              <div key={course.id} className="bg-surface rounded-xl border border-border p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-primary">{course.title}</h3>
                    {!course.is_published && (
                      <span className="text-xs text-muted bg-background px-2 py-0.5 rounded-full border border-border">Brouillon</span>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted line-clamp-1 mb-1">{course.description}</p>
                  )}
                  <p className="text-xs text-muted">{wordCount} mot{wordCount > 1 ? 's' : ''} · {course.level} · /{course.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(course)}
                    className="text-xs text-muted hover:text-primary px-2 py-1 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(course)}
                    className="text-xs text-muted hover:text-error px-2 py-1 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? 'Modifier le cours' : 'Ajouter un cours'}
      >
        <div className="space-y-4">
          <Input
            label="Titre *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: toSlug(e.target.value) }))}
            placeholder="Les chiffres"
          />
          <Input
            label="Slug (URL)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="les-chiffres"
          />
          <div>
            <label className="text-sm font-medium text-primary block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description courte du cours..."
              rows={3}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-primary block mb-1.5">Niveau</label>
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as FormLevel }))}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-primary focus:border-accent focus:outline-none"
              >
                <option value="beginner">Débutant</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé</option>
              </select>
            </div>
            <Input
              label="Ordre d'affichage"
              type="number"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
              min={0}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="course_published"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="course_published" className="text-sm text-primary">Publié</label>
          </div>

          {error && (
            <p className="text-sm text-error bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingCourse ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
