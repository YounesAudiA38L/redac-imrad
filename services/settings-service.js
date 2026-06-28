(function initializeSettingsService(global) {
  const settings = global.RedacRepositories.settings;

  const service = Object.freeze({
    getDatabase: settings.getDatabase,
    saveDatabase: settings.saveDatabase,
    getEffectiveSettings: settings.getEffectiveSettings,
    getProspectsFormUrl: settings.getProspectsFormUrl,
    saveProspectsFormUrl: settings.saveProspectsFormUrl,
    getProspectsMailEndpoint: settings.getProspectsMailEndpoint,
    saveProspectsMailEndpoint: settings.saveProspectsMailEndpoint,
    getProspectsMailToken: settings.getProspectsMailToken,
    saveProspectsMailToken: settings.saveProspectsMailToken,
    getProspectsResponsesEndpoint: settings.getProspectsResponsesEndpoint,
    saveProspectsResponsesEndpoint: settings.saveProspectsResponsesEndpoint,
    getProspectsResponsesToken: settings.getProspectsResponsesToken,
    saveProspectsResponsesToken: settings.saveProspectsResponsesToken,
    getProspectsMailTemplates: settings.getProspectsMailTemplates,
    saveProspectsMailTemplate: settings.saveProspectsMailTemplate,
    getFormsStatsLinks: settings.getFormsStatsLinks,
    saveFormsStatsLinks: settings.saveFormsStatsLinks,
    getRattrapageSettings: settings.getRattrapageSettings,
    saveRattrapageSettings: settings.saveRattrapageSettings,
  });

  global.RedacServices = Object.freeze({
    ...(global.RedacServices || {}),
    settings: service,
  });
})(window);
