/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import FlashCard from '@/components/cards/FlashCard'

describe('FlashCard', () => {
  const defaultProps = {
    question: 'كتاب',
    answer: 'livre',
    isFlipped: false,
    isArabicQuestion: true,
    phonetic: 'kitab',
    example: null,
  }

  it('renders Arabic question', () => {
    render(<FlashCard {...defaultProps} />)
    expect(screen.getByText('كتاب')).toBeInTheDocument()
  })

  it('shows phonetic when Arabic question', () => {
    render(<FlashCard {...defaultProps} />)
    expect(screen.getByText('kitab')).toBeInTheDocument()
  })

  it('shows answer on flip', () => {
    render(<FlashCard {...defaultProps} isFlipped />)
    expect(screen.getByText('livre')).toBeInTheDocument()
  })

  it('shows Traduction label when flipped', () => {
    render(<FlashCard {...defaultProps} isFlipped />)
    expect(screen.getByText('Traduction')).toBeInTheDocument()
  })
})
