(function initializeProspectService(global) {
  const prospects = global.RedacRepositories.prospects;

  const service = Object.freeze({
    createProspect: prospects.create,
    updateProspect: prospects.update,
    archiveProspect: prospects.archive,
    restoreProspect: prospects.restore,
    deleteProspect: prospects.delete,
    convertProspectToStudent: prospects.convertToStudent,
    getProspectById: prospects.findById,
    getProspects: prospects.findAll,
    getActiveProspects: prospects.findActive,
    getArchivedProspects: prospects.findArchived,
  });

  global.RedacServices = Object.freeze({
    ...(global.RedacServices || {}),
    prospects: service,
  });
})(window);
