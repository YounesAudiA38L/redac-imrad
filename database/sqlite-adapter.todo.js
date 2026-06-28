(function initializeSqliteAdapterPlaceholder(global) {
  global.RedacDatabaseAdapters = Object.freeze({
    ...(global.RedacDatabaseAdapters || {}),
    sqlite: Object.freeze({
      status: "todo",
      note: "Future migration: replace localStorageDatabase with a SQLite-backed adapter exposing the same repository contract.",
    }),
  });
})(window);
