(function initializeStorage(global) {
  const STORAGE_KEY = "redacImrad.database";

  function createEmptyDatabase() {
    return {
      students: [],
      prospects: [],
      settings: {},
      notifications: [],
      reports: [],
    };
  }

  function normalizeProspect(prospect) {
    return {
      ...prospect,
      prenom: prospect?.prenom || "",
      nom: prospect?.nom || "",
      email: prospect?.email || "",
      telephone: prospect?.telephone || "",
      source: prospect?.source || "",
      dateContact: prospect?.dateContact || "",
      parcoursInteresse: prospect?.parcoursInteresse || "non défini",
      messageInitial: prospect?.messageInitial || "",
      questionnaireEnvoye: prospect?.questionnaireEnvoye === true,
      questionnaireEnvoyeLe: prospect?.questionnaireEnvoyeLe || "",
      questionnaireRepondu: prospect?.questionnaireRepondu === true,
      draftId: prospect?.draftId || "",
      statut: prospect?.statut || "nouveau",
      notes: prospect?.notes || "",
      relanceDraftId: prospect?.relanceDraftId || "",
      relanceCreatedAt: prospect?.relanceCreatedAt || "",
      relanceCount: Number(prospect?.relanceCount) || 0,
      lastRelanceAt: prospect?.lastRelanceAt || "",
      relanceStatus: prospect?.relanceStatus || "",
      dateCreation: prospect?.dateCreation || "",
      dateModification: prospect?.dateModification || "",
    };
  }

  function getDatabase() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const empty = createEmptyDatabase();

      return {
        students: Array.isArray(stored?.students) ? stored.students : empty.students,
        prospects: Array.isArray(stored?.prospects) ? stored.prospects.map(normalizeProspect) : empty.prospects,
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
      prospects: Array.isArray(database.prospects) ? database.prospects : [],
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
      questionnairePreVisioK4: studentData.questionnairePreVisioK4 || (studentData.parcours === "k4" ? {
        formUrl: "",
        sendDraftId: "",
        sendDraftCreatedAt: "",
        sendStatus: "non envoyé",
        responseStatus: "aucune réponse",
        responseId: "",
        receivedAt: "",
        email: "",
        ifmk: "",
        pointDepart: "",
        objectifs: "",
        sujetEnvisage: "",
        questionRecherche: "",
        methodeEnvisagee: "",
        blocages: "",
        documentsDisponibles: "",
        questionsVisio: "",
        attentes: "",
        rawResponse: {},
      } : null),
    };

    database.students.push(student);
    saveDatabase(database);
    return student;
  }

  function getStudentById(id) {
    return getDatabase().students.find((student) => student.id === id) || null;
  }

  function createProspect(prospectData) {
    const database = getDatabase();
    const now = new Date().toISOString();
    const prospect = normalizeProspect({
      id: global.crypto?.randomUUID?.() || `prospect-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      prenom: prospectData.prenom || "",
      nom: prospectData.nom || "",
      email: prospectData.email || "",
      telephone: prospectData.telephone || "",
      source: prospectData.source || "",
      dateContact: prospectData.dateContact || new Date().toISOString().slice(0, 10),
      parcoursInteresse: prospectData.parcoursInteresse || "non défini",
      messageInitial: prospectData.messageInitial || "",
      questionnaireUrl: prospectData.questionnaireUrl || "",
      questionnaireEnvoye: prospectData.questionnaireEnvoye === true,
      questionnaireEnvoyeLe: prospectData.questionnaireEnvoyeLe || "",
      questionnaireRepondu: prospectData.questionnaireRepondu === true,
      draftId: prospectData.draftId || "",
      statut: prospectData.statut || "nouveau",
      notes: prospectData.notes || "",
      relanceDraftId: prospectData.relanceDraftId,
      relanceCreatedAt: prospectData.relanceCreatedAt,
      relanceCount: prospectData.relanceCount,
      lastRelanceAt: prospectData.lastRelanceAt,
      relanceStatus: prospectData.relanceStatus,
      dateCreation: now,
      dateModification: now,
    });
    database.prospects.push(prospect);
    saveDatabase(database);
    return prospect;
  }

  function getProspects() {
    return getDatabase().prospects;
  }

  function getProspectById(id) {
    return getDatabase().prospects.find((prospect) => prospect.id === id) || null;
  }

  function updateProspect(id, updatedData) {
    const database = getDatabase();
    const index = database.prospects.findIndex((prospect) => prospect.id === id);
    if (index === -1) return null;
    database.prospects[index] = {
      ...database.prospects[index],
      ...updatedData,
      id,
      dateCreation: database.prospects[index].dateCreation,
      dateModification: new Date().toISOString(),
    };
    saveDatabase(database);
    return database.prospects[index];
  }

  function convertProspectToStudent(id, studentData = {}) {
    const prospect = getProspectById(id);
    if (!prospect) return null;
    if (prospect.convertedStudentId) return getStudentById(prospect.convertedStudentId);

    const defaultNotes = [prospect.messageInitial, prospect.notes].filter(Boolean).join("\n\n");
    const student = createStudent({
      prenom: prospect.prenom,
      nom: prospect.nom,
      email: prospect.email,
      telephone: prospect.telephone,
      dateDebut: new Date().toISOString().slice(0, 10),
      parcours: ["point-memoire", "k4", "k5", "rattrapage"].includes(prospect.parcoursInteresse) ? prospect.parcoursInteresse : "",
      statut: "En cours",
      notesInitiales: defaultNotes,
      ...studentData,
    });
    updateProspect(id, {
      statut: "converti en étudiant",
      convertedStudentId: student.id,
      dateConversion: new Date().toISOString(),
    });
    return student;
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
    createProspect,
    getProspects,
    getProspectById,
    updateProspect,
    convertProspectToStudent,
    getStudentById,
    updateStudent,
    deleteStudent,
    archiveStudent,
    getStudentsByParcours,
    getActiveStudents,
    getArchivedStudents,
  });
})(window);
