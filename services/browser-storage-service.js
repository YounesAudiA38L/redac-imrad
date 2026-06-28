(function initializeBrowserStorageService(global) {
  const service = Object.freeze({
    getItem: (key) => global.localStorage.getItem(key),
    setItem: (key, value) => global.localStorage.setItem(key, value),
    removeItem: (key) => global.localStorage.removeItem(key),
    getJson(key, fallback) {
      try {
        const value = global.localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    },
    setJson: (key, value) => global.localStorage.setItem(key, JSON.stringify(value)),
  });

  global.RedacServices = Object.freeze({
    ...(global.RedacServices || {}),
    browserStorage: service,
  });
})(window);
