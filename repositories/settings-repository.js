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
    getRattrapageSettings: () => database.getRattrapageSettings
      ? database.getRattrapageSettings()
      : database.getEffectiveSettings().rattrapage,
    saveRattrapageSettings: (settings) => {
      if (database.saveRattrapageSettings) return database.saveRattrapageSettings(settings);
      const currentDatabase = database.getDatabase();
      const endpointRattrapage = String(settings?.endpointRattrapage || settings?.responsesAppsScriptUrl || "").trim();
      const tokenRattrapage = String(settings?.tokenRattrapage || settings?.token || "").trim();
      const current = currentDatabase.settings?.rattrapage || {};
      const valueOrCurrent = (key) => Object.prototype.hasOwnProperty.call(settings || {}, key)
        ? String(settings?.[key] || "").trim()
        : String(current[key] || "").trim();
      currentDatabase.settings = {
        ...(currentDatabase.settings || {}),
        rattrapage: {
          ...current,
          lienFormsEntreeRattrapage: valueOrCurrent("lienFormsEntreeRattrapage"),
          sheetIdEntreeRattrapage: valueOrCurrent("sheetIdEntreeRattrapage"),
          lienFormsSuiviRattrapage: valueOrCurrent("lienFormsSuiviRattrapage"),
          sheetIdSuiviRattrapage: valueOrCurrent("sheetIdSuiviRattrapage"),
          templateSyntheseRepriseId: valueOrCurrent("templateSyntheseRepriseId"),
          dossierEtudiantsDriveId: valueOrCurrent("dossierEtudiantsDriveId"),
          endpointRattrapage: endpointRattrapage || current.endpointRattrapage || current.responsesAppsScriptUrl || "",
          tokenRattrapage: tokenRattrapage || current.tokenRattrapage || current.token || "",
          responsesAppsScriptUrl: endpointRattrapage || current.endpointRattrapage || current.responsesAppsScriptUrl || "",
          token: tokenRattrapage || current.tokenRattrapage || current.token || "",
        },
      };
      database.saveDatabase(currentDatabase);
      return currentDatabase.settings.rattrapage;
    },
  });

  global.RedacRepositories = Object.freeze({
    ...(global.RedacRepositories || {}),
    settings: repository,
  });
})(window);
