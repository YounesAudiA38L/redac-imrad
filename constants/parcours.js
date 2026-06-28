(function initializeParcoursConstants(global) {
  const parcours = Object.freeze({
    POINT_MEMOIRE: "point-memoire",
    K4: "k4",
    K5: "k5",
    RATTRAPAGE: "rattrapage",
  });

  const labels = Object.freeze({
    [parcours.POINT_MEMOIRE]: "Point Mémoire",
    [parcours.K4]: "K4",
    [parcours.K5]: "K5",
    [parcours.RATTRAPAGE]: "Rattrapage",
  });

  global.RedacConstants = Object.freeze({
    ...(global.RedacConstants || {}),
    parcours,
    parcoursLabels: labels,
    studentParcours: Object.freeze(Object.values(parcours)),
  });
})(window);
