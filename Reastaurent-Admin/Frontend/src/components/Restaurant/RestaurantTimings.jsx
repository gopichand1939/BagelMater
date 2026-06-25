import { useEffect, useMemo, useState } from "react";
import { LuCalendarDays, LuChevronLeft, LuChevronRight, LuClock, LuSave, LuCompass, LuMapPin } from "react-icons/lu";
import { toast } from "react-toastify";
import { useGeolocation } from "../../hooks/useGeolocation";
import { RESTAURANT_SETTINGS } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import PageHeader from "../common/PageHeader";

const WEEK_DAYS = [
  { key: "sunday", label: "Sunday", short: "Sun" },
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
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
const LIVE_STATUS_REFRESH_MS = 5000;

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long" });

const pad = (value) => String(value).padStart(2, "0");
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dateFromKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatTime = (value) => {
  if (!value) {
    return "--";
  }

  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2026, 0, 1, hours, minutes || 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
};

const normalizeSchedule = (schedule = {}) =>
  WEEK_DAYS.reduce((result, day) => {
    const source = schedule?.[day.key] || DEFAULT_WEEKLY_SCHEDULE[day.key];
    const enabled =
      typeof source.enabled === "undefined" ? !source.closed : Boolean(source.enabled);

    result[day.key] = {
      enabled,
      closed: !enabled,
      start_time: enabled ? source.start_time || DEFAULT_WEEKLY_SCHEDULE[day.key].start_time : "",
      end_time: enabled ? source.end_time || DEFAULT_WEEKLY_SCHEDULE[day.key].end_time : "",
    };

    return result;
  }, {});

const normalizeSpecialDates = (specialDates = {}) => {
  if (!specialDates || typeof specialDates !== "object" || Array.isArray(specialDates)) {
    return {};
  }

  return Object.entries(specialDates).reduce((result, [dateKey, setting]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !setting || typeof setting !== "object") {
      return result;
    }

    result[dateKey] = {
      mode: setting.mode || "weekly",
      start_time: setting.start_time || "10:00",
      end_time: setting.end_time || "18:00",
    };
    return result;
  }, {});
};

const getAvailabilityMode = (settings) => {
  if (Number(settings?.manual_override_enabled) !== 1) {
    return "schedule";
  }

  return Number(settings?.manual_is_active) === 1 ? "force_open" : "force_closed";
};

const modeToManualFields = (mode) => ({
  manual_override_enabled: mode === "schedule" ? 0 : 1,
  manual_is_active: mode === "force_closed" ? 0 : 1,
  schedule_enabled: 1,
});

const getCalendarDays = (visibleMonth) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === month,
    };
  });
};

