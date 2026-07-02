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
  const PROSPECT_STATUSES = new Set(["nouveau", "a-relancer", "interesse", "non-interesse", "en-reflexion", "transforme", "archive"]);
  const QUESTIONNAIRE_STATUSES = new Set(["a-envoyer", "envoye", "repondu"]);
  const STUDENT_PARCOURS = new Set(["point-memoire", "k4", "k5", "rattrapage"]);
  const AI_FIELD_LABELS = Object.freeze({
    titreMemoire: "Titre du mémoire",
    typeDocument: "Type de document",
    typeMemoire: "Type de mémoire",
    questionRecherche: "Question de recherche",
    population: "Population étudiée",
    interventionExposition: "Intervention ou exposition",
    comparateur: "Comparateur",
    criteresJugement: "Critères de jugement",
    indicateurs: "Indicateurs",
    pico: "PICO",
    criteresInclusion: "Critères d’inclusion",
    criteresExclusion: "Critères d’exclusion",
    methode: "Méthode",
    basesDonnees: "Bases de données",
    motsCles: "Mots-clés",
    resultatsPrincipaux: "Résultats principaux",
    limites: "Limites",
    pointsAVerifier: "Points à vérifier par Audrey",
  });

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
      aiLearningRules: [],
    };
  }

  function normalizeAiLearningRule(rule) {
    const now = new Date().toISOString();
    return {
      id: rule?.id || `rule_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      champ: String(rule?.champ || "").trim(),
      erreurIA: String(rule?.erreurIA || "").trim(),
      correctionAudrey: String(rule?.correctionAudrey || "").trim(),
      regle: String(rule?.regle || "").trim(),
      sourceStudentId: String(rule?.sourceStudentId || "").trim(),
      sourceMemoireTitre: String(rule?.sourceMemoireTitre || "").trim(),
      createdAt: rule?.createdAt || now,
      updatedAt: rule?.updatedAt || rule?.createdAt || now,
      usedCount: Number(rule?.usedCount) || 0,
      active: rule?.active !== false,
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
      relanceEnvoyee: prospect?.relanceEnvoyee === true
        || Boolean(prospect?.relanceDraftId || prospect?.relanceCreatedAt || prospect?.relanceStatus === "brouillon créé"),
      relanceEnvoyeeLe: prospect?.relanceEnvoyeeLe || prospect?.relanceCreatedAt || prospect?.lastRelanceAt || "",
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
      parcours: normalizeStudentParcours(student?.parcours),
      statutSuivi,
      echeance: student?.echeance || "",
      urgentManuel: student?.urgentManuel === true,
      niveau: student?.niveau || "",
    };
  }

  function isArchivedStudent(student) {
    return student?.statut === "Archivé" || student?.statutSuivi === "archive";
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
        aiLearningRules: Array.isArray(stored?.aiLearningRules) ? stored.aiLearningRules.map(normalizeAiLearningRule) : empty.aiLearningRules,
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
      aiLearningRules: Array.isArray(database.aiLearningRules) ? database.aiLearningRules.map(normalizeAiLearningRule) : [],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function getPrivateConfig() {
    const config = global.REDAC_IMRAD_PRIVATE_CONFIG;
    return config && typeof config === "object" ? config : {};
  }

  function readLocalStorage(key) {
    return String(localStorage.getItem(key) || "").trim();
  }

  function localOrPrivate(localValue, privateValue) {
    return String(localValue || "").trim() || String(privateValue || "").trim();
  }

  function getEffectiveSettings() {
    const database = getDatabase();
    const settings = database.settings || {};
    const privateConfig = getPrivateConfig();
    const prospectSettings = settings.prospects || {};
    const statsLinks = settings.formsStatsLinks || {};
    const agendaConfig = privateConfig.agenda || {};
    const prospectsConfig = privateConfig.prospects || {};
    const pointMemoireConfig = privateConfig.pointMemoire || {};
    const k4Config = privateConfig.k4 || {};
    const k5Config = privateConfig.k5 || {};
    const rattrapageConfig = privateConfig.rattrapage || {};
    const rattrapageSettings = settings.rattrapage || {};

    return {
      agenda: {
        iframeUrl: localOrPrivate(settings.googleAgendaEmbedUrl, agendaConfig.iframeUrl),
        appsScriptUrl: localOrPrivate(readLocalStorage("redacImrad.calendar.endpoint"), agendaConfig.appsScriptUrl),
        token: localOrPrivate(readLocalStorage("redacImrad.calendar.token"), agendaConfig.token),
      },
      prospects: {
        formsPublicUrl: localOrPrivate(prospectSettings.formUrl, prospectsConfig.formsPublicUrl),
        formsStatsUrl: localOrPrivate(statsLinks.prospects, prospectsConfig.formsStatsUrl),
        responsesAppsScriptUrl: localOrPrivate(
          prospectSettings.responsesEndpoint || readLocalStorage("redacImrad.prospects.questionnaireResponses.endpoint"),
          prospectsConfig.responsesAppsScriptUrl,
        ),
        mailsAppsScriptUrl: localOrPrivate(
          prospectSettings.mailEndpoint || readLocalStorage("redacImrad.prospects.questionnaireSend.endpoint"),
          prospectsConfig.mailsAppsScriptUrl,
        ),
        tokenResponses: localOrPrivate(
          prospectSettings.responsesToken || readLocalStorage("redacImrad.prospects.questionnaireResponses.token"),
          prospectsConfig.tokenResponses,
        ),
        tokenMails: localOrPrivate(
          prospectSettings.mailToken || readLocalStorage("redacImrad.prospects.questionnaireSend.token"),
          prospectsConfig.tokenMails,
        ),
      },
      pointMemoire: {
        formsStatsUrl: localOrPrivate(statsLinks.pointMemoire, pointMemoireConfig.formsStatsUrl),
        appsScriptUrl: localOrPrivate(readLocalStorage("redacImrad.pointMemoireResume.endpoint"), pointMemoireConfig.appsScriptUrl),
        token: localOrPrivate(readLocalStorage("redacImrad.pointMemoireResume.token"), pointMemoireConfig.token),
      },
      k4: {
        formsStatsUrl: localOrPrivate(statsLinks.k4, k4Config.formsStatsUrl),
        responsesAppsScriptUrl: localOrPrivate(readLocalStorage("redacImrad.k4Questionnaire.responsesUrl"), k4Config.responsesAppsScriptUrl),
        token: localOrPrivate(readLocalStorage("redacImrad.k4Questionnaire.responsesToken"), k4Config.token),
      },
      k5: {
        formsStatsUrl: localOrPrivate(statsLinks.k5, k5Config.formsStatsUrl),
        responsesAppsScriptUrl: localOrPrivate(readLocalStorage("redacImrad.k5Questionnaire.responsesUrl"), k5Config.responsesAppsScriptUrl),
        token: localOrPrivate(readLocalStorage("redacImrad.k5Questionnaire.responsesToken"), k5Config.token),
      },
      rattrapage: {
        formsStatsUrl: localOrPrivate(statsLinks.rattrapage, rattrapageConfig.formsStatsUrl),
        responsesAppsScriptUrl: localOrPrivate(
          rattrapageSettings.endpointRattrapage || rattrapageSettings.responsesAppsScriptUrl || readLocalStorage("redacImrad.rattrapageQuestionnaire.responsesUrl"),
          rattrapageConfig.responsesAppsScriptUrl,
        ),
        token: localOrPrivate(
          rattrapageSettings.tokenRattrapage || rattrapageSettings.token || readLocalStorage("redacImrad.rattrapageQuestionnaire.responsesToken"),
          rattrapageConfig.token,
        ),
        endpointRattrapage: localOrPrivate(
          rattrapageSettings.endpointRattrapage || rattrapageSettings.responsesAppsScriptUrl || readLocalStorage("redacImrad.rattrapageQuestionnaire.responsesUrl"),
          rattrapageConfig.endpointRattrapage || rattrapageConfig.responsesAppsScriptUrl,
        ),
        tokenRattrapage: localOrPrivate(
          rattrapageSettings.tokenRattrapage || rattrapageSettings.token || readLocalStorage("redacImrad.rattrapageQuestionnaire.responsesToken"),
          rattrapageConfig.tokenRattrapage || rattrapageConfig.token,
        ),
        lienFormsEntreeRattrapage: localOrPrivate(rattrapageSettings.lienFormsEntreeRattrapage, rattrapageConfig.lienFormsEntreeRattrapage),
        sheetIdEntreeRattrapage: localOrPrivate(rattrapageSettings.sheetIdEntreeRattrapage, rattrapageConfig.sheetIdEntreeRattrapage),
        lienFormsSuiviRattrapage: localOrPrivate(rattrapageSettings.lienFormsSuiviRattrapage, rattrapageConfig.lienFormsSuiviRattrapage),
        sheetIdSuiviRattrapage: localOrPrivate(rattrapageSettings.sheetIdSuiviRattrapage, rattrapageConfig.sheetIdSuiviRattrapage),
        templateSyntheseRepriseId: localOrPrivate(rattrapageSettings.templateSyntheseRepriseId, rattrapageConfig.templateSyntheseRepriseId),
        dossierEtudiantsDriveId: localOrPrivate(rattrapageSettings.dossierEtudiantsDriveId, rattrapageConfig.dossierEtudiantsDriveId),
      },
    };
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

  function getFormsStatsLinks() {
    const effective = getEffectiveSettings();
    return {
      prospects: effective.prospects.formsStatsUrl,
      pointMemoire: effective.pointMemoire.formsStatsUrl,
      k4: effective.k4.formsStatsUrl,
      k5: effective.k5.formsStatsUrl,
      rattrapage: effective.rattrapage.formsStatsUrl,
    };
  }

  function saveFormsStatsLinks(links) {
    const database = getDatabase();
    database.settings = {
      ...database.settings,
      formsStatsLinks: {
        ...(database.settings.formsStatsLinks || {}),
        prospects: String(links?.prospects || "").trim(),
        pointMemoire: String(links?.pointMemoire || "").trim(),
        k4: String(links?.k4 || "").trim(),
        k5: String(links?.k5 || "").trim(),
        rattrapage: String(links?.rattrapage || "").trim(),
      },
    };
    saveDatabase(database);
    return database.settings.formsStatsLinks;
  }

  function getRattrapageSettings() {
    return getEffectiveSettings().rattrapage;
  }

  function saveRattrapageSettings(settings) {
    const database = getDatabase();
    const current = database.settings.rattrapage || {};
    const hasEndpoint = Object.prototype.hasOwnProperty.call(settings || {}, "endpointRattrapage")
      || Object.prototype.hasOwnProperty.call(settings || {}, "responsesAppsScriptUrl");
    const hasToken = Object.prototype.hasOwnProperty.call(settings || {}, "tokenRattrapage")
      || Object.prototype.hasOwnProperty.call(settings || {}, "token");
    const endpointRattrapage = hasEndpoint
      ? String(settings?.endpointRattrapage || settings?.responsesAppsScriptUrl || "").trim()
      : String(current.endpointRattrapage || current.responsesAppsScriptUrl || "").trim();
    const tokenRattrapage = hasToken
      ? String(settings?.tokenRattrapage || settings?.token || "").trim()
      : String(current.tokenRattrapage || current.token || "").trim();
    const valueOrCurrent = (key) => Object.prototype.hasOwnProperty.call(settings || {}, key)
      ? String(settings?.[key] || "").trim()
      : String(current[key] || "").trim();
    database.settings = {
      ...database.settings,
      rattrapage: {
        ...current,
        lienFormsEntreeRattrapage: valueOrCurrent("lienFormsEntreeRattrapage"),
        sheetIdEntreeRattrapage: valueOrCurrent("sheetIdEntreeRattrapage"),
        lienFormsSuiviRattrapage: valueOrCurrent("lienFormsSuiviRattrapage"),
        sheetIdSuiviRattrapage: valueOrCurrent("sheetIdSuiviRattrapage"),
        templateSyntheseRepriseId: valueOrCurrent("templateSyntheseRepriseId"),
        dossierEtudiantsDriveId: valueOrCurrent("dossierEtudiantsDriveId"),
        endpointRattrapage,
        tokenRattrapage,
        responsesAppsScriptUrl: endpointRattrapage,
        token: tokenRattrapage,
      },
    };
    saveDatabase(database);
    return getRattrapageSettings();
  }

  function getProspectsFormUrl() {
    return getEffectiveSettings().prospects.formsPublicUrl;
  }

  function saveProspectsFormUrl(url) {
    return updateProspectsSettings({ formUrl: String(url || "").trim() }).formUrl;
  }

  function getProspectsMailEndpoint() {
    return getEffectiveSettings().prospects.mailsAppsScriptUrl;
  }

  function saveProspectsMailEndpoint(url) {
    return updateProspectsSettings({ mailEndpoint: String(url || "").trim() }).mailEndpoint;
  }

  function getProspectsMailToken() {
    return getEffectiveSettings().prospects.tokenMails;
  }

  function saveProspectsMailToken(token) {
    return updateProspectsSettings({ mailToken: String(token || "").trim() }).mailToken;
  }

  function getProspectsResponsesEndpoint() {
    return getEffectiveSettings().prospects.responsesAppsScriptUrl;
  }

  function saveProspectsResponsesEndpoint(url) {
    return updateProspectsSettings({ responsesEndpoint: String(url || "").trim() }).responsesEndpoint;
  }

  function getProspectsResponsesToken() {
    return getEffectiveSettings().prospects.tokenResponses;
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
          objet: String(template?.objet || template?.subject || ""),
          corps: String(template?.corps || template?.body || ""),
          subject: String(template?.subject || template?.objet || ""),
          body: String(template?.body || template?.corps || ""),
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
    const parcours = normalizeStudentParcours(studentData.parcours);
    if (!parcours) return null;
    const student = {
      id: global.crypto?.randomUUID?.() || `student-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      prenom: studentData.prenom || "",
      nom: studentData.nom || "",
      email: studentData.email || "",
      ifmk: studentData.ifmk || "",
      telephone: studentData.telephone || "",
      niveau: studentData.niveau || "",
      dateDebut: studentData.dateDebut || "",
      parcours,
      thematiqueMemoire: studentData.thematiqueMemoire || "",
      statut: archiveRequested ? "Archivé" : studentData.statut || "En cours",
      statutSuivi,
      echeance: studentData.echeance || "",
      urgentManuel: studentData.urgentManuel === true,
      notesInitiales: studentData.notesInitiales || "",
      sourceProspectId: studentData.sourceProspectId || "",
      dateCreation: now,
      dateModification: now,
      donneesParcours: isPlainObject(studentData.donneesParcours) ? studentData.donneesParcours : {},
      memoireImporte: studentData.memoireImporte || null,
      livrablesK4: studentData.livrablesK4 || null,
      pointMemoireResume: studentData.pointMemoireResume || null,
      questionnairePreVisioK4: studentData.questionnairePreVisioK4 || (parcours === "k4" ? {
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
      relanceEnvoyee: prospectData.relanceEnvoyee === true,
      relanceEnvoyeeLe: prospectData.relanceEnvoyeeLe || "",
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

  function isArchivedProspect(prospect) {
    return prospect?.statutProspect === "archive" || prospect?.statutProspect === "transforme";
  }

  function getActiveProspects() {
    return getProspects().filter((prospect) => !isArchivedProspect(prospect));
  }

  function getArchivedProspects() {
    return getProspects().filter(isArchivedProspect);
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

  function archiveProspect(id) {
    return updateProspect(id, { statutProspect: "archive", statut: "archivé" });
  }

  function restoreProspect(id) {
    return updateProspect(id, { statutProspect: "nouveau", statut: "nouveau" });
  }

  function deleteProspect(id) {
    const database = getDatabase();
    const initialLength = database.prospects.length;
    database.prospects = database.prospects.filter((prospect) => prospect.id !== id);

    if (database.prospects.length === initialLength) {
      return false;
    }

    saveDatabase(database);
    return true;
  }

  function getFirstFilledValue(...values) {
    const value = values.find((item) => String(item || "").trim());
    return value === undefined ? "" : String(value).trim();
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function mergeParcoursData(existingData, updatedData) {
    if (!isPlainObject(updatedData)) return isPlainObject(existingData) ? { ...existingData } : {};
    return Object.entries(updatedData).reduce((merged, [key, value]) => {
      if (isPlainObject(value) && isPlainObject(merged[key])) {
        merged[key] = mergeParcoursData(merged[key], value);
      } else {
        merged[key] = value;
      }
      return merged;
    }, isPlainObject(existingData) ? { ...existingData } : {});
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
    if (STUDENT_PARCOURS.has(normalized)) return normalized;
    return "";
  }

  function buildProspectQuestionnaireNotes(prospect, response) {
    const valueOrFallback = (value) => String(value || "").trim() || "Non renseigné";
    return [
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
    ].join("\n");
  }

  function buildProspectConversionNotes(prospect, response) {
    const summary = [
      "Prospect converti depuis l’onglet Prospects.",
      "",
      buildProspectQuestionnaireNotes(prospect, response),
    ];
    const firstContactNotes = [prospect.messageInitial, prospect.notes].filter((value) => String(value || "").trim());
    if (firstContactNotes.length) summary.push("", "Notes du premier contact :", firstContactNotes.join("\n\n"));
    return summary.join("\n");
  }

  function hasProspectQuestionnaireInformation(response) {
    return [
      response.responseId,
      response.receivedAt,
      response.email,
      response.telephone,
      response.ifmk,
      response.niveau,
      response.annee,
      response.avancementMemoire,
      response.difficultePrincipale,
      response.prochaineEcheance,
      response.niveauBlocage,
      response.niveauUrgence,
      response.aideSouhaitee,
      response.situationLibre,
      response.questionAudrey,
    ].some((value) => String(value || "").trim());
  }

  function appendProspectQuestionnaireNotes(existingNotes, prospect, response) {
    const sectionTitle = "Informations issues du questionnaire prospect";
    const notes = String(existingNotes || "").trim();
    if (!hasProspectQuestionnaireInformation(response) || notes.includes(sectionTitle)) return notes;
    return [notes, sectionTitle, buildProspectQuestionnaireNotes(prospect, response)].filter(Boolean).join("\n\n");
  }

  function createProspectOriginTrace(prospect, convertedAt) {
    return {
      prospectId: prospect.id,
      convertedAt,
      source: prospect.source || prospect.provenance || "",
      dateContact: prospect.dateContact || "",
      parcoursInteresse: prospect.parcoursInteresse || "",
      parcoursPressenti: prospect.parcoursPressenti || "",
      parcoursValide: prospect.parcoursValide || "",
      questionnaireEnvoyeLe: prospect.questionnaireEnvoyeLe || "",
      questionnaireReponduLe: prospect.questionnaireReponduLe || "",
      relanceEnvoyeeLe: prospect.relanceEnvoyeeLe || "",
      relanceCount: Number(prospect.relanceCount) || 0,
    };
  }

  function convertProspectToStudent(id, studentData = {}) {
    const prospect = getProspectById(id);
    if (!prospect) return null;
    const existingStudentId = prospect.studentId || prospect.convertedStudentId;
    const response = prospect.reponseQuestionnaireProspect || createEmptyProspectResponse();
    const convertedAt = new Date().toISOString();
    const origineProspect = createProspectOriginTrace(prospect, convertedAt);
    if (existingStudentId) {
      const existingStudent = getStudentById(existingStudentId);
      if (existingStudent) {
        const updatedStudent = updateStudent(existingStudentId, {
          sourceProspectId: existingStudent.sourceProspectId || prospect.id,
          prenom: getFirstFilledValue(
            existingStudent.prenom,
            studentData.prenom,
            prospect.prenom,
            response.prenom,
            extractProspectFirstName(response.nomComplet),
            prospect.pseudo,
          ),
          nom: getFirstFilledValue(
            existingStudent.nom,
            studentData.nom,
            prospect.nom,
            response.nom,
            extractProspectLastName(response.nomComplet),
          ),
          email: getFirstFilledValue(existingStudent.email, studentData.email, prospect.email, response.email),
          telephone: getFirstFilledValue(existingStudent.telephone, studentData.telephone, prospect.telephone, response.telephone),
          ifmk: getFirstFilledValue(existingStudent.ifmk, studentData.ifmk, prospect.ifmk, response.ifmk),
          niveau: getFirstFilledValue(existingStudent.niveau, studentData.niveau, prospect.niveau, response.niveau, response.annee),
          parcours: normalizeStudentParcours(studentData.parcours)
            || existingStudent.parcours
            || normalizeStudentParcours(prospect.parcoursValide)
            || normalizeStudentParcours(prospect.parcoursPressenti)
            || normalizeStudentParcours(prospect.parcoursVise),
          thematiqueMemoire: getFirstFilledValue(
            existingStudent.thematiqueMemoire,
            studentData.thematiqueMemoire,
            prospect.thematiqueMemoire,
            response.situationLibre,
            response.avancementMemoire,
          ),
          notesInitiales: appendProspectQuestionnaireNotes(
            existingStudent.notesInitiales || studentData.notesInitiales,
            prospect,
            response,
          ),
          donneesParcours: {
            ...(existingStudent.donneesParcours || {}),
            ...(studentData.donneesParcours || {}),
            questionnaireProspect: response,
            origineProspect: existingStudent.donneesParcours?.origineProspect || studentData.donneesParcours?.origineProspect || origineProspect,
          },
        });
        if (!updatedStudent?.id) return null;
        updateProspect(id, {
          statut: "converti en étudiant",
          statutProspect: "transforme",
          studentId: existingStudentId,
          convertedStudentId: existingStudentId,
        });
        return updatedStudent;
      }
    }

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
      sourceProspectId: prospect.id,
      donneesParcours: {
        questionnaireProspect: response,
        ...(studentData.donneesParcours || {}),
        origineProspect: studentData.donneesParcours?.origineProspect || origineProspect,
      },
    });
    if (!student?.id) return null;
    updateProspect(id, {
      statut: "converti en étudiant",
      statutProspect: "transforme",
      studentId: student.id,
      convertedStudentId: student.id,
      dateConversion: convertedAt,
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
    const hasParcoursUpdate = Object.prototype.hasOwnProperty.call(updatedData, "parcours");
    const normalizedParcours = normalizeStudentParcours(hasParcoursUpdate ? updatedData.parcours : database.students[index].parcours);
    if (hasParcoursUpdate && !normalizedParcours) return null;
    const hasParcoursDataUpdate = Object.prototype.hasOwnProperty.call(updatedData, "donneesParcours");
    const donneesParcours = hasParcoursDataUpdate
      ? mergeParcoursData(database.students[index].donneesParcours, updatedData.donneesParcours)
      : database.students[index].donneesParcours;
    database.students[index] = normalizeStudent({
      ...database.students[index],
      ...updatedData,
      parcours: normalizedParcours,
      donneesParcours,
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
    const currentStudent = getStudentById(id);
    return updateStudent(id, {
      statut: "Archivé",
      statutSuivi: "archive",
      statutSuiviAvantArchive: currentStudent?.statutSuivi && currentStudent.statutSuivi !== "archive"
        ? currentStudent.statutSuivi
        : currentStudent?.statutSuiviAvantArchive || "nouveau",
      dateArchivage: new Date().toISOString(),
    });
  }

  function restoreStudent(id) {
    const currentStudent = getStudentById(id);
    const restoredStatus = currentStudent?.statutSuiviAvantArchive && currentStudent.statutSuiviAvantArchive !== "archive"
      ? currentStudent.statutSuiviAvantArchive
      : "nouveau";
    return updateStudent(id, {
      statut: "En cours",
      statutSuivi: restoredStatus,
    });
  }

  function getStudentsByParcours(parcours) {
    return getDatabase().students.filter((student) => student.parcours === parcours && !isArchivedStudent(student));
  }

  function getActiveStudents() {
    return getDatabase().students.filter((student) => !isArchivedStudent(student));
  }

  function getArchivedStudents() {
    return getDatabase().students.filter(isArchivedStudent);
  }

  function getArchivedStudentsByParcours(parcours) {
    return getDatabase().students.filter((student) => student.parcours === parcours && isArchivedStudent(student));
  }

  function getAiLearningRules() {
    return getDatabase().aiLearningRules;
  }

  function getActiveAiLearningRules() {
    return getAiLearningRules().filter((rule) => rule.active !== false && rule.regle);
  }

  function upsertAiLearningRule(ruleData) {
    const regle = String(ruleData?.regle || "").trim();
    const champ = String(ruleData?.champ || "").trim();
    if (!champ || !regle) return null;
    const database = getDatabase();
    const normalizedRuleText = regle.toLocaleLowerCase("fr-FR");
    const existingIndex = database.aiLearningRules.findIndex((rule) => (
      rule.active !== false
      && rule.champ === champ
      && String(rule.regle || "").trim().toLocaleLowerCase("fr-FR") === normalizedRuleText
    ));
    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      database.aiLearningRules[existingIndex] = normalizeAiLearningRule({
        ...database.aiLearningRules[existingIndex],
        erreurIA: String(ruleData.erreurIA || database.aiLearningRules[existingIndex].erreurIA || "").trim(),
        correctionAudrey: String(ruleData.correctionAudrey || database.aiLearningRules[existingIndex].correctionAudrey || "").trim(),
        sourceStudentId: String(ruleData.sourceStudentId || database.aiLearningRules[existingIndex].sourceStudentId || "").trim(),
        sourceMemoireTitre: String(ruleData.sourceMemoireTitre || database.aiLearningRules[existingIndex].sourceMemoireTitre || "").trim(),
        updatedAt: now,
      });
      saveDatabase(database);
      return database.aiLearningRules[existingIndex];
    }
    const rule = normalizeAiLearningRule({
      ...ruleData,
      id: `rule_${global.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`}`,
      createdAt: now,
      updatedAt: now,
      usedCount: 0,
      active: true,
    });
    database.aiLearningRules.push(rule);
    saveDatabase(database);
    return rule;
  }

  function deactivateAiLearningRule(id) {
    const database = getDatabase();
    const index = database.aiLearningRules.findIndex((rule) => rule.id === id);
    if (index < 0) return null;
    database.aiLearningRules[index] = normalizeAiLearningRule({
      ...database.aiLearningRules[index],
      active: false,
      updatedAt: new Date().toISOString(),
    });
    saveDatabase(database);
    return database.aiLearningRules[index];
  }

  function getActiveAiLearningRulesText() {
    const rules = getActiveAiLearningRules();
    if (!rules.length) return "";
    return [
      "Règles apprises à partir des corrections d’Audrey :",
      ...rules.map((rule) => `- [${AI_FIELD_LABELS[rule.champ] || rule.champ}] ${rule.regle}`),
    ].join("\n");
  }

  global.RedacStorage = Object.freeze({
    getDatabase,
    saveDatabase,
    createStudent,
    createProspect,
    getProspects,
    getActiveProspects,
    getArchivedProspects,
    getProspectById,
    updateProspect,
    archiveProspect,
    restoreProspect,
    deleteProspect,
    convertProspectToStudent,
    getStudentById,
    updateStudent,
    deleteStudent,
    archiveStudent,
    restoreStudent,
    getStudentsByParcours,
    getActiveStudents,
    getArchivedStudents,
    getArchivedStudentsByParcours,
    getAiLearningRules,
    getActiveAiLearningRules,
    upsertAiLearningRule,
    deactivateAiLearningRule,
    getActiveAiLearningRulesText,
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
    getFormsStatsLinks,
    saveFormsStatsLinks,
    getRattrapageSettings,
    saveRattrapageSettings,
    getEffectiveSettings,
  });
})(window);
