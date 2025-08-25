import { formatDistanceToNow, format as formatDate, isValid } from 'date-fns'

export const formatters = {
  // Date formatting
  date: (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return isValid(d) ? formatDate(d, 'MMM dd, yyyy') : 'Invalid date'
  },
  
  dateTime: (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return isValid(d) ? formatDate(d, 'MMM dd, yyyy at HH:mm') : 'Invalid date'
  },
  
  timeAgo: (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : 'Invalid date'
  },
  
  // Duration formatting
  duration: (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  },
  
  // Number formatting
  number: (num: number) => {
    return num.toLocaleString()
  },
  
  percentage: (num: number, decimals = 1) => {
    return `${num.toFixed(decimals)}%`
  },
  
  fileSize: (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  },
  
  // Text formatting
  truncate: (text: string, length: number) => {
    return text.length <= length ? text : `${text.slice(0, length)}...`
  },
  
  capitalize: (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  },
  
  // Status formatting
  sessionStatus: (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'Active',
      completed: 'Completed',
      paused: 'Paused',
      error: 'Error'
    }
    return statusMap[status] || 'Unknown'
  }
}

// Utility functions for common formatting tasks
export const formatSessionDuration = (startTime: Date | string, endTime?: Date | string | null) => {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : new Date()
  
  if (!isValid(start) || !isValid(end)) {
    return 'Invalid duration'
  }
  
  const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
  return formatters.duration(duration)
}

export const formatContextSize = (contextSize: number) => {
  if (contextSize < 1000) {
    return `${contextSize} items`
  }
  return `${(contextSize / 1000).toFixed(1)}k items`
}

export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    paused: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}