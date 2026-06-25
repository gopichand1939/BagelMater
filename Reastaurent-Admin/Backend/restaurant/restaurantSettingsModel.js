const db = require("../config/db");

const DEFAULT_WEEKLY_SCHEDULE = {
  sunday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  monday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  tuesday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  wednesday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  thursday: { enabled: true, start_time: "07:00", end_time: "23:00" },
  friday: { enabled: true, start_time: "07:00", end_time: "02:00" },
  saturday: { enabled: true, start_time: "08:00", end_time: "02:00" },
};

const ensureRestaurantSettingsTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS restaurant_settings (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL UNIQUE REFERENCES admin(id) ON DELETE CASCADE,
      institution_name VARCHAR(255) NOT NULL DEFAULT 'Bagel Master Group',
      restaurant_name VARCHAR(255) NOT NULL DEFAULT 'Bagel Master Cafe',
      manual_override_enabled SMALLINT NOT NULL DEFAULT 0,
      manual_is_active SMALLINT NOT NULL DEFAULT 1,
      schedule_enabled SMALLINT NOT NULL DEFAULT 0,
      schedule_start_time TIME,
      schedule_end_time TIME,
      weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
      special_dates JSONB NOT NULL DEFAULT '{}'::jsonb,
      timezone_name VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
      address VARCHAR(500) NOT NULL DEFAULT '',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alterTableQuery = `
    ALTER TABLE restaurant_settings
    ADD COLUMN IF NOT EXISTS institution_name VARCHAR(255) NOT NULL DEFAULT 'Bagel Master Group',
    ADD COLUMN IF NOT EXISTS restaurant_name VARCHAR(255) NOT NULL DEFAULT 'Bagel Master Cafe',
    ADD COLUMN IF NOT EXISTS manual_override_enabled SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS manual_is_active SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS schedule_enabled SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS schedule_start_time TIME,
    ADD COLUMN IF NOT EXISTS schedule_end_time TIME,
    ADD COLUMN IF NOT EXISTS weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS special_dates JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS timezone_name VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    ADD COLUMN IF NOT EXISTS address VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `;

  await db.query(createTableQuery);
  await db.query(alterTableQuery);
};

const normalizeWeeklySchedule = (value) => {
  if (!value) {
    return DEFAULT_WEEKLY_SCHEDULE;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return DEFAULT_WEEKLY_SCHEDULE;
    }
  }

  if (typeof value === "object" && Object.keys(value).length > 0) {
    return value;
  }

  return DEFAULT_WEEKLY_SCHEDULE;
};

const normalizeJsonObject = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  return typeof value === "object" && !Array.isArray(value) ? value : {};
};

const normalizeRow = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    manual_override_enabled: Number(row.manual_override_enabled),
    manual_is_active: Number(row.manual_is_active),
    schedule_enabled: Number(row.schedule_enabled),
    weekly_schedule: normalizeWeeklySchedule(row.weekly_schedule),
    special_dates: normalizeJsonObject(row.special_dates),
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
  };
};

const defaultSettings = (adminId) => ({
  admin_id: adminId,
  institution_name: "Bagel Master Group",
  restaurant_name: "Bagel Master Cafe",
  manual_override_enabled: 0,
  manual_is_active: 1,
  schedule_enabled: 1,
  schedule_start_time: null,
  schedule_end_time: null,
  weekly_schedule: DEFAULT_WEEKLY_SCHEDULE,
  special_dates: {},
  timezone_name: "Asia/Kolkata",
  address: "",
  latitude: null,
  longitude: null,
  created_at: null,
  updated_at: null,
});

const restaurantSettingsModel = {
  ensureRestaurantSettingsTable,

  getByAdminId: async (adminId) => {
    const query = `
      SELECT *
      FROM restaurant_settings
      WHERE admin_id = $1
      LIMIT 1;
    `;

    const result = await db.query(query, [adminId]);
    const row = result.rows[0];
    return row ? normalizeRow(row) : defaultSettings(adminId);
  },

  upsertByAdminId: async ({
    adminId,
    institutionName,
    restaurantName,
    manualOverrideEnabled,
    manualIsActive,
    scheduleEnabled,
    scheduleStartTime,
    scheduleEndTime,
    weeklySchedule,
    specialDates,
    timezoneName,
    address = "",
    latitude = null,
    longitude = null,
  }) => {
    const query = `
      INSERT INTO restaurant_settings (
        admin_id,
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
        longitude
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (admin_id)
      DO UPDATE SET
        institution_name = EXCLUDED.institution_name,
        restaurant_name = EXCLUDED.restaurant_name,
        manual_override_enabled = EXCLUDED.manual_override_enabled,
        manual_is_active = EXCLUDED.manual_is_active,
        schedule_enabled = EXCLUDED.schedule_enabled,
        schedule_start_time = EXCLUDED.schedule_start_time,
        schedule_end_time = EXCLUDED.schedule_end_time,
        weekly_schedule = EXCLUDED.weekly_schedule,
        special_dates = EXCLUDED.special_dates,
        timezone_name = EXCLUDED.timezone_name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      adminId,
      institutionName,
      restaurantName,
      manualOverrideEnabled,
      manualIsActive,
      scheduleEnabled,
      scheduleStartTime,
      scheduleEndTime,
      JSON.stringify(weeklySchedule || DEFAULT_WEEKLY_SCHEDULE),
      JSON.stringify(specialDates || {}),
      timezoneName,
      address,
      latitude,
      longitude,
    ];

    const result = await db.query(query, values);
    return normalizeRow(result.rows[0] || null);
  },

  updateManualStatus: async (adminId, manualIsActive, manualOverrideEnabled = 1) => {
    const query = `
      INSERT INTO restaurant_settings (
        admin_id,
        manual_override_enabled,
        manual_is_active
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (admin_id)
      DO UPDATE SET
        manual_override_enabled = EXCLUDED.manual_override_enabled,
        manual_is_active = EXCLUDED.manual_is_active,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await db.query(query, [adminId, manualOverrideEnabled, manualIsActive]);
    return normalizeRow(result.rows[0] || null);
  },
};

module.exports = restaurantSettingsModel;




// CREATE TABLE IF NOT EXISTS restaurant_settings (
//   id SERIAL PRIMARY KEY,
//   admin_id INTEGER NOT NULL UNIQUE REFERENCES admin(id) ON DELETE CASCADE,
//   institution_name VARCHAR(255) NOT NULL DEFAULT 'Bagel Master Group',
//   restaurant_name VARCHAR(255) NOT NULL DEFAULT 'Bagel Master Cafe',
//   manual_is_active SMALLINT NOT NULL DEFAULT 1,
//   schedule_enabled SMALLINT NOT NULL DEFAULT 0,
//   schedule_start_time TIME,
//   schedule_end_time TIME,
//   timezone_name VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
//   created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
// );
