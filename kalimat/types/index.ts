export type Role = 'user' | 'admin'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Module = 'cartes' | 'ecriture'
export type Direction = 'ar-fr' | 'fr-ar'

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  description: string | null
  slug: string
  level: Level
  order: number
  is_published: boolean
  created_at: string
  word_count?: number
}

export interface Word {
  id: string
  arabic: string
  french: string
  phonetic: string | null
  course_id: string | null
  level: Level
  example_arabic: string | null
  example_french: string | null
  audio_url: string | null
  is_published: boolean
  created_at: string
  course?: Course
  options?: WordOption[]
}

export interface WordOption {
  id: string
  word_id: string
  option_text: string
  language: 'french' | 'arabic'
}

export interface Attempt {
  id: string
  user_id: string
  word_id: string
  module: Module
  is_correct: boolean
  created_at: string
  word?: Word
}

export interface UserStats {
  id: string
  user_id: string
  total_correct: number
  total_incorrect: number
  streak_days: number
  last_activity_at: string | null
  cards_completed: number
  courses_started: number
  updated_at: string
}

export interface DailyProgress {
  id: string
  user_id: string
  date: string
  correct: number
  incorrect: number
}

export interface Favorite {
  id: string
  user_id: string
  word_id: string
  created_at: string
  word?: Word
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  total_correct: number
  total_incorrect: number
  cards_completed: number
  success_rate: number
  rank?: number
}

export interface AdminStats {
  total_users: number
  total_words: number
  total_courses: number
  total_attempts: number
  total_correct: number
  total_incorrect: number
}
