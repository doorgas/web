'use client'

import { useState, useEffect } from 'react'

interface DateDisplayProps {
  date: Date | string
  format?: 'date' | 'time' | 'datetime'
  className?: string
}

export function DateDisplay({ date, format = 'date', className }: DateDisplayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder during SSR to prevent hydration mismatch
    return <span className={className}>Loading...</span>
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date

  const formatDate = () => {
    switch (format) {
      case 'time':
        return dateObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      case 'datetime':
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      default:
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        })
    }
  }

  return <span className={className}>{formatDate()}</span>
}