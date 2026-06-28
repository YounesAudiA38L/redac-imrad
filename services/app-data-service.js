(function initializeAppDataService(global) {
  const students = global.RedacServices.students;
  const prospects = global.RedacServices.prospects;
  const settings = global.RedacServices.settings;

  global.RedacServices = Object.freeze({
    ...(global.RedacServices || {}),
    appData: Object.freeze({
      ...students,
      ...prospects,
      ...settings,
    }),
  });
})(window);
