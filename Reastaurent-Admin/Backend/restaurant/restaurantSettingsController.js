const restaurantSettingsModel = require("./restaurantSettingsModel");

const TIME_FORMATTER_CACHE = new Map();
const DAY_FORMATTER_CACHE = new Map();
const WEEK_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const DEFAULT_WEEKLY_SCHEDULE = {
  sunday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  monday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  tuesday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  wednesday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  thursday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  friday: { enabled: true, start_time: "07:00", end_time: "02:00" },
  saturday: { enabled: true, start_time: "08:00", end_time: "02:00" },
};

const getTimeFormatter = (timezoneName) => {
  if (!TIME_FORMATTER_CACHE.has(timezoneName)) {
    TIME_FORMATTER_CACHE.set(
      timezoneName,
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezoneName,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    );
  }

  return TIME_FORMATTER_CACHE.get(timezoneName);
};

const getDayFormatter = (timezoneName) => {
  if (!DAY_FORMATTER_CACHE.has(timezoneName)) {
    DAY_FORMATTER_CACHE.set(
      timezoneName,
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezoneName,
        weekday: "long",
      })
    );
  }

  return DAY_FORMATTER_CACHE.get(timezoneName);
};

const getCurrentTimeInTimezone = (timezoneName) => {
  try {
    return getTimeFormatter(timezoneName).format(new Date());
  } catch (_error) {
    return getTimeFormatter("Asia/Kolkata").format(new Date());
  }
};

const getCurrentDayInTimezone = (timezoneName) => {
  try {
    return getDayFormatter(timezoneName).format(new Date()).toLowerCase();
  } catch (_error) {
    return getDayFormatter("Asia/Kolkata").format(new Date()).toLowerCase();
  }
};

