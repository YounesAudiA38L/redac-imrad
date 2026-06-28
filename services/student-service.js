(function initializeStudentService(global) {
  const students = global.RedacRepositories.students;

  const service = Object.freeze({
    createStudent: students.create,
    updateStudent: students.update,
    deleteStudent: students.delete,
    archiveStudent: students.archive,
    restoreStudent: students.restore,
    getStudentById: students.findById,
    getActiveStudents: students.findActive,
    getArchivedStudents: students.findArchived,
    getStudentsByParcours: students.findByParcours,
    getArchivedStudentsByParcours: students.findArchivedByParcours,
    getStatutSuiviLabel: students.getStatusLabel,
    getNiveauEcheance: students.getDeadlineLevel,
    isUrgent: students.isUrgent,
  });

  global.RedacServices = Object.freeze({
    ...(global.RedacServices || {}),
    students: service,
  });
})(window);
