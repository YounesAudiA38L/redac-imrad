(function renderParcoursStudents() {
  const storage = window.RedacServices.appData;
  const container = document.querySelector("[data-parcours-students]");

  if (!container) return;

  const parcours = container.dataset.parcoursStudents;
  const count = document.querySelector("[data-parcours-count]");
  const parcoursLabels = window.RedacConstants?.parcoursLabels || { "point-memoire": "Point Mémoire", k4: "K4", k5: "K5", rattrapage: "Rattrapage" };
  const UI_MESSAGES = Object.freeze({
    studentArchived: "Dossier archivé. Tu peux le retrouver dans les filtres.",
  });
  const FUTURE_HELP_TEXTS = Object.freeze({
    rattrapageMemoireAnalysis: "Repérage automatique indicatif. Ces signaux complètent l'analyse d'Audrey, ne la remplacent pas.",
  });
  const FUTURE_BUTTON_TODOS = Object.freeze({
    k4: [
      "Analyser le sujet",
      "Enregistrer la fiche de cadrage",
      "Enregistrer la trame de question",
      "Ajouter une visio",
      "Supprimer cette visio",
      "Générer la feuille de route dans Drive",
    ],
    k5: [
      "Importer le mémoire",
      "Extraire les éléments IMRaD",
      "Enregistrer la grille IMRaD",
      "Enregistrer la checklist",
      "Ajouter un compte-rendu",
      "Générer le CR dans Drive",
      "Préparer le brouillon mail",
      "Enregistrer le planning",
      "Ajouter une visio",
      "Marquer la visio comme faite",
      "Supprimer cette visio",
      "Enregistrer la préparation soutenance",
      "Récupérer les réponses du questionnaire",
      "Préparer les livrables dans Drive",
      "Générer le retour final dans Drive",
      "Enregistrer la configuration",
    ],
    rattrapage: [
      "Importer le mémoire",
      "Analyser le mémoire",
      "Enregistrer les remarques jury",
      "Importer les corrections depuis les remarques",
      "Ajouter une correction",
      "Convertir les signaux en corrections",
      "Enregistrer le plan de reprise",
      "Ajouter une visio",
      "Marquer la visio comme faite",
      "Supprimer cette visio",
      "Enregistrer la préparation orale",
      "Générer le plan de correction dans Drive",
      "Générer la synthèse de reprise dans Drive",
      "Préparer le brouillon mail",
    ],
  });
  // TODO: afficher FUTURE_HELP_TEXTS.rattrapageMemoireAnalysis quand la zone d'analyse mémoire rattrapage existera.
  // TODO: créer les boutons listés dans FUTURE_BUTTON_TODOS uniquement lorsque les fonctionnalités correspondantes existent.
  const statusValues = ["nouveau", "questionnaire-envoye", "questionnaire-recu", "memoire-importe", "analyse-en-cours", "retour-envoye", "a-relancer", "termine"];
  const parcoursTransferOptions = [
    { value: "k4", label: "K4" },
    { value: "k5", label: "K5" },
    { value: "rattrapage", label: "Rattrapage" },
  ];
  let termeRechercheParcours = "";
  let statutFiltreParcours = "tous";
  let urgenceFiltre = "";
  let triFiltre = "";
  let archivesVisible = false;
  let archivesSection = null;
  let archivesButton = null;
  let parcoursStatus = null;
  let openTransferDropdown = null;

  function normalizeSearchValue(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
  }

  function isStudentArchived(student) {
    return (
      student?.statutSuivi === "archive" ||
      student?.statut === "Archivé" ||
      student?.statut === "archive" ||
      student?.archive === true ||
      Boolean(student?.dateArchivage)
    );
  }

  function getAllStudentsForParcours() {
    const databaseStudents = storage.getDatabase?.().students;
    if (Array.isArray(databaseStudents)) return databaseStudents.filter((student) => student.parcours === parcours);

    const studentsById = new Map();
    storage.getStudentsByParcours(parcours).forEach((student) => studentsById.set(student.id, student));
    storage.getArchivedStudentsByParcours(parcours).forEach((student) => studentsById.set(student.id, student));
    return Array.from(studentsById.values());
  }

  function createFilterBar() {
    const controls = document.createElement("div");
    controls.className = "filter-bar parcours-filter-bar";
    controls.setAttribute("role", "search");

    const searchField = document.createElement("label");
    searchField.className = "field parcours-search-field";
    const searchLabel = document.createElement("span");
    searchLabel.textContent = "Rechercher un étudiant";
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Rechercher (nom, email…)";
    searchInput.autocomplete = "off";
    searchField.append(searchLabel, searchInput);

    const statusField = document.createElement("label");
    statusField.className = "field parcours-status-field";
    const statusLabel = document.createElement("span");
    statusLabel.textContent = "Statut de suivi";
    const statusSelect = document.createElement("select");
    const allStatuses = document.createElement("option");
    allStatuses.value = "tous";
    allStatuses.textContent = "Tous les statuts";
    statusSelect.append(allStatuses);
    statusValues.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = storage.getStatutSuiviLabel(value);
      statusSelect.append(option);
    });
    statusField.append(statusLabel, statusSelect);

    const urgencyField = document.createElement("label");
    urgencyField.className = "field parcours-urgency-field";
    const urgencyLabel = document.createElement("span");
    urgencyLabel.textContent = "Urgence";
    const urgencySelect = document.createElement("select");
    [
      { value: "", label: "Toutes les urgences" },
      { value: "urgent", label: "Urgent (< 7 jours)" },
      { value: "bientot", label: "Bientôt (< 15 jours)" },
      { value: "depassee", label: "Échéance dépassée" },
    ].forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      urgencySelect.append(option);
    });
    urgencyField.append(urgencyLabel, urgencySelect);

    const sortField = document.createElement("label");
    sortField.className = "field parcours-sort-field";
    const sortLabel = document.createElement("span");
    sortLabel.textContent = "Trier par";
    const sortSelect = document.createElement("select");
    [
      { value: "", label: "Ordre par défaut" },
      { value: "echeance_asc", label: "Échéance : la plus proche en premier" },
      { value: "echeance_desc", label: "Échéance : la plus lointaine en premier" },
      { value: "nom_asc", label: "Nom A → Z" },
    ].forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      sortSelect.append(option);
    });
    sortField.append(sortLabel, sortSelect);

    controls.append(searchField, statusField, urgencyField, sortField);
    container.before(controls);

    searchInput.addEventListener("input", () => {
      termeRechercheParcours = searchInput.value;
      render();
    });
    statusSelect.addEventListener("change", () => {
      statutFiltreParcours = statusSelect.value;
      render();
    });
    urgencySelect.addEventListener("change", () => {
      urgenceFiltre = urgencySelect.value;
      render();
    });
    sortSelect.addEventListener("change", () => {
      triFiltre = sortSelect.value;
      render();
    });
  }

  function matchesUrgenceFilter(student) {
    if (urgenceFiltre === "urgent") return storage.isUrgent(student) === true;
    const deadlineLevel = storage.getNiveauEcheance(student);
    if (urgenceFiltre === "bientot") return deadlineLevel === "bientot" || deadlineLevel === "urgent";
    if (urgenceFiltre === "depassee") return deadlineLevel === "depassee";
    return true;
  }

  function getDeadlineTimestamp(student) {
    const date = new Date(student?.echeance || "");
    return Number.isNaN(date.getTime()) ? Infinity : date.getTime();
  }

  function compareByDeadlineAsc(left, right) {
    return getDeadlineTimestamp(left) - getDeadlineTimestamp(right);
  }

  function compareByDeadlineDesc(left, right) {
    const leftTime = getDeadlineTimestamp(left);
    const rightTime = getDeadlineTimestamp(right);
    if (leftTime === Infinity && rightTime === Infinity) return 0;
    if (leftTime === Infinity) return 1;
    if (rightTime === Infinity) return -1;
    return rightTime - leftTime;
  }

  function compareByName(left, right) {
    const leftName = `${left.nom || ""} ${left.prenom || ""}`.trim();
    const rightName = `${right.nom || ""} ${right.prenom || ""}`.trim();
    return leftName.localeCompare(rightName, "fr", { sensitivity: "base" });
  }

  function sortStudents(students) {
    if (triFiltre === "echeance_asc") return [...students].sort(compareByDeadlineAsc);
    if (triFiltre === "echeance_desc") return [...students].sort(compareByDeadlineDesc);
    if (triFiltre === "nom_asc") return [...students].sort(compareByName);
    return students;
  }

  function addDetail(list, label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value || "À renseigner";
    row.append(term, description);
    list.append(row);
  }

  function isValidIsoDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function formatDateFr(value) {
    const trimmed = String(value || "").trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return isValidIsoDate(trimmed) ? `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}` : "";
    if (!trimmed) return "";
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function ensureParcoursStatus() {
    if (parcoursStatus) return parcoursStatus;
    parcoursStatus = document.createElement("p");
    parcoursStatus.className = "form-message parcours-status-message";
    parcoursStatus.setAttribute("role", "status");
    parcoursStatus.setAttribute("aria-live", "polite");
    parcoursStatus.hidden = true;
    container.before(parcoursStatus);
    return parcoursStatus;
  }

  function setParcoursStatus(message) {
    const status = ensureParcoursStatus();
    status.textContent = message;
    status.hidden = !message;
  }

  function closeTransferDropdown() {
    if (!openTransferDropdown) return;
    const toggle = openTransferDropdown.querySelector(".parcours-transfer-toggle");
    const menu = openTransferDropdown.querySelector(".parcours-transfer-menu");
    openTransferDropdown.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
    openTransferDropdown = null;
  }

  function createStatusBadges(student) {
    const badges = document.createElement("div");
    badges.className = "statut-pastilles";

    const followUpStatus = document.createElement("span");
    followUpStatus.className = "statut-pastille";
    followUpStatus.dataset.statut = student.statutSuivi;
    followUpStatus.textContent = storage.getStatutSuiviLabel(student.statutSuivi);
    badges.append(followUpStatus);

    const deadlineLevel = storage.getNiveauEcheance(student);
    const deadlineBadge = document.createElement("span");
    if (deadlineLevel === "depassee") {
      deadlineBadge.className = "statut-pastille statut-pastille-depassee";
      deadlineBadge.textContent = "Échéance dépassée";
      badges.append(deadlineBadge);
    } else if (storage.isUrgent(student)) {
      deadlineBadge.className = "statut-pastille statut-pastille-urgent";
      deadlineBadge.textContent = "Urgent";
      badges.append(deadlineBadge);
    } else if (deadlineLevel === "bientot") {
      deadlineBadge.className = "statut-pastille statut-pastille-bientot";
      deadlineBadge.textContent = "Bientôt";
      badges.append(deadlineBadge);
    }
    return badges;
  }

  function changeStudentParcours(student, targetParcours) {
    const targetLabel = parcoursLabels[targetParcours] || targetParcours;
    const confirmed = window.confirm(`Confirmer le passage de cet étudiant vers ${targetLabel} ?`);
    if (!confirmed) return;

    const now = new Date().toISOString();
    const donneesParcours = student.donneesParcours && typeof student.donneesParcours === "object"
      ? student.donneesParcours
      : {};

    storage.updateStudent(student.id, {
      parcours: targetParcours,
      dateModification: now,
      donneesParcours: {
        ...donneesParcours,
        transfertParcours: {
          ...(donneesParcours.transfertParcours || {}),
          depuis: "point-memoire",
          vers: targetParcours,
          date: now,
        },
      },
    });
    setParcoursStatus(`L’étudiant a été déplacé vers ${targetLabel}.`);
    render();
  }

  function createParcoursTransferControl(student) {
    const wrapper = document.createElement("div");
    wrapper.className = "parcours-transfer-control change-path-dropdown";

    const toggle = document.createElement("button");
    toggle.className = "secondary-action parcours-transfer-toggle dropdown-toggle";
    toggle.type = "button";
    toggle.textContent = "Changer de parcours ▼";
    toggle.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "parcours-transfer-menu dropdown-menu";
    menu.hidden = true;

    parcoursTransferOptions.forEach((option) => {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.textContent = option.label;
      choice.dataset.targetPath = option.value;
      choice.addEventListener("click", () => {
        closeTransferDropdown();
        changeStudentParcours(student, option.value);
      });
      menu.append(choice);
    });

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const shouldOpen = !wrapper.classList.contains("is-open");
      closeTransferDropdown();
      if (!shouldOpen) return;
      wrapper.classList.add("is-open");
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      openTransferDropdown = wrapper;
    });

    wrapper.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    wrapper.append(toggle, menu);
    return wrapper;
  }

  function createCard(student) {
    const card = document.createElement("article");
    card.className = "student-card";
    card.dataset.studentId = student.id;

    const header = document.createElement("div");
    const category = document.createElement("span"); category.className = "category-label"; category.textContent = parcoursLabels[student.parcours];
    const name = document.createElement("h3"); name.textContent = `${student.prenom} ${student.nom}`.trim() || "Étudiant sans nom";
    header.append(category, name, createStatusBadges(student));

    const details = document.createElement("dl");
    addDetail(details, "Début d’accompagnement", formatDateFr(student.dateDebut));
    addDetail(details, "Statut", student.statut);
    addDetail(details, "IFMK", student.ifmk);
    addDetail(details, "Thématique", student.thematiqueMemoire);
    if (student.parcours === "rattrapage") {
      addDetail(details, "Session rattrapage", formatDateFr(student.donneesParcours?.suiviRattrapage?.dateSession));
    }
    addDetail(details, "Mémoire importé", student.memoireImporte?.nom || "Aucun fichier");

    const actions = document.createElement("div");
    actions.className = "student-card-actions";
    const open = document.createElement("a"); open.className = "secondary-action"; open.href = `index.html?student=${encodeURIComponent(student.id)}`; open.textContent = "Voir le dossier";
    const edit = document.createElement("a"); edit.className = "secondary-action"; edit.href = `index.html?student=${encodeURIComponent(student.id)}&edit=1`; edit.textContent = "Modifier la fiche";
    const archived = isStudentArchived(student);
    const archive = document.createElement("button"); archive.className = "destructive-action"; archive.type = "button"; archive.textContent = archived ? "Archivé" : "Archiver le dossier"; archive.disabled = archived;
    archive.addEventListener("click", () => {
      const confirmed = window.confirm("Confirmer l’archivage de ce dossier ?");
      if (!confirmed) return;
      storage.archiveStudent(student.id);
      setParcoursStatus(UI_MESSAGES.studentArchived);
      render();
    });
    actions.append(open, edit, archive);

    if (student.parcours === "point-memoire" && !isStudentArchived(student)) {
      actions.append(createParcoursTransferControl(student));
    }

    if (student.parcours === "k4") {
      card.classList.add("student-card-k4");
      const grid = document.createElement("div");
      grid.className = "student-card-grid";
      const summaryPanel = document.createElement("section");
      summaryPanel.className = "student-summary-panel";
      summaryPanel.append(header, details, actions);
      grid.append(summaryPanel);
      card.append(grid);
    } else {
      card.append(header, details, actions);
    }
    return card;
  }

  function formatDate(value) {
    if (!value) return "À renseigner";
    return formatDateFr(value) || value;
  }

  function createArchivedCard(student) {
    const card = document.createElement("article");
    card.className = "archive-student-card";
    card.dataset.studentId = student.id;

    const content = document.createElement("div");
    const category = document.createElement("span");
    category.className = "category-label";
    category.textContent = parcoursLabels[student.parcours] || student.parcours || "Parcours";
    const name = document.createElement("h3");
    name.textContent = `${student.prenom || ""} ${student.nom || ""}`.trim() || "Étudiant sans nom";
    const details = document.createElement("p");
    details.className = "archive-student-details";
    details.textContent = [
      student.email || "Email à renseigner",
      `Début : ${formatDate(student.dateDebut)}`,
      `Archivé : ${formatDate(student.dateArchivage || student.dateModification)}`,
    ].join(" · ");
    content.append(category, name, details);

    const actions = document.createElement("div");
    actions.className = "archive-student-actions";
    const restore = document.createElement("button");
    restore.className = "secondary-action archive-restore-action";
    restore.type = "button";
    restore.textContent = "Restaurer le dossier";
    restore.addEventListener("click", () => {
      const restoredStudent = storage.restoreStudent(student.id);
      if (restoredStudent?.dateArchivage) storage.updateStudent(student.id, { dateArchivage: "" });
      render();
      setArchiveStatus("Étudiant restauré.");
    });

    const remove = document.createElement("button");
    remove.className = "destructive-action archive-delete-action";
    remove.type = "button";
    remove.textContent = "Supprimer définitivement";
    remove.addEventListener("click", () => {
      const confirmed = window.confirm("Supprimer définitivement cette fiche ? Cette action est irréversible. Les données locales associées seront supprimées de Redac-IMRaD.");
      if (!confirmed) return;
      const typedConfirmation = window.prompt("Pour confirmer la suppression définitive, tape SUPPRIMER.");
      if (typedConfirmation !== "SUPPRIMER") {
        setArchiveStatus("Suppression annulée.");
        return;
      }
      storage.deleteStudent(student.id);
      render();
      setArchiveStatus("Étudiant supprimé définitivement.");
    });

    actions.append(restore, remove);
    card.append(content, actions);
    return card;
  }

  function setArchiveStatus(message) {
    const status = archivesSection?.querySelector("[data-archive-status]");
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
  }

  function ensureArchivesSection() {
    if (archivesSection) return;
    const parcoursWorkspace = container.closest(".workspace");
    archivesSection = document.createElement("section");
    archivesSection.className = "workspace archives-students-section";
    archivesSection.hidden = true;
    archivesSection.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">Archives</p>
          <h2>Étudiants archivés</h2>
        </div>
      </div>
      <p class="sync-note">Les étudiants archivés restent consultables ici. La suppression définitive demande toujours confirmation.</p>
      <p class="form-message archives-status" data-archive-status role="status" aria-live="polite" hidden></p>
      <div class="archives-students-list" data-archive-list aria-live="polite"></div>
    `;

    archivesButton = document.createElement("button");
    archivesButton.className = "secondary-action archives-toggle-action";
    archivesButton.type = "button";
    archivesButton.textContent = "Voir les étudiants archivés";
    archivesButton.addEventListener("click", () => {
      archivesVisible = !archivesVisible;
      renderArchives();
    });

    const toggleWrap = document.createElement("div");
    toggleWrap.className = "archives-toggle-wrap";
    toggleWrap.append(archivesButton);
    parcoursWorkspace.after(toggleWrap, archivesSection);
  }

  function renderArchives() {
    ensureArchivesSection();
    const archivedStudents = getAllStudentsForParcours().filter(isStudentArchived);
    archivesSection.hidden = !archivesVisible;
    archivesButton.textContent = archivesVisible ? "Masquer les étudiants archivés" : "Voir les étudiants archivés";

    const list = archivesSection.querySelector("[data-archive-list]");
    list.textContent = "";
    if (archivedStudents.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Aucun étudiant archivé dans ce parcours.";
      list.append(empty);
      return;
    }

    archivedStudents.forEach((student) => list.append(createArchivedCard(student)));
  }

  function render() {
    const allStudents = getAllStudentsForParcours();
    const activeStudents = allStudents.filter((student) => !isStudentArchived(student));
    if (count) count.textContent = String(activeStudents.length);
    const searchTerm = normalizeSearchValue(termeRechercheParcours.trim());
    const students = sortStudents(activeStudents.filter((student) => {
      const matchesSearch = !searchTerm || [student.prenom, student.nom, student.email]
        .some((value) => normalizeSearchValue(value).includes(searchTerm));
      const matchesStatus = statutFiltreParcours === "tous" || student.statutSuivi === statutFiltreParcours;
      const matchesUrgence = matchesUrgenceFilter(student);
      return matchesSearch && matchesStatus && matchesUrgence;
    }));
    container.textContent = "";

    if (activeStudents.length === 0) {
      const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Aucun étudiant accompagné dans ce parcours."; container.append(empty);
    } else if (students.length === 0) {
      const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = urgenceFiltre ? "Aucun étudiant urgent dans ce parcours pour le moment." : "Aucun étudiant ne correspond à ta recherche."; container.append(empty);
    } else {
      students.forEach((student) => container.append(createCard(student)));
    }

    window.dispatchEvent(new CustomEvent("redac:parcours-rendered", { detail: { parcours } }));
    renderArchives();
  }

  createFilterBar();
  ensureArchivesSection();
  render();
  window.addEventListener("redac:students-changed", render);
  document.addEventListener("click", closeTransferDropdown);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTransferDropdown();
  });
})();
