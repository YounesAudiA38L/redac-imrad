(function renderParcoursStudents() {
  const storage = window.RedacStorage;
  const container = document.querySelector("[data-parcours-students]");

  if (!container) return;

  const parcours = container.dataset.parcoursStudents;
  const count = document.querySelector("[data-parcours-count]");
  const parcoursLabels = { "point-memoire": "Point Mémoire", k4: "K4", k5: "K5", rattrapage: "Rattrapage" };
  const statusValues = ["nouveau", "questionnaire-envoye", "questionnaire-recu", "memoire-importe", "analyse-en-cours", "retour-envoye", "a-relancer", "termine"];
  const parcoursTransferOptions = [
    { value: "k4", label: "K4" },
    { value: "k5", label: "K5" },
    { value: "rattrapage", label: "Rattrapage" },
  ];
  let termeRechercheParcours = "";
  let statutFiltreParcours = "tous";
  let archivesVisible = false;
  let archivesSection = null;
  let archivesButton = null;
  let parcoursStatus = null;
  let openTransferDropdown = null;

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

    if (student.parcours === "point-memoire" && student.statut !== "Archivé" && student.statutSuivi !== "archive") {
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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("fr-FR");
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
    restore.textContent = "Restaurer";
    restore.addEventListener("click", () => {
      storage.restoreStudent(student.id);
      render();
      setArchiveStatus("Étudiant restauré.");
    });

    const remove = document.createElement("button");
    remove.className = "danger-action archive-delete-action";
    remove.type = "button";
    remove.textContent = "Supprimer définitivement";
    remove.addEventListener("click", () => {
      const confirmed = window.confirm("Supprimer définitivement cet étudiant ? Cette action est irréversible.");
      if (!confirmed) return;
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
    const archivedStudents = storage.getArchivedStudentsByParcours(parcours);
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
    const allStudents = storage.getStudentsByParcours(parcours);
    if (count) count.textContent = String(allStudents.length);
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
