const createEmptyCache = () => ({
  categories: { data: null, timestamp: 0 },
  items: {},
  addons: {},
});

const cache = createEmptyCache();
const CACHE_TTL = 5 * 60 * 1000;

const isCacheValid = (entry) =>
  Boolean(entry && entry.data && Date.now() - entry.timestamp < CACHE_TTL);

const setCategoryCache = (data) => {
  cache.categories = {
    data,
    timestamp: Date.now(),
  };
};

const setItemsCache = (key, data) => {
  cache.items[key] = {
    data,
    timestamp: Date.now(),
  };
};

const setAddonsCache = (key, data) => {
  cache.addons[key] = {
    data,
    timestamp: Date.now(),
  };
};

const resetMenuCache = () => {
  cache.categories = { data: null, timestamp: 0 };
  cache.items = {};
  cache.addons = {};
};

module.exports = {
  cache,
  CACHE_TTL,
  isCacheValid,
  resetMenuCache,
  setCategoryCache,
  setItemsCache,
  setAddonsCache,
};
