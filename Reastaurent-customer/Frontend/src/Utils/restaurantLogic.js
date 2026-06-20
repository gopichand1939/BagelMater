export const isRestaurantOpen = (settings) => {
  if (!settings) return true; // Default open if no settings loaded yet

  if (settings.manual_override_enabled === 1) {
    return settings.manual_is_active === 1;
  }

  if (settings.schedule_enabled === 0) {
    return true; // If no schedule, assume open
  }

  // Get current time in cafe's timezone
  const now = new Date();
  const timeZone = settings.timezone_name || "Asia/Kolkata";
  
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    
    // Hacky way to parse the time in target timezone
    const parts = formatter.formatToParts(now);
    const weekday = parts.find(p => p.type === "weekday")?.value.toLowerCase();
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);

    const todaySchedule = settings.weekly_schedule?.[weekday];
    
    if (!todaySchedule || !todaySchedule.enabled) {
      return false; // Closed today
    }

    const [startH, startM] = (todaySchedule.start_time || "00:00").split(":").map(Number);
    const [endH, endM] = (todaySchedule.end_time || "23:59").split(":").map(Number);

    const currentMinutes = hour * 60 + minute;
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
      // Crosses midnight
      if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) {
        return true;
      }
      return false;
    } else {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  } catch (error) {
    console.error("Error calculating restaurant status:", error);
    return true; // Fallback
  }
};
