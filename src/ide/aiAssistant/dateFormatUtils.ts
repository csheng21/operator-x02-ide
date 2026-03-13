// dateFormatUtils.ts - Date Formatting Utilities (FIXED)
// ✅ Fixed: Math.ceil bug causing today's conversations to show as "Yesterday"
// ✅ Fixed: Invalid date handling  
// ✅ Fixed: Uses calendar-day comparison instead of hour-based diff

export function formatConversationTime(date: Date): string {
  // Guard against invalid dates
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  
  const now = new Date();
  
  // Use calendar-day comparison (accurate across midnight boundaries)
  if (isSameDay(now, date)) {
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(yesterday, date)) {
    return `Yesterday`;
  }
  
  // Within last 7 days - show short day name
  const diffDays = getDayDifference(date, now);
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  // Same year - "Jan 15"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // Different year - "Jan 15, 2024"
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatConversationDate(date: Date): string {
  // Guard against invalid dates
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  
  const now = new Date();
  
  // ✅ FIX: Use calendar-day comparison instead of Math.ceil
  // Old code: Math.ceil(diffTime / dayMs) returned 1 for same-day → showed "Yesterday"
  if (isSameDay(now, date)) {
    return 'Today';
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(yesterday, date)) {
    return 'Yesterday';
  }
  
  const diffDays = getDayDifference(date, now);
  if (diffDays < 7) {
    return date.toLocaleDateString('en', { weekday: 'long' });
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  
  return date.toLocaleDateString('en', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
}

export function isDateToday(date: Date): boolean {
  return isSameDay(new Date(), date);
}

// ── Helpers ─────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function getDayDifference(earlier: Date, later: Date): number {
  // Normalize to midnight to get accurate calendar day difference
  const a = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const b = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
