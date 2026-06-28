(function initializeSettingsRepository(global) {
  const database = global.RedacDatabase?.current || global.RedacStorage;

  const repository = Object.freeze({
    getDatabase: () => database.getDatabase(),
    saveDatabase: (data) => database.saveDatabase(data),
    getEffectiveSettings: () => database.getEffectiveSettings(),
    getProspectsFormUrl: () => database.getProspectsFormUrl(),
    saveProspectsFormUrl: (url) => database.saveProspectsFormUrl(url),
    getProspectsMailEndpoint: () => database.getProspectsMailEndpoint(),
    saveProspectsMailEndpoint: (endpoint) => database.saveProspectsMailEndpoint(endpoint),
    getProspectsMailToken: () => database.getProspectsMailToken(),
    saveProspectsMailToken: (token) => database.saveProspectsMailToken(token),
    getProspectsResponsesEndpoint: () => database.getProspectsResponsesEndpoint(),
    saveProspectsResponsesEndpoint: (endpoint) => database.saveProspectsResponsesEndpoint(endpoint),
    getProspectsResponsesToken: () => database.getProspectsResponsesToken(),
    saveProspectsResponsesToken: (token) => database.saveProspectsResponsesToken(token),
    getProspectsMailTemplates: () => database.getProspectsMailTemplates(),
    saveProspectsMailTemplate: (type, template) => database.saveProspectsMailTemplate(type, template),
    getFormsStatsLinks: () => database.getFormsStatsLinks(),
    saveFormsStatsLinks: (links) => database.saveFormsStatsLinks(links),
  });

  global.RedacRepositories = Object.freeze({
    ...(global.RedacRepositories || {}),
    settings: repository,
  });
})(window);
