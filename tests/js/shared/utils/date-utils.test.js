/**
 * Tests for Date Utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatDate,
  getTodayISO,
  getRelativeDateISO,
  isDateInRange,
  getDaysBetweenDates,
  createFireDateRange
} from '@/js/shared/utils/date-utils.js'

describe('date-utils', () => {
  describe('formatDate', () => {
    it('should format ISO date to MM/DD/YY by default', () => {
      const result = formatDate('2024-03-15')
      expect(result).toBe('03/15/24')
    })

    it('should format ISO date at start of year', () => {
      const result = formatDate('2024-01-01')
      expect(result).toBe('01/01/24')
    })

    it('should format ISO date at end of year', () => {
      const result = formatDate('2024-12-31')
      expect(result).toBe('12/31/24')
    })

    it('should handle custom formatting options', () => {
      const result = formatDate('2024-03-15', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      // Note: toLocaleDateString may vary by system locale
      expect(result).toContain('March')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('should handle partial custom options', () => {
      const result = formatDate('2024-03-15', {
        month: 'long',
        year: 'numeric'
      })
      expect(result).toContain('March')
      expect(result).toContain('2024')
    })

    it('should handle different years', () => {
      expect(formatDate('2023-06-15')).toBe('06/15/23')
      expect(formatDate('2025-09-30')).toBe('09/30/25')
    })
  })

  describe('getTodayISO', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = getTodayISO()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return a valid ISO date string', () => {
      const result = getTodayISO()
      const date = new Date(result)
      expect(date).toBeInstanceOf(Date)
      expect(isNaN(date.getTime())).toBe(false)
    })

    it('should return current date', () => {
      const result = getTodayISO()
      const today = new Date().toISOString().split('T')[0]
      expect(result).toBe(today)
    })
  })

  describe('getRelativeDateISO', () => {
    it('should return date 7 days in the past', () => {
      const result = getRelativeDateISO(-7)
      const expected = new Date()
      expected.setDate(expected.getDate() - 7)
      expect(result).toBe(expected.toISOString().split('T')[0])
    })

    it('should return date 7 days in the future', () => {
      const result = getRelativeDateISO(7)
      const expected = new Date()
      expected.setDate(expected.getDate() + 7)
      expect(result).toBe(expected.toISOString().split('T')[0])
    })

    it('should return today when passed 0', () => {
      const result = getRelativeDateISO(0)
      const today = new Date().toISOString().split('T')[0]
      expect(result).toBe(today)
    })

    it('should handle large negative offsets', () => {
      const result = getRelativeDateISO(-365)
      const expected = new Date()
      expected.setDate(expected.getDate() - 365)
      expect(result).toBe(expected.toISOString().split('T')[0])
    })

    it('should handle large positive offsets', () => {
      const result = getRelativeDateISO(365)
      const expected = new Date()
      expected.setDate(expected.getDate() + 365)
      expect(result).toBe(expected.toISOString().split('T')[0])
    })

    it('should return valid ISO format', () => {
      const result = getRelativeDateISO(-30)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('isDateInRange', () => {
    it('should return true for date within range', () => {
      const result = isDateInRange('2024-03-15', '2024-03-01', '2024-03-31')
      expect(result).toBe(true)
    })

    it('should return false for date before range', () => {
      const result = isDateInRange('2024-02-28', '2024-03-01', '2024-03-31')
      expect(result).toBe(false)
    })

    it('should return false for date after range', () => {
      const result = isDateInRange('2024-04-01', '2024-03-01', '2024-03-31')
      expect(result).toBe(false)
    })

    it('should include start boundary date', () => {
      const result = isDateInRange('2024-03-01', '2024-03-01', '2024-03-31')
      expect(result).toBe(true)
    })

    it('should include end boundary date', () => {
      const result = isDateInRange('2024-03-31', '2024-03-01', '2024-03-31')
      expect(result).toBe(true)
    })

    it('should handle single day range', () => {
      const result = isDateInRange('2024-03-15', '2024-03-15', '2024-03-15')
      expect(result).toBe(true)
    })

    it('should handle year boundaries', () => {
      expect(isDateInRange('2024-01-01', '2023-12-01', '2024-01-31')).toBe(true)
      expect(isDateInRange('2023-12-31', '2023-12-01', '2024-01-31')).toBe(true)
    })

    it('should return false when date is just outside start', () => {
      const result = isDateInRange('2024-02-29', '2024-03-01', '2024-03-31')
      expect(result).toBe(false)
    })
  })

  describe('getDaysBetweenDates', () => {
    it('should calculate days between two dates', () => {
      const result = getDaysBetweenDates('2024-03-01', '2024-03-15')
      expect(result).toBe(14)
    })

    it('should return 0 for same date', () => {
      const result = getDaysBetweenDates('2024-03-15', '2024-03-15')
      expect(result).toBe(0)
    })

    it('should return negative for reversed dates', () => {
      const result = getDaysBetweenDates('2024-03-15', '2024-03-01')
      expect(result).toBe(-14)
    })

    it('should handle one day difference', () => {
      const result = getDaysBetweenDates('2024-03-15', '2024-03-16')
      expect(result).toBe(1)
    })

    it('should handle month boundaries', () => {
      const result = getDaysBetweenDates('2024-03-30', '2024-04-02')
      expect(result).toBe(3)
    })

    it('should handle year boundaries', () => {
      const result = getDaysBetweenDates('2023-12-30', '2024-01-02')
      expect(result).toBe(3)
    })

    it('should handle leap year', () => {
      const result = getDaysBetweenDates('2024-02-28', '2024-03-01')
      expect(result).toBe(2) // 2024 is a leap year
    })

    it('should handle non-leap year', () => {
      const result = getDaysBetweenDates('2023-02-28', '2023-03-01')
      expect(result).toBe(1) // 2023 is not a leap year
    })

    it('should handle large date ranges', () => {
      const result = getDaysBetweenDates('2024-01-01', '2024-12-31')
      expect(result).toBe(365) // 2024 is a leap year
    })
  })

  describe('createFireDateRange', () => {
    it('should create date range with default values', () => {
      const result = createFireDateRange()

      expect(result).toHaveProperty('prefireStart')
      expect(result).toHaveProperty('prefireEnd')
      expect(result).toHaveProperty('postfireStart')
      expect(result).toHaveProperty('postfireEnd')

      // All should be ISO date strings
      expect(result.prefireStart).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.prefireEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.postfireStart).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.postfireEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should create dates in correct chronological order', () => {
      const result = createFireDateRange()

      const preStart = new Date(result.prefireStart)
      const preEnd = new Date(result.prefireEnd)
      const postStart = new Date(result.postfireStart)
      const postEnd = new Date(result.postfireEnd)

      // Verify the relative ordering (all dates should be in the past with defaults)
      expect(preStart < preEnd).toBe(true)
      expect(preEnd < postStart).toBe(true)
      expect(postStart < postEnd).toBe(true)
    })

    it('should create date range with custom values', () => {
      const result = createFireDateRange(100, 80, 40, 20)

      const preStart = new Date(result.prefireStart)
      const preEnd = new Date(result.prefireEnd)
      const postStart = new Date(result.postfireStart)
      const postEnd = new Date(result.postfireEnd)

      // Verify the relative ordering
      expect(preStart < preEnd).toBe(true)
      expect(preEnd < postStart).toBe(true)
      expect(postStart < postEnd).toBe(true)
    })

    it('should use default values (60, 45, 30, 15) when called without arguments', () => {
      const result = createFireDateRange()
      const today = new Date()

      const preStart = new Date(result.prefireStart)
      const preEnd = new Date(result.prefireEnd)
      const postStart = new Date(result.postfireStart)
      const postEnd = new Date(result.postfireEnd)

      // Calculate expected dates
      const expectedPreStart = new Date(today)
      expectedPreStart.setDate(today.getDate() - 60)
      const expectedPreEnd = new Date(today)
      expectedPreEnd.setDate(today.getDate() - 45)
      const expectedPostStart = new Date(today)
      expectedPostStart.setDate(today.getDate() - 30)
      const expectedPostEnd = new Date(today)
      expectedPostEnd.setDate(today.getDate() - 15)

      // Verify dates match expected (within same day)
      expect(preStart.toISOString().split('T')[0]).toBe(expectedPreStart.toISOString().split('T')[0])
      expect(preEnd.toISOString().split('T')[0]).toBe(expectedPreEnd.toISOString().split('T')[0])
      expect(postStart.toISOString().split('T')[0]).toBe(expectedPostStart.toISOString().split('T')[0])
      expect(postEnd.toISOString().split('T')[0]).toBe(expectedPostEnd.toISOString().split('T')[0])
    })

    it('should handle custom values with different spacing', () => {
      const result = createFireDateRange(10, 8, 4, 2)

      const preStart = new Date(result.prefireStart)
      const preEnd = new Date(result.prefireEnd)
      const postStart = new Date(result.postfireStart)
      const postEnd = new Date(result.postfireEnd)

      // Calculate expected day differences
      const preFireDays = Math.abs(getDaysBetweenDates(result.prefireStart, result.prefireEnd))
      const postFireDays = Math.abs(getDaysBetweenDates(result.postfireStart, result.postfireEnd))

      expect(preFireDays).toBe(2)  // 10 - 8
      expect(postFireDays).toBe(2) // 4 - 2
    })

    it('should handle zero values', () => {
      const result = createFireDateRange(5, 4, 2, 0)

      expect(result.postfireEnd).toBe(getTodayISO())
    })
  })
})