const getCurrentDateInTimezone = (timezoneName) => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezoneName,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${partMap.year}-${partMap.month}-${partMap.day}`;
  } catch (_error) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
};

const normalizeTime = (value) => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
};

const isValidTimeString = (value) => /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(String(value));

const normalizeWeeklySchedule = (input, fallbackStartTime = null, fallbackEndTime = null) => {
  const source = input && typeof input === "object" ? input : {};

  return WEEK_DAYS.reduce((schedule, day) => {
    const fallbackDay = DEFAULT_WEEKLY_SCHEDULE[day];
    const incoming = source[day] || {};
    const enabled =
      typeof incoming.enabled !== "undefined"
        ? Boolean(incoming.enabled)
        : typeof incoming.closed !== "undefined"
          ? !Boolean(incoming.closed)
          : Boolean(fallbackDay.enabled);
    const startTime = normalizeTime(incoming.start_time || incoming.open_time || fallbackStartTime || fallbackDay.start_time);
    const endTime = normalizeTime(incoming.end_time || incoming.close_time || fallbackEndTime || fallbackDay.end_time);

    schedule[day] = {
      enabled,
      closed: !enabled,
      start_time: enabled && startTime ? startTime.slice(0, 5) : null,
      end_time: enabled && endTime ? endTime.slice(0, 5) : null,
    };

    return schedule;
  }, {});
};

const validateWeeklySchedule = (schedule) => {
  for (const day of WEEK_DAYS) {
    const daySchedule = schedule[day];

    if (!daySchedule.enabled) {
      continue;
    }

    if (!daySchedule.start_time || !daySchedule.end_time) {
      return `${day} opening and closing time are required`;
    }

    if (!isValidTimeString(daySchedule.start_time) || !isValidTimeString(daySchedule.end_time)) {
      return `${day} has an invalid time format. Use HH:MM`;
    }
  }

  return null;
};

const normalizeSpecialDates = (input) => {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const normalized = {};

  Object.entries(source).forEach(([dateKey, value]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !value || typeof value !== "object") {
      return;
    }

    const mode = value.mode || value.type || "weekly";
    const startTime = normalizeTime(value.start_time || value.open_time);
    const endTime = normalizeTime(value.end_time || value.close_time);

    if (mode === "closed" || mode === "open_24_hours" || mode === "weekly") {
      normalized[dateKey] = { mode };
      return;
    }

    if (mode === "custom" && startTime && endTime) {
      normalized[dateKey] = {
        mode: "custom",
        start_time: startTime.slice(0, 5),
        end_time: endTime.slice(0, 5),
      };
    }
  });

  return normalized;
};

const validateSpecialDates = (specialDates) => {
  for (const [dateKey, setting] of Object.entries(specialDates)) {
    if (setting.mode !== "custom") {
      continue;
    }

    if (!isValidTimeString(setting.start_time) || !isValidTimeString(setting.end_time)) {
      return `${dateKey} has an invalid custom time. Use HH:MM`;
    }
  }

  return null;
};

const isWithinScheduledWindow = (currentTime, startTime, endTime) => {
  if (!startTime || !endTime) {
    return false;
  }

  if (startTime === endTime) {
    return true;
  }

  if (startTime < endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  }

  return currentTime >= startTime || currentTime <= endTime;
};

const buildSettingsResponse = (settings) => {
  const timezoneName = settings.timezone_name || "Asia/Kolkata";
  const currentTime = getCurrentTimeInTimezone(timezoneName);
  const currentDate = getCurrentDateInTimezone(timezoneName);
  const currentDay = getCurrentDayInTimezone(timezoneName);
  const fallbackStartTime = normalizeTime(settings.schedule_start_time);
  const fallbackEndTime = normalizeTime(settings.schedule_end_time);
  const weeklySchedule = normalizeWeeklySchedule(
    settings.weekly_schedule,
    fallbackStartTime,
    fallbackEndTime
  );
  const todaySchedule = weeklySchedule[currentDay];
  const specialDates = normalizeSpecialDates(settings.special_dates);
  const todaySpecialDate = specialDates[currentDate] || null;
  const scheduleEnabled = Number(settings.schedule_enabled) === 1;
  const manualOverrideEnabled = Number(settings.manual_override_enabled) === 1;
  const manualIsActive = Number(settings.manual_is_active) === 1;

  const weeklyScheduleIsActive =
    scheduleEnabled && todaySchedule?.enabled && todaySchedule.start_time && todaySchedule.end_time
      ? isWithinScheduledWindow(currentTime, `${todaySchedule.start_time}:00`, `${todaySchedule.end_time}:00`)
      : false;

  let specialDateIsActive = null;
  if (todaySpecialDate?.mode === "closed") {
    specialDateIsActive = false;
  } else if (todaySpecialDate?.mode === "open_24_hours") {
    specialDateIsActive = true;
  } else if (todaySpecialDate?.mode === "custom") {
    specialDateIsActive = isWithinScheduledWindow(
      currentTime,
      `${todaySpecialDate.start_time}:00`,
      `${todaySpecialDate.end_time}:00`
    );
  }

  const scheduleIsActive = specialDateIsActive === null ? weeklyScheduleIsActive : specialDateIsActive;
  const currentStatus = manualOverrideEnabled || !scheduleEnabled ? manualIsActive : scheduleIsActive;
  const currentStatusSource = manualOverrideEnabled
    ? manualIsActive
      ? "force open"
      : "force closed"
    : !scheduleEnabled
      ? "manual"
      : todaySpecialDate && todaySpecialDate.mode !== "weekly"
        ? "special date"
        : "weekly schedule";

  return {
    ...settings,
    manual_override_enabled: manualOverrideEnabled ? 1 : 0,
    schedule_start_time: fallbackStartTime ? fallbackStartTime.slice(0, 5) : "",
    schedule_end_time: fallbackEndTime ? fallbackEndTime.slice(0, 5) : "",
    weekly_schedule: weeklySchedule,
    special_dates: specialDates,
    current_status: currentStatus ? 1 : 0,
    current_status_source: currentStatusSource,
    current_date: currentDate,
    current_time: currentTime.slice(0, 5),
    current_day: currentDay,
    today_schedule: todaySchedule || null,
    today_special_date: todaySpecialDate,
    schedule_is_active_now: scheduleIsActive ? 1 : 0,
  };
};

const getRestaurantSettings = async (req, res) => {
  try {
    const settings = await restaurantSettingsModel.getByAdminId(req.admin.id);

    return res.status(200).json({
      success: true,
      data: buildSettingsResponse(settings),
    });
  } catch (error) {
    console.error("Error fetching restaurant settings:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateRestaurantSettings = async (req, res) => {
  try {
    const {
      institution_name,
      restaurant_name,
      manual_override_enabled,
      manual_is_active,
      schedule_enabled,
      schedule_start_time,
      schedule_end_time,
      weekly_schedule,
      special_dates,
      timezone_name,
      address,
      latitude,
      longitude,
    } = req.body;

    if (!institution_name || !restaurant_name) {
      return res.status(400).json({
        success: false,
        message: "institution_name and restaurant_name are required",
      });
    }

    const normalizedStartTime = normalizeTime(schedule_start_time);
    const normalizedEndTime = normalizeTime(schedule_end_time);
    const normalizedScheduleEnabled = Number(schedule_enabled) === 1 ? 1 : 0;
    const normalizedManualOverrideEnabled = Number(manual_override_enabled) === 1 ? 1 : 0;
    const normalizedManualIsActive = Number(manual_is_active) === 0 ? 0 : 1;
    const normalizedWeeklySchedule = normalizeWeeklySchedule(
      weekly_schedule,
      normalizedStartTime,
      normalizedEndTime
    );
    const normalizedSpecialDates = normalizeSpecialDates(special_dates);

    if (normalizedScheduleEnabled) {
      const scheduleError = validateWeeklySchedule(normalizedWeeklySchedule);
      if (scheduleError) {
        return res.status(400).json({
          success: false,
          message: scheduleError,
        });
      }
    }

    const specialDatesError = validateSpecialDates(normalizedSpecialDates);
    if (specialDatesError) {
      return res.status(400).json({
        success: false,
        message: specialDatesError,
      });
    }

    const settings = await restaurantSettingsModel.upsertByAdminId({
      adminId: req.admin.id,
      institutionName: String(institution_name).trim(),
      restaurantName: String(restaurant_name).trim(),
      manualOverrideEnabled: normalizedManualOverrideEnabled,
      manualIsActive: normalizedManualIsActive,
      scheduleEnabled: normalizedScheduleEnabled,
      scheduleStartTime: normalizedScheduleEnabled ? normalizedStartTime : null,
      scheduleEndTime: normalizedScheduleEnabled ? normalizedEndTime : null,
      weeklySchedule: normalizedWeeklySchedule,
      specialDates: normalizedSpecialDates,
      timezoneName: timezone_name ? String(timezone_name).trim() : "Asia/Kolkata",
      address: typeof address === "string" ? address.trim() : "",
      latitude: latitude !== null && typeof latitude !== "undefined" && latitude !== "" ? Number(latitude) : null,
      longitude: longitude !== null && typeof longitude !== "undefined" && longitude !== "" ? Number(longitude) : null,
    });

    return res.status(200).json({
      success: true,
      message: "Restaurant settings updated successfully",
      data: buildSettingsResponse(settings),
    });
  } catch (error) {
    console.error("Error updating restaurant settings:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const toggleRestaurantStatus = async (req, res) => {
  try {
    const { manual_is_active, manual_override_enabled } = req.body;

    if (typeof manual_is_active === "undefined") {
      return res.status(400).json({
        success: false,
        message: "manual_is_active is required",
      });
    }

    const settings = await restaurantSettingsModel.updateManualStatus(
      req.admin.id,
      Number(manual_is_active) === 0 ? 0 : 1,
      typeof manual_override_enabled === "undefined"
        ? 1
        : Number(manual_override_enabled) === 1
          ? 1
          : 0
    );

    return res.status(200).json({
      success: true,
      message: "Restaurant status updated successfully",
      data: buildSettingsResponse(settings),
    });
  } catch (error) {
    console.error("Error toggling restaurant status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getRestaurantSettings,
  updateRestaurantSettings,
  toggleRestaurantStatus,
};
