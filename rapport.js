const STORAGE_KEY = "redacImrad.memoires";

const reportIntro = document.querySelector("#report-intro");
const reportStatus = document.querySelector("#report-status");
const reportSummary = document.querySelector("#report-summary");
const summaryCriteria = document.querySelector("#summary-criteria");
const reportSections = document.querySelector("#report-sections");
const vigilanceList = document.querySelector("#vigilance-list");
const prioritiesList = document.querySelector("#priorities-list");

function getMemoires() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getRequestedMemoire() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const memoires = getMemoires();

  return id ? memoires.find((memoire) => memoire.id === id) : null;
}

function createMeta(label, value) {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");

  term.textContent = label;
  description.textContent = value;
  wrapper.append(term, description);

  return wrapper;
}

function fillList(list, items) {
  list.textContent = "";

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    list.append(listItem);
  });
}

function getCriteria(sectionKey, savedCriteria) {
  if (Array.isArray(savedCriteria) && savedCriteria.length > 0) {
    return savedCriteria;
  }

  return window.GRILLES_IMRAD?.getCriteria(sectionKey) || [];
}

function formatStatus(status) {
  if (!status) {
    return "À vérifier";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function renderCriteria(container, criteria) {
  container.textContent = "";

  if (criteria.length === 0) {
    return;
  }

  const heading = document.createElement("h4");
  heading.textContent = "Critères à vérifier";
  container.append(heading);

  criteria.forEach((criterion) => {
    const article = document.createElement("article");
    article.className = "criterion-card";

    const header = document.createElement("div");
    header.className = "criterion-header";

    const name = document.createElement("h5");
    name.textContent = criterion.nom;

    const status = document.createElement("span");
    status.className = "criterion-status";
    status.textContent = formatStatus(criterion.statut);

    const description = document.createElement("p");
    description.textContent = criterion.description;

    const metadata = document.createElement("dl");
    metadata.className = "criterion-details";
    metadata.append(
      createMeta("Importance", criterion.importance),
      createMeta("Aide à la relecture", criterion.aideEvaluation),
      createMeta("Exemple de remarque", criterion.exempleRemarque),
    );

    header.append(name, status);
    article.append(header, description, metadata);
    container.append(article);
  });
}

function renderReport(memoire) {
  const report = memoire?.report;

  if (!report) {
    fillList(vigilanceList, ["Lancer l’analyse locale depuis l’Accueil."]);
    fillList(prioritiesList, ["Importer ou réimporter le fichier, puis utiliser le bouton Analyser le mémoire."]);
    return;
  }

  document.title = `${memoire.fileName} - Rapport de relecture`;
  reportIntro.textContent = `Rapport provisoire généré pour : ${memoire.fileName}`;
  reportStatus.textContent = "Rapport provisoire à vérifier";

  const summary = document.createElement("dl");
  summary.className = "memoire-summary";
  summary.append(
    createMeta("Sections détectées", `${report.globalSummary.detectedSections} / ${report.globalSummary.totalSections}`),
    createMeta("Longueur approximative", `${report.globalSummary.approximateLength} mots`),
    createMeta("Commentaire provisoire", report.globalSummary.comment),
  );
  reportSummary.replaceChildren(summary);
  reportSummary.className = "";
  renderCriteria(summaryCriteria, getCriteria("syntheseGlobale", report.globalSummary.criteres));

  reportSections.textContent = "";
  report.sections.forEach((section) => {
    const article = document.createElement("article");
    article.className = "report-section-card";

    const title = document.createElement("h3");
    title.textContent = section.title;

    const details = document.createElement("dl");
    details.className = "report-section-details";
    details.append(
      createMeta("Section détectée", section.detected ? "Oui" : "Non"),
      createMeta("Longueur approximative", `${section.approximateLength} mots`),
      createMeta("Commentaire provisoire", section.comment),
    );

    const excerpt = document.createElement("p");
    excerpt.className = "section-excerpt";
    excerpt.textContent = section.excerpt || "Aucun extrait disponible pour cette section.";

    const criteria = document.createElement("div");
    criteria.className = "criteria-list";
    renderCriteria(criteria, getCriteria(section.key, section.criteres));

    article.append(title, details, excerpt, criteria);
    reportSections.append(article);
  });

  fillList(vigilanceList, report.vigilancePoints);
  fillList(prioritiesList, report.correctionPriorities);
}

renderReport(getRequestedMemoire());
