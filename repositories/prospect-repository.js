(function initializeProspectRepository(global) {
  const database = global.RedacDatabase?.current || global.RedacStorage;

  const repository = Object.freeze({
    create: (prospectData) => database.createProspect(prospectData),
    update: (id, prospectData) => database.updateProspect(id, prospectData),
    archive: (id) => database.archiveProspect(id),
    restore: (id) => database.restoreProspect(id),
    delete: (id) => database.deleteProspect(id),
    convertToStudent: (id, studentData) => database.convertProspectToStudent(id, studentData),
    findById: (id) => database.getProspectById(id),
    findAll: () => database.getProspects(),
    findActive: () => database.getActiveProspects(),
    findArchived: () => database.getArchivedProspects(),
  });

  global.RedacRepositories = Object.freeze({
    ...(global.RedacRepositories || {}),
    prospects: repository,
  });
})(window);