function RestaurantTimings() {
  const todayKey = toDateKey(new Date());
  const [form, setForm] = useState({
    institution_name: "",
    restaurant_name: "",
    timezone_name: "Asia/Kolkata",
    availability_mode: "schedule",
    weekly_schedule: normalizeSchedule(DEFAULT_WEEKLY_SCHEDULE),
    special_dates: {},
    address: "",
    latitude: "",
    longitude: "",
  });
  const [locationMethod, setLocationMethod] = useState("manual");
  const { loading: geoLoading, error: geoError, detectLocation } = useGeolocation();

  const handleDetectLocation = async () => {
    try {
      const data = await detectLocation();
      setForm((current) => ({
        ...current,
        address: data.fullAddress || current.address,
        latitude: data.latitude !== null ? String(data.latitude) : "",
        longitude: data.longitude !== null ? String(data.longitude) : "",
      }));
      toast.success("Location successfully detected!");
    } catch (err) {
      toast.error(err.message || "Failed to detect current location.");
    }
  };
  const [statusInfo, setStatusInfo] = useState({
    current_status: 0,
    current_status_source: "weekly schedule",
    current_time: "",
    current_day: "",
    current_date: todayKey,
  });
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedDateObject = useMemo(() => dateFromKey(selectedDate), [selectedDate]);
  const selectedSetting = form.special_dates[selectedDate] || { mode: "weekly" };

  const applySettings = (settings) => {
    const currentDate = settings?.current_date || todayKey;

    setForm({
      institution_name: settings?.institution_name || "",
      restaurant_name: settings?.restaurant_name || "",
      timezone_name: settings?.timezone_name || "Asia/Kolkata",
      availability_mode: getAvailabilityMode(settings),
      weekly_schedule: normalizeSchedule(settings?.weekly_schedule || DEFAULT_WEEKLY_SCHEDULE),
      special_dates: normalizeSpecialDates(settings?.special_dates),
      address: settings?.address || "",
      latitude: settings?.latitude !== null && settings?.latitude !== undefined ? String(settings.latitude) : "",
      longitude: settings?.longitude !== null && settings?.longitude !== undefined ? String(settings.longitude) : "",
    });

    const hasCoords = settings?.latitude !== null && settings?.latitude !== undefined && settings?.latitude !== "";
    setLocationMethod(hasCoords ? "manual" : "gps");

    setStatusInfo({
      current_status: Number(settings?.current_status) === 1 ? 1 : 0,
      current_status_source: settings?.current_status_source || "weekly schedule",
      current_time: settings?.current_time || "",
      current_day: settings?.current_day || "",
      current_date: currentDate,
    });
    setSelectedDate((current) => current || currentDate);
  };

  const loadSettings = async () => {
    setIsLoading(true);

    try {
      const response = await fetchWithRefreshToken(RESTAURANT_SETTINGS);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load restaurant availability");
      }

      applySettings(data.data || {});
    } catch (error) {
      toast.error(error.message || "Failed to load restaurant availability");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (isLoading) {
      return undefined;
    }

    let isDisposed = false;

    const refreshLiveStatus = async () => {
      try {
        const response = await fetchWithRefreshToken(RESTAURANT_SETTINGS);
        const data = await response.json();

        if (isDisposed || !response.ok || data.success === false) {
          return;
        }

        const settings = data.data || {};
        setStatusInfo({
          current_status: Number(settings?.current_status) === 1 ? 1 : 0,
          current_status_source: settings?.current_status_source || "weekly schedule",
          current_time: settings?.current_time || "",
          current_day: settings?.current_day || "",
          current_date: settings?.current_date || todayKey,
        });
      } catch (_error) {
        // Live refresh should stay quiet; manual save/load still shows errors.
      }
    };

    const intervalId = window.setInterval(refreshLiveStatus, LIVE_STATUS_REFRESH_MS);
    window.addEventListener("focus", refreshLiveStatus);
    document.addEventListener("visibilitychange", refreshLiveStatus);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshLiveStatus);
      document.removeEventListener("visibilitychange", refreshLiveStatus);
    };
  }, [isLoading, todayKey]);

  const setFieldValue = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setScheduleValue = (dayKey, field, value) => {
    setForm((current) => {
      const currentDay = current.weekly_schedule[dayKey];
      const nextDay = { ...currentDay, [field]: value };

      if (field === "closed") {
        nextDay.enabled = !value;
        if (!value) {
          nextDay.start_time = nextDay.start_time || DEFAULT_WEEKLY_SCHEDULE[dayKey].start_time;
          nextDay.end_time = nextDay.end_time || DEFAULT_WEEKLY_SCHEDULE[dayKey].end_time;
        }
      }

      return {
        ...current,
        weekly_schedule: {
          ...current.weekly_schedule,
          [dayKey]: nextDay,
        },
      };
    });
  };

  const setSelectedDateSetting = (nextSetting) => {
    setForm((current) => {
      const nextSpecialDates = { ...current.special_dates };

      if (nextSetting.mode === "weekly") {
        delete nextSpecialDates[selectedDate];
      } else {
        nextSpecialDates[selectedDate] = {
          mode: nextSetting.mode,
          start_time: nextSetting.start_time || selectedSetting.start_time || "10:00",
          end_time: nextSetting.end_time || selectedSetting.end_time || "18:00",
        };
      }

      return { ...current, special_dates: nextSpecialDates };
    });
  };

  const applyQuickAction = (action) => {
    const baseDate = dateFromKey(selectedDate);
    const updates = {};

    if (action === "multiple") {
      for (let index = 0; index < 3; index += 1) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + index);
        updates[toDateKey(date)] = { mode: "closed", start_time: "10:00", end_time: "18:00" };
      }
      toast.info("Marked selected date and next 2 dates as closed");
    }

    if (action === "sunday") {
      const year = visibleMonth.getFullYear();
      const month = visibleMonth.getMonth();
      for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day += 1) {
        const date = new Date(year, month, day);
        if (date.getDay() === 0) {
          updates[toDateKey(date)] = { mode: "closed", start_time: "10:00", end_time: "18:00" };
        }
      }
      toast.info("Marked every Sunday this month as closed");
    }

    if (action === "festival") {
      updates[selectedDate] = { mode: "closed", start_time: "10:00", end_time: "18:00" };
      toast.info("Festival closure added");
    }

    if (action === "maintenance") {
      updates[selectedDate] = { mode: "custom", start_time: "17:00", end_time: "22:00" };
      toast.info("Maintenance break timing added");
    }

    setForm((current) => ({
      ...current,
      special_dates: {
        ...current.special_dates,
        ...updates,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    // Validate coordinates
    const latNum = form.latitude !== "" ? Number(form.latitude) : null;
    const lonNum = form.longitude !== "" ? Number(form.longitude) : null;

    if (latNum !== null && (isNaN(latNum) || latNum < -90 || latNum > 90)) {
      toast.error("Latitude must be a valid number between -90 and 90.");
      setIsSaving(false);
      return;
    }
    if (lonNum !== null && (isNaN(lonNum) || lonNum < -180 || lonNum > 180)) {
      toast.error("Longitude must be a valid number between -180 and 180.");
      setIsSaving(false);
      return;
    }

    try {
      const manualFields = modeToManualFields(form.availability_mode);
      const response = await fetchWithRefreshToken(RESTAURANT_SETTINGS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_name: form.institution_name.trim() || "Restaurant Group",
          restaurant_name: form.restaurant_name.trim() || "Restaurant",
          timezone_name: form.timezone_name.trim() || "Asia/Kolkata",
          ...manualFields,
          weekly_schedule: form.weekly_schedule,
          special_dates: form.special_dates,
          address: form.address.trim(),
          latitude: latNum,
          longitude: lonNum,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to save restaurant availability");
      }

      applySettings(data.data || {});
      toast.success("Restaurant availability saved");
    } catch (error) {
      toast.error(error.message || "Failed to save restaurant availability");
    } finally {
      setIsSaving(false);
    }
  };

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  const getDateTone = (dateKey) => {
    const setting = form.special_dates[dateKey];

    if (!setting || setting.mode === "weekly") {
      return "border-slate-200 bg-slate-50 text-slate-700";
    }

    if (setting.mode === "closed") {
      return "border-red-200 bg-red-50 text-red-800";
    }

    if (setting.mode === "custom") {
      return "border-orange-200 bg-orange-50 text-orange-800";
    }

    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  };

  const getSelectedSummary = () => {
    const dayKey = WEEK_DAYS[selectedDateObject.getDay()].key;
    const weekly = form.weekly_schedule[dayKey];

    if (form.availability_mode === "force_closed") {
      return {
        title: "Restaurant Inactive",
        detail: "Master status is inactive, so customers will see the restaurant as closed.",
      };
    }

    if (selectedSetting.mode === "closed") {
      return {
        title: "Restaurant Closed Entire Day",
        detail: "Customers will see the restaurant as closed for this date.",
      };
    }

    if (selectedSetting.mode === "open_24_hours") {
      return {
        title: "Open 24 Hours",
        detail: "Customers can order all day on this date.",
      };
    }

    if (selectedSetting.mode === "custom") {
      return {
        title: "Custom Timing Active",
        detail: `${formatTime(selectedSetting.start_time)} -> ${formatTime(selectedSetting.end_time)}`,
      };
    }

    if (!weekly?.enabled) {
      return {
        title: "Weekly Schedule Says Closed",
        detail: "Customers will see the restaurant as closed.",
      };
    }

    return {
      title: "Using Weekly Timing",
      detail: `${formatTime(weekly.start_time)} -> ${formatTime(weekly.end_time)}`,
    };
  };

  const selectedSummary = getSelectedSummary();

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Restaurant Availability" subtitle="Calendar-first controls for opening hours." />
        <div className="rounded-[8px] border border-[rgba(148,163,184,0.22)] bg-white/82 p-[22px] shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-[12px]">
          <div className="grid min-h-[220px] place-items-center p-7 text-center">
            <div className="h-[42px] w-[42px] animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Restaurant Availability"
        subtitle="Set weekly hours, choose special dates, and preview exactly what customers will see."
      />

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <section className="grid gap-4 rounded-[8px] border border-[#d8ece3] bg-white px-[22px] py-[18px] shadow-[0_10px_30px_rgba(30,76,60,0.08)] max-sm:p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div
            className={
              statusInfo.current_status === 1
                ? "min-w-[154px] rounded-[8px] bg-green-100 px-4 py-2.5 text-center font-extrabold uppercase text-green-800"
                : "min-w-[154px] rounded-[8px] bg-red-100 px-4 py-2.5 text-center font-extrabold uppercase text-red-800"
            }
          >
            {statusInfo.current_status === 1 ? "Open Now" : "Closed Now"}
          </div>
          <div className="grid min-w-0 gap-[6px]">
            <strong className="text-[#1f2937]">
              Today: {statusInfo.current_day || "--"} {formatTime(statusInfo.current_time)}
            </strong>
            <span className="text-[0.92rem] capitalize text-slate-500">
              Source: {statusInfo.current_status_source} | Timezone: {form.timezone_name}
            </span>
          </div>
          <button
            type="submit"
            className="inline-flex w-fit items-center gap-2 rounded-[8px] border-0 bg-orange-500 px-4 py-[11px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isSaving}
          >
            <LuSave aria-hidden="true" />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </section>

        <section className="grid gap-4 rounded-[8px] border border-slate-200 bg-white p-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <strong className="text-slate-900">Restaurant Status</strong>
              <span className="text-[0.9rem] text-slate-500">
                Active follows weekly schedule and calendar dates. Inactive closes the entire restaurant.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.availability_mode !== "force_closed"}
              onClick={() =>
                setFieldValue(
                  "availability_mode",
                  form.availability_mode === "force_closed" ? "schedule" : "force_closed"
                )
              }
              className={`inline-flex min-h-[44px] min-w-[132px] items-center justify-between gap-3 rounded-[8px] border px-3 py-2 font-extrabold transition ${
                form.availability_mode === "force_closed"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              <span>{form.availability_mode === "force_closed" ? "Inactive" : "Active"}</span>
              <span
                className={`relative h-6 w-11 rounded-full transition ${
                  form.availability_mode === "force_closed" ? "bg-red-300" : "bg-emerald-400"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                    form.availability_mode === "force_closed" ? "left-1" : "left-6"
                  }`}
                />
              </span>
            </button>
          </div>
          {form.availability_mode === "force_closed" ? (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[0.92rem] font-semibold text-red-700">
              Restaurant is inactive. Weekly timings and calendar dates will apply again after switching to Active.
            </div>
          ) : (
            <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.92rem] font-semibold text-emerald-800">
              Restaurant is active and will open or close automatically from the schedule.
            </div>
          )}
        </section>

        <section className="grid gap-4 rounded-[8px] border border-slate-200 bg-white p-[18px]">
          <div className="grid gap-1">
            <strong className="text-slate-900">Weekly Schedule</strong>
            <span className="text-[0.9rem] text-slate-500">Base timings used unless a calendar date has its own setting.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[0.82rem] uppercase text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Day</th>
                  <th className="py-3 pr-4 font-semibold">Open</th>
                  <th className="py-3 pr-4 font-semibold">Close</th>
                  <th className="py-3 pr-4 font-semibold">Closed</th>
                </tr>
              </thead>
              <tbody>
                {WEEK_DAYS.map((day) => {
                  const schedule = form.weekly_schedule[day.key];
                  return (
                    <tr key={day.key} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-3 pr-4 font-semibold text-slate-800">{day.label}</td>
                      <td className="py-3 pr-4">
                        <input
                          type="time"
                          value={schedule.start_time || ""}
                          disabled={schedule.closed}
                          onChange={(event) => setScheduleValue(day.key, "start_time", event.target.value)}
                          className="w-full min-w-[130px] rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="time"
                          value={schedule.end_time || ""}
                          disabled={schedule.closed}
                          onChange={(event) => setScheduleValue(day.key, "end_time", event.target.value)}
                          className="w-full min-w-[130px] rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={schedule.closed}
                          onChange={(event) => setScheduleValue(day.key, "closed", event.target.checked)}
                          className="h-5 w-5 accent-red-500"
                          aria-label={`${day.label} closed`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4 rounded-[8px] border border-slate-200 bg-white p-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <LuCalendarDays className="text-orange-500" aria-hidden="true" />
                <strong className="text-slate-900">{MONTH_FORMATTER.format(visibleMonth)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-[8px] border border-slate-200 bg-white text-slate-700"
                  onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  <LuChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-[8px] border border-slate-200 bg-white text-slate-700"
                  onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  <LuChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[0.78rem] font-bold uppercase text-slate-500">
              {WEEK_DAYS.map((day) => (
                <span key={day.key}>{day.short}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDate(day.key)}
                  className={`min-h-[72px] rounded-[8px] border p-2 text-left transition ${getDateTone(day.key)} ${
                    day.inMonth ? "" : "opacity-35"
                  } ${selectedDate === day.key ? "ring-2 ring-orange-400 ring-offset-1" : ""}`}
                >
                  <span className="block text-[0.95rem] font-extrabold">{day.date.getDate()}</span>
                  <span className="mt-3 block h-1.5 w-8 rounded-full bg-current opacity-40" />
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 text-[0.85rem] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-slate-300" /> Weekly schedule</span>
              <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-red-400" /> Fully closed</span>
              <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-orange-400" /> Custom timings</span>
              <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-emerald-400" /> Open 24 hours</span>
            </div>
          </div>

          <aside className="grid content-start gap-4 rounded-[8px] border border-slate-200 bg-white p-[18px]">
            <div className="grid gap-1">
              <span className="text-[0.82rem] font-bold uppercase text-slate-500">Selected Date</span>
              <strong className="text-[1.25rem] text-slate-950">{DATE_FORMATTER.format(selectedDateObject)}</strong>
              <span className="text-slate-500">{WEEKDAY_FORMATTER.format(selectedDateObject)}</span>
            </div>

            <div className="grid gap-2">
              {[
                ["weekly", "Use Weekly Timing"],
                ["closed", "Closed Entire Day"],
                ["open_24_hours", "Open 24 Hours"],
                ["custom", "Custom Timing"],
              ].map(([value, label]) => (
                <label key={value} className="flex min-h-[44px] items-center gap-3 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="selected_date_mode"
                    value={value}
                    checked={(selectedSetting.mode || "weekly") === value}
                    onChange={() => setSelectedDateSetting({ mode: value })}
                    className="h-4 w-4 accent-orange-500"
                  />
                  {label}
                </label>
              ))}
            </div>

            {selectedSetting.mode === "custom" ? (
              <div className="grid gap-3 rounded-[8px] border border-orange-200 bg-orange-50 p-3">
                <label className="grid gap-1 text-[0.9rem] font-semibold text-slate-700">
                  Open Time
                  <input
                    type="time"
                    value={selectedSetting.start_time || "10:00"}
                    onChange={(event) => setSelectedDateSetting({ ...selectedSetting, mode: "custom", start_time: event.target.value })}
                    className="rounded-[8px] border border-orange-200 bg-white px-3 py-2 text-slate-900 outline-none"
                  />
                </label>
                <label className="grid gap-1 text-[0.9rem] font-semibold text-slate-700">
                  Close Time
                  <input
                    type="time"
                    value={selectedSetting.end_time || "18:00"}
                    onChange={(event) => setSelectedDateSetting({ ...selectedSetting, mode: "custom", end_time: event.target.value })}
                    className="rounded-[8px] border border-orange-200 bg-white px-3 py-2 text-slate-900 outline-none"
                  />
                </label>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              {[
                ["multiple", "Apply to Multiple Dates"],
                ["sunday", "Repeat Every Sunday"],
                ["festival", "Festival Closure"],
                ["maintenance", "Maintenance Break"],
              ].map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  className="min-h-[44px] rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-[0.82rem] font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                  onClick={() => applyQuickAction(action)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-[0.85rem] font-bold uppercase text-emerald-700">
                <LuClock aria-hidden="true" />
                Final Status for {selectedDateObject.getDate()} {MONTH_FORMATTER.format(selectedDateObject).split(" ")[0]}
              </div>
              <strong className="text-slate-950">{selectedSummary.title}</strong>
              <span className="text-[0.92rem] text-slate-700">{selectedSummary.detail}</span>
            </div>
          </aside>
        </section>

        {/* Cafe Address section */}
        <section className="grid gap-4 rounded-[8px] border border-slate-200 bg-white p-[18px]">
          <div className="grid gap-1">
            <strong className="text-slate-900">Cafe Address & Location</strong>
            <span className="text-[0.9rem] text-slate-500">
              Set the physical location and coordinates of the cafe.
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            <label className="flex min-h-[44px] items-center gap-3 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="location_method"
                value="gps"
                checked={locationMethod === "gps"}
                onChange={() => setLocationMethod("gps")}
                className="h-4 w-4 accent-orange-500"
              />
              <span className="flex items-center gap-2">
                <LuCompass className="text-slate-500 h-5 w-5" />
                Use Current Location
              </span>
            </label>

            <label className="flex min-h-[44px] items-center gap-3 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="location_method"
                value="manual"
                checked={locationMethod === "manual"}
                onChange={() => setLocationMethod("manual")}
                className="h-4 w-4 accent-orange-500"
              />
              <span className="flex items-center gap-2">
                <LuMapPin className="text-slate-500 h-5 w-5" />
                Enter Address Manually
              </span>
            </label>
          </div>

          {locationMethod === "gps" && (
            <div className="mt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={geoLoading}
                className="inline-flex w-fit items-center gap-2 rounded-[8px] border-0 bg-slate-800 hover:bg-slate-900 px-4 py-2.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-55"
              >
                {geoLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                    Detecting Location...
                  </>
                ) : (
                  <>
                    <LuCompass className="h-4 w-4" />
                    Get Location from Browser GPS
                  </>
                )}
              </button>
              {geoError && (
                <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-[0.92rem] font-semibold text-red-700">
                  {geoError}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 mt-2">
            <div className="grid gap-1.5">
              <label htmlFor="cafe_address" className="text-sm font-semibold text-slate-700">
                Physical Address
              </label>
              <textarea
                id="cafe_address"
                rows={3}
                value={form.address}
                onChange={(e) => setFieldValue("address", e.target.value)}
                disabled={locationMethod === "gps" && geoLoading}
                placeholder="Enter complete physical address of the cafe..."
                className="w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="cafe_latitude" className="text-sm font-semibold text-slate-700">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  id="cafe_latitude"
                  value={form.latitude}
                  onChange={(e) => setFieldValue("latitude", e.target.value)}
                  disabled={locationMethod === "gps"}
                  placeholder="e.g. 51.5074"
                  className="w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="cafe_longitude" className="text-sm font-semibold text-slate-700">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  id="cafe_longitude"
                  value={form.longitude}
                  onChange={(e) => setFieldValue("longitude", e.target.value)}
                  disabled={locationMethod === "gps"}
                  placeholder="e.g. -0.1278"
                  className="w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

export default RestaurantTimings;
