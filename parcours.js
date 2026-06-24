(function renderParcoursStudents() {
  const storage = window.RedacStorage;
  const container = document.querySelector("[data-parcours-students]");

  if (!container) return;

  const parcours = container.dataset.parcoursStudents;
  const count = document.querySelector("[data-parcours-count]");
  const parcoursLabels = { "point-memoire": "Point Mémoire", k4: "K4", k5: "K5", rattrapage: "Rattrapage" };
  const statusValues = ["nouveau", "questionnaire-envoye", "questionnaire-recu", "memoire-importe", "analyse-en-cours", "retour-envoye", "a-relancer", "termine", "archive"];
  let termeRechercheParcours = "";
  let statutFiltreParcours = "tous";

  function normalizeSearchValue(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
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
    controls.append(searchField, statusField);
    container.before(controls);

    searchInput.addEventListener("input", () => {
      termeRechercheParcours = searchInput.value;
      render();
    });
    statusSelect.addEventListener("change", () => {
      statutFiltreParcours = statusSelect.value;
      render();
    });
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

  function createCard(student) {
    const card = document.createElement("article");
    card.className = "student-card";
    card.dataset.studentId = student.id;

    const header = document.createElement("div");
    const category = document.createElement("span"); category.className = "category-label"; category.textContent = parcoursLabels[student.parcours];
    const name = document.createElement("h3"); name.textContent = `${student.prenom} ${student.nom}`.trim() || "Étudiant sans nom";
    header.append(category, name, createStatusBadges(student));

    const details = document.createElement("dl");
    addDetail(details, "Début d’accompagnement", student.dateDebut);
    addDetail(details, "Statut", student.statut);
    addDetail(details, "IFMK", student.ifmk);
    addDetail(details, "Thématique", student.thematiqueMemoire);
    addDetail(details, "Mémoire importé", student.memoireImporte?.nom || "Aucun fichier");

    const actions = document.createElement("div");
    actions.className = "student-card-actions";
    const open = document.createElement("a"); open.className = "secondary-action"; open.href = `index.html?student=${encodeURIComponent(student.id)}`; open.textContent = "Ouvrir la fiche";
    const edit = document.createElement("a"); edit.className = "secondary-action"; edit.href = `index.html?student=${encodeURIComponent(student.id)}&edit=1`; edit.textContent = "Modifier le suivi";
    const archive = document.createElement("button"); archive.className = "secondary-action"; archive.type = "button"; archive.textContent = student.statut === "Archivé" ? "Archivé" : "Archiver"; archive.disabled = student.statut === "Archivé";
    archive.addEventListener("click", () => { storage.archiveStudent(student.id); render(); });
    actions.append(open, edit, archive);

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

  function render() {
    const allStudents = storage.getStudentsByParcours(parcours);
    count.textContent = String(allStudents.length);
    const searchTerm = normalizeSearchValue(termeRechercheParcours.trim());
    const students = allStudents.filter((student) => {
      const matchesSearch = !searchTerm || [student.prenom, student.nom, student.email]
        .some((value) => normalizeSearchValue(value).includes(searchTerm));
      const matchesStatus = statutFiltreParcours === "tous" || student.statutSuivi === statutFiltreParcours;
      return matchesSearch && matchesStatus;
    });
    container.textContent = "";

    if (allStudents.length === 0) {
      const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Aucun étudiant accompagné dans ce parcours."; container.append(empty);
    } else if (students.length === 0) {
      const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Aucun étudiant ne correspond à ta recherche."; container.append(empty);
    } else {
      students.forEach((student) => container.append(createCard(student)));
    }

    window.dispatchEvent(new CustomEvent("redac:parcours-rendered", { detail: { parcours } }));
  }

  createFilterBar();
  render();
  window.addEventListener("redac:students-changed", render);
})();
