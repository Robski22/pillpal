/**
 * Date utilities for Saturday/Sunday scheduling
 * Philippine Timezone (UTC+8)
 */

/**
 * Get the nearest Saturday from today (Philippine time)
 * @returns Date object for the nearest Saturday
 */
export function getNearestSaturday(): Date {
  const now = new Date()
  // Convert to Philippine time (UTC+8)
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  
  const dayOfWeek = phTime.getDay() // 0 = Sunday, 6 = Saturday
  const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7 || 7
  
  const nearestSaturday = new Date(phTime)
  nearestSaturday.setDate(phTime.getDate() + daysUntilSaturday)
  nearestSaturday.setHours(0, 0, 0, 0) // Reset to start of day
  
  return nearestSaturday
}

/**
 * Get the nearest Sunday from today (Philippine time)
 * @returns Date object for the nearest Sunday
 */
export function getNearestSunday(): Date {
  const now = new Date()
  // Convert to Philippine time (UTC+8)
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  
  const dayOfWeek = phTime.getDay() // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : (7 - dayOfWeek) % 7 || 7
  
  const nearestSunday = new Date(phTime)
  nearestSunday.setDate(phTime.getDate() + daysUntilSunday)
  nearestSunday.setHours(0, 0, 0, 0) // Reset to start of day
  
  return nearestSunday
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get day name from day of week number
 * @param dayOfWeek 0 = Sunday, 6 = Saturday
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || 'Unknown'
}

/**
 * Get current Philippine time
 */
export function getPhilippineTime(): Date {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
}

