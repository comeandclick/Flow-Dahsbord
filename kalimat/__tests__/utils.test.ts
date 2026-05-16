import { checkAnswer, normalizeArabic, normalizeFrench, shuffle, successRate } from '@/lib/utils'

describe('normalizeArabic', () => {
  it('removes tashkeel', () => {
    expect(normalizeArabic('كِتَابٌ')).toBe('كتاب')
  })

  it('normalizes alef variants', () => {
    expect(normalizeArabic('أب')).toBe('اب')
    expect(normalizeArabic('إبراهيم')).toBe('ابراهيم')
  })
})

describe('normalizeFrench', () => {
  it('lowercases and trims', () => {
    expect(normalizeFrench('  Bonjour  ')).toBe('bonjour')
  })
})

describe('checkAnswer', () => {
  it('accepts correct Arabic answer', () => {
    expect(checkAnswer('كتاب', 'كِتَابٌ', 'arabic')).toBe(true)
  })

  it('rejects wrong Arabic answer', () => {
    expect(checkAnswer('قلم', 'كتاب', 'arabic')).toBe(false)
  })

  it('accepts correct French answer case-insensitive', () => {
    expect(checkAnswer('Bonjour', 'bonjour', 'french')).toBe(true)
  })

  it('rejects wrong French answer', () => {
    expect(checkAnswer('merci', 'bonjour', 'french')).toBe(false)
  })
})

describe('shuffle', () => {
  it('returns same length array', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr)).toHaveLength(5)
  })

  it('contains same elements', () => {
    const arr = ['a', 'b', 'c']
    const shuffled = shuffle(arr)
    expect(shuffled.sort()).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate original', () => {
    const arr = [1, 2, 3]
    shuffle(arr)
    expect(arr).toEqual([1, 2, 3])
  })
})

describe('successRate', () => {
  it('returns 0 when total is 0', () => {
    expect(successRate(0, 0)).toBe(0)
  })

  it('returns 100 when all correct', () => {
    expect(successRate(10, 10)).toBe(100)
  })

  it('returns correct percentage', () => {
    expect(successRate(7, 10)).toBe(70)
  })
})
