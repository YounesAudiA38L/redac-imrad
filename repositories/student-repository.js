(function initializeStudentRepository(global) {
  const database = global.RedacDatabase?.current || global.RedacStorage;

  const repository = Object.freeze({
    create: (studentData) => database.createStudent(studentData),
    update: (id, studentData) => database.updateStudent(id, studentData),
    delete: (id) => database.deleteStudent(id),
    archive: (id) => database.archiveStudent(id),
    restore: (id) => database.restoreStudent(id),
    findById: (id) => database.getStudentById(id),
    findActive: () => database.getActiveStudents(),
    findArchived: () => database.getArchivedStudents(),
    findByParcours: (parcours) => database.getStudentsByParcours(parcours),
    findArchivedByParcours: (parcours) => database.getArchivedStudentsByParcours(parcours),
    getStatusLabel: (status) => database.getStatutSuiviLabel(status),
    getDeadlineLevel: (student) => database.getNiveauEcheance(student),
    isUrgent: (student) => database.isUrgent(student),
  });

  global.RedacRepositories = Object.freeze({
    ...(global.RedacRepositories || {}),
    students: repository,
  });
})(window);
