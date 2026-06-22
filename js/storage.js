(function initializeStorage(global) {
  const STORAGE_KEY = "redacImrad.database";

  function createEmptyDatabase() {
    return {
      students: [],
      settings: {},
      notifications: [],
      reports: [],
    };
  }

  function getDatabase() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const empty = createEmptyDatabase();

      return {
        students: Array.isArray(stored?.students) ? stored.students : empty.students,
        settings: stored?.settings && typeof stored.settings === "object" ? stored.settings : empty.settings,
        notifications: Array.isArray(stored?.notifications) ? stored.notifications : empty.notifications,
        reports: Array.isArray(stored?.reports) ? stored.reports : empty.reports,
      };
    } catch {
      return createEmptyDatabase();
    }
  }

  function saveDatabase(database) {
    const normalized = {
      students: Array.isArray(database.students) ? database.students : [],
      settings: database.settings && typeof database.settings === "object" ? database.settings : {},
      notifications: Array.isArray(database.notifications) ? database.notifications : [],
      reports: Array.isArray(database.reports) ? database.reports : [],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function createStudent(studentData) {
    const database = getDatabase();
    const now = new Date().toISOString();
    const student = {
      id: global.crypto?.randomUUID?.() || `student-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      prenom: studentData.prenom || "",
      nom: studentData.nom || "",
      email: studentData.email || "",
      ifmk: studentData.ifmk || "",
      telephone: studentData.telephone || "",
      dateDebut: studentData.dateDebut || "",
      parcours: studentData.parcours || "",
      thematiqueMemoire: studentData.thematiqueMemoire || "",
      statut: studentData.statut || "En cours",
      notesInitiales: studentData.notesInitiales || "",
      dateCreation: now,
      dateModification: now,
      donneesParcours: studentData.donneesParcours || {},
      memoireImporte: studentData.memoireImporte || null,
      livrablesK4: studentData.livrablesK4 || null,
      pointMemoireResume: studentData.pointMemoireResume || null,
    };

    database.students.push(student);
    saveDatabase(database);
    return student;
  }

  function getStudentById(id) {
    return getDatabase().students.find((student) => student.id === id) || null;
  }

  function updateStudent(id, updatedData) {
    const database = getDatabase();
    const index = database.students.findIndex((student) => student.id === id);

    if (index === -1) {
      return null;
    }

    database.students[index] = {
      ...database.students[index],
      ...updatedData,
      id,
      dateCreation: database.students[index].dateCreation,
      dateModification: new Date().toISOString(),
    };
    saveDatabase(database);
    return database.students[index];
  }

  function deleteStudent(id) {
    const database = getDatabase();
    const initialLength = database.students.length;
    database.students = database.students.filter((student) => student.id !== id);

    if (database.students.length === initialLength) {
      return false;
    }

    saveDatabase(database);
    return true;
  }

  function archiveStudent(id) {
    return updateStudent(id, { statut: "Archivé" });
  }

  function getStudentsByParcours(parcours) {
    return getDatabase().students.filter((student) => student.parcours === parcours);
  }

  function getActiveStudents() {
    return getDatabase().students.filter((student) => student.statut !== "Archivé");
  }

  function getArchivedStudents() {
    return getDatabase().students.filter((student) => student.statut === "Archivé");
  }

  global.RedacStorage = Object.freeze({
    getDatabase,
    saveDatabase,
    createStudent,
    getStudentById,
    updateStudent,
    deleteStudent,
    archiveStudent,
    getStudentsByParcours,
    getActiveStudents,
    getArchivedStudents,
  });
})(window);
