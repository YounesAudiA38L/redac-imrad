(function initializeDatabaseRegistry(global) {
  global.RedacDatabase = Object.freeze({
    ...(global.RedacDatabase || {}),
    current: global.RedacStorage,
    localStorage: global.RedacStorage,
    adapterName: "localStorage",
  });
})(window);
