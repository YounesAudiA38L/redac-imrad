(function initializeStorage(global) {
  const STORAGE_KEY = "redacImrad.database";
  const STATUT_SUIVI_LABELS = Object.freeze({
    nouveau: "Nouveau",
    "questionnaire-envoye": "Questionnaire envoyé",
    "questionnaire-recu": "Questionnaire reçu",
    "memoire-importe": "Mémoire importé",
    "analyse-en-cours": "Analyse en cours",
    "retour-envoye": "Retour envoyé",
    "a-relancer": "À relancer",
    termine: "Terminé",
    archive: "Archivé",
  });
  const PROSPECT_STATUSES = new Set(["nouveau", "a-relancer", "interesse", "non-interesse", "transforme", "archive"]);
  const QUESTIONNAIRE_STATUSES = new Set(["a-envoyer", "envoye", "repondu"]);

  function createEmptyProspectResponse() {
    return {
      responseId: "",
      receivedAt: "",
      email: "",
      nomComplet: "",
      prenom: "",
      nom: "",
      telephone: "",
      ifmk: "",
      annee: "",
      niveau: "",
      avancementMemoire: "",
      difficultePrincipale: "",
      prochaineEcheance: "",
      niveauBlocage: "",
      niveauUrgence: "",
      aideSouhaitee: "",
      situationLibre: "",
      questionAudrey: "",
      cadreAccepte: false,
      redactionNonRemplacee: false,
      rawResponse: {},
    };
  }

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
    const legacyStatus = String(prospect?.statut || "").trim().toLocaleLowerCase("fr-FR");
    const inferredProspectStatus = prospect?.convertedStudentId
      ? "transforme"
      : legacyStatus === "converti en étudiant" ? "transforme"
        : legacyStatus === "archivé" ? "archive"
          : legacyStatus === "à relancer" ? "a-relancer"
            : "nouveau";
    const statutProspect = PROSPECT_STATUSES.has(prospect?.statutProspect) ? prospect.statutProspect : inferredProspectStatus;
    const inferredQuestionnaireStatus = prospect?.questionnaireRepondu === true
      ? "repondu"
      : prospect?.questionnaireEnvoye === true ? "envoye" : "a-envoyer";
    const questionnaireStatut = QUESTIONNAIRE_STATUSES.has(prospect?.questionnaireStatut)
      ? prospect.questionnaireStatut
      : inferredQuestionnaireStatus;
    const questionnaireRepondu = questionnaireStatut === "repondu" || prospect?.questionnaireRepondu === true;
    const questionnaireEnvoye = questionnaireRepondu || questionnaireStatut === "envoye" || prospect?.questionnaireEnvoye === true;
    const response = prospect?.reponseQuestionnaireProspect && typeof prospect.reponseQuestionnaireProspect === "object"
      ? prospect.reponseQuestionnaireProspect
      : {};
    return {
      ...prospect,
      prenom: prospect?.prenom || "",
      nom: prospect?.nom || "",
      pseudo: prospect?.pseudo || "",
      email: prospect?.email || "",
      telephone: prospect?.telephone || "",
      ifmk: prospect?.ifmk || "",
      niveau: prospect?.niveau || "",
      source: prospect?.source || "",
      dateContact: prospect?.dateContact || "",
      parcoursInteresse: prospect?.parcoursInteresse || "non défini",
      parcoursPressenti: prospect?.parcoursPressenti || "",
      parcoursValide: prospect?.parcoursValide || "",
      messageInitial: prospect?.messageInitial || "",
      statutProspect,
      questionnaireStatut,
      questionnaireEnvoye,
      questionnaireEnvoyeLe: prospect?.questionnaireEnvoyeLe || "",
      questionnaireRepondu,
      questionnaireReponduLe: prospect?.questionnaireReponduLe || "",
      reponseQuestionnaireProspect: {
        ...createEmptyProspectResponse(),
        ...response,
        cadreAccepte: response.cadreAccepte === true,
        redactionNonRemplacee: response.redactionNonRemplacee === true,
        rawResponse: response.rawResponse && typeof response.rawResponse === "object" ? response.rawResponse : {},
      },
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

  function normalizeStudent(student) {
    const requestedStatus = student?.statutSuivi;
    const statutSuivi = STATUT_SUIVI_LABELS[requestedStatus]
      ? requestedStatus
      : student?.statut === "Archivé" ? "archive" : "nouveau";
    return {
      ...student,
      statutSuivi,
      echeance: student?.echeance || "",
      urgentManuel: student?.urgentManuel === true,
      niveau: student?.niveau || "",
    };
  }

  function getStatutSuiviLabel(value) {
    return STATUT_SUIVI_LABELS[value] || STATUT_SUIVI_LABELS.nouveau;
  }

  function getCalendarDayNumber(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  }

  function getNiveauEcheance(student) {
    const deadlineDay = getCalendarDayNumber(student?.echeance);
    if (deadlineDay === null) return "aucune";
    const today = new Date();
    const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000;
    const remainingDays = deadlineDay - todayDay;
    if (remainingDays < 0) return "depassee";
    if (remainingDays <= 7) return "urgent";
    if (remainingDays <= 15) return "bientot";
    return "aucune";
  }

  function isUrgent(student) {
    const deadlineLevel = getNiveauEcheance(student);
    return student?.urgentManuel === true || deadlineLevel === "urgent" || deadlineLevel === "depassee";
  }

  function getDatabase() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const empty = createEmptyDatabase();

      return {
        students: Array.isArray(stored?.students) ? stored.students.map(normalizeStudent) : empty.students,
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

  function getProspectsSettings() {
    const settings = getDatabase().settings;
    return settings.prospects && typeof settings.prospects === "object" ? settings.prospects : {};
  }

  function updateProspectsSettings(updatedSettings) {
    const database = getDatabase();
    database.settings = {
      ...database.settings,
      prospects: {
        ...(database.settings.prospects || {}),
        ...updatedSettings,
      },
    };
    saveDatabase(database);
    return database.settings.prospects;
  }

  function getProspectsFormUrl() {
    return getProspectsSettings().formUrl || "";
  }

  function saveProspectsFormUrl(url) {
    return updateProspectsSettings({ formUrl: String(url || "").trim() }).formUrl;
  }

  function getProspectsMailEndpoint() {
    return getProspectsSettings().mailEndpoint || "";
  }

  function saveProspectsMailEndpoint(url) {
    return updateProspectsSettings({ mailEndpoint: String(url || "").trim() }).mailEndpoint;
  }

  function getProspectsMailToken() {
    return getProspectsSettings().mailToken || "";
  }

  function saveProspectsMailToken(token) {
    return updateProspectsSettings({ mailToken: String(token || "").trim() }).mailToken;
  }

  function getProspectsResponsesEndpoint() {
    return getProspectsSettings().responsesEndpoint || "";
  }

  function saveProspectsResponsesEndpoint(url) {
    return updateProspectsSettings({ responsesEndpoint: String(url || "").trim() }).responsesEndpoint;
  }

  function getProspectsResponsesToken() {
    return getProspectsSettings().responsesToken || "";
  }

  function saveProspectsResponsesToken(token) {
    return updateProspectsSettings({ responsesToken: String(token || "").trim() }).responsesToken;
  }

  function getProspectsMailTemplates() {
    const templates = getProspectsSettings().mailTemplates;
    return templates && typeof templates === "object" ? templates : {};
  }

  function saveProspectsMailTemplate(type, template) {
    if (!["questionnaire", "relance"].includes(type)) return getProspectsMailTemplates();
    const currentTemplates = getProspectsMailTemplates();
    return updateProspectsSettings({
      mailTemplates: {
        ...currentTemplates,
        [type]: {
          objet: String(template?.objet || ""),
          corps: String(template?.corps || ""),
        },
      },
    }).mailTemplates;
  }

  function createStudent(studentData) {
    const database = getDatabase();
    const now = new Date().toISOString();
    const archiveRequested = studentData.statutSuivi === "archive" || studentData.statut === "Archivé";
    const statutSuivi = archiveRequested
      ? "archive"
      : STATUT_SUIVI_LABELS[studentData.statutSuivi] ? studentData.statutSuivi : "nouveau";
    const student = {
      id: global.crypto?.randomUUID?.() || `student-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      prenom: studentData.prenom || "",
      nom: studentData.nom || "",
      email: studentData.email || "",
      ifmk: studentData.ifmk || "",
      telephone: studentData.telephone || "",
      niveau: studentData.niveau || "",
      dateDebut: studentData.dateDebut || "",
      parcours: studentData.parcours || "",
      thematiqueMemoire: studentData.thematiqueMemoire || "",
      statut: archiveRequested ? "Archivé" : studentData.statut || "En cours",
      statutSuivi,
      echeance: studentData.echeance || "",
      urgentManuel: studentData.urgentManuel === true,
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
      pseudo: prospectData.pseudo || "",
      email: prospectData.email || "",
      telephone: prospectData.telephone || "",
      ifmk: prospectData.ifmk || "",
      niveau: prospectData.niveau || "",
      source: prospectData.source || "",
      dateContact: prospectData.dateContact || new Date().toISOString().slice(0, 10),
      parcoursInteresse: prospectData.parcoursInteresse || "non défini",
      parcoursPressenti: prospectData.parcoursPressenti || "",
      parcoursValide: prospectData.parcoursValide || "",
      messageInitial: prospectData.messageInitial || "",
      questionnaireUrl: prospectData.questionnaireUrl || "",
      questionnaireEnvoye: prospectData.questionnaireEnvoye === true,
      questionnaireEnvoyeLe: prospectData.questionnaireEnvoyeLe || "",
      questionnaireRepondu: prospectData.questionnaireRepondu === true,
      questionnaireReponduLe: prospectData.questionnaireReponduLe || "",
      statutProspect: prospectData.statutProspect || "nouveau",
      questionnaireStatut: prospectData.questionnaireStatut || "a-envoyer",
      reponseQuestionnaireProspect: prospectData.reponseQuestionnaireProspect || createEmptyProspectResponse(),
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
    database.prospects[index] = normalizeProspect({
      ...database.prospects[index],
      ...updatedData,
      id,
      dateCreation: database.prospects[index].dateCreation,
      dateModification: new Date().toISOString(),
    });
    saveDatabase(database);
    return database.prospects[index];
  }

  function getFirstFilledValue(...values) {
    const value = values.find((item) => String(item || "").trim());
    return value === undefined ? "" : String(value).trim();
  }

  function extractProspectFirstName(fullName) {
    return String(fullName || "").trim().split(/\s+/).filter(Boolean)[0] || "";
  }

  function extractProspectLastName(fullName) {
    return String(fullName || "").trim().split(/\s+/).filter(Boolean).slice(1).join(" ");
  }

  function normalizeStudentParcours(value) {
    const normalized = String(value || "").trim().toLocaleLowerCase("fr-FR");
    if (["point-memoire", "point mémoire", "point memoire"].includes(normalized)) return "point-memoire";
    if (["k4", "k5", "rattrapage"].includes(normalized)) return normalized;
    return "";
  }

  function buildProspectConversionNotes(prospect, response) {
    const valueOrFallback = (value) => String(value || "").trim() || "Non renseigné";
    const summary = [
      "Prospect converti depuis l’onglet Prospects.",
      "",
      `Niveau : ${valueOrFallback(prospect.niveau || response.niveau)}`,
      `IFMK : ${valueOrFallback(prospect.ifmk || response.ifmk)}`,
      `Téléphone : ${valueOrFallback(prospect.telephone || response.telephone)}`,
      `Avancement mémoire : ${valueOrFallback(response.avancementMemoire)}`,
      `Difficulté principale : ${valueOrFallback(response.difficultePrincipale)}`,
      `Prochaine échéance : ${valueOrFallback(response.prochaineEcheance)}`,
      `Niveau de blocage : ${valueOrFallback(response.niveauBlocage)}`,
      `Urgence : ${valueOrFallback(response.niveauUrgence)}`,
      `Aide souhaitée : ${valueOrFallback(response.aideSouhaitee)}`,
      "",
      "Situation décrite :",
      valueOrFallback(response.situationLibre),
      "",
      "Question pour Audrey :",
      valueOrFallback(response.questionAudrey),
    ];
    const firstContactNotes = [prospect.messageInitial, prospect.notes].filter((value) => String(value || "").trim());
    if (firstContactNotes.length) summary.push("", "Notes du premier contact :", firstContactNotes.join("\n\n"));
    return summary.join("\n");
  }

  function convertProspectToStudent(id, studentData = {}) {
    const prospect = getProspectById(id);
    if (!prospect) return null;
    const existingStudentId = prospect.studentId || prospect.convertedStudentId;
    if (existingStudentId) return getStudentById(existingStudentId);

    const response = prospect.reponseQuestionnaireProspect || createEmptyProspectResponse();
    const parcours = normalizeStudentParcours(studentData.parcours)
      || normalizeStudentParcours(prospect.parcoursValide)
      || normalizeStudentParcours(prospect.parcoursPressenti)
      || normalizeStudentParcours(prospect.parcoursVise);
    if (!parcours) return null;

    const prenom = getFirstFilledValue(
      studentData.prenom,
      prospect.prenom,
      response.prenom,
      extractProspectFirstName(response.nomComplet),
      prospect.pseudo,
    );
    const nom = getFirstFilledValue(
      studentData.nom,
      prospect.nom,
      response.nom,
      extractProspectLastName(response.nomComplet),
    );
    const email = getFirstFilledValue(studentData.email, prospect.email, response.email);
    const telephone = getFirstFilledValue(studentData.telephone, prospect.telephone, response.telephone);
    const ifmk = getFirstFilledValue(studentData.ifmk, prospect.ifmk, response.ifmk);
    const niveau = getFirstFilledValue(studentData.niveau, prospect.niveau, response.niveau, response.annee);
    const notesInitiales = studentData.notesInitiales || buildProspectConversionNotes(prospect, response);
    const student = createStudent({
      ...studentData,
      prenom,
      nom,
      email,
      telephone,
      ifmk,
      niveau,
      dateDebut: new Date().toISOString().slice(0, 10),
      parcours,
      statut: "En cours",
      statutSuivi: "nouveau",
      urgentManuel: false,
      thematiqueMemoire: studentData.thematiqueMemoire
        || prospect.thematiqueMemoire
        || response.situationLibre
        || response.avancementMemoire
        || "",
      notesInitiales,
      donneesParcours: {
        questionnaireProspect: response,
        ...(studentData.donneesParcours || {}),
      },
    });
    updateProspect(id, {
      statut: "converti en étudiant",
      statutProspect: "transforme",
      studentId: student.id,
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

    const archiveRequested = updatedData.statutSuivi === "archive" || updatedData.statut === "Archivé";
    database.students[index] = normalizeStudent({
      ...database.students[index],
      ...updatedData,
      ...(archiveRequested ? { statut: "Archivé", statutSuivi: "archive" } : {}),
      id,
      dateCreation: database.students[index].dateCreation,
      dateModification: new Date().toISOString(),
    });
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
    return updateStudent(id, { statut: "Archivé", statutSuivi: "archive" });
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
    getStatutSuiviLabel,
    getNiveauEcheance,
    isUrgent,
    getProspectsFormUrl,
    saveProspectsFormUrl,
    getProspectsMailEndpoint,
    saveProspectsMailEndpoint,
    getProspectsMailToken,
    saveProspectsMailToken,
    getProspectsResponsesEndpoint,
    saveProspectsResponsesEndpoint,
    getProspectsResponsesToken,
    saveProspectsResponsesToken,
    getProspectsMailTemplates,
    saveProspectsMailTemplate,
  });
})(window);
