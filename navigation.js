(function renderMainNavigation() {
  const items = [
    { id: "accueil", label: "Accueil", href: "index.html" },
    { id: "point-memoire", label: "Point Mémoire", href: "point-memoire.html" },
    { id: "k4", label: "K4", href: "k4.html" },
    { id: "k5", label: "K5", href: "k5.html" },
    { id: "rattrapage", label: "Rattrapage", href: "rattrapage.html" },
  ];

  const pageName = window.location.pathname.split("/").pop() || "index.html";
  const activeFromPage = items.find((item) => item.href === pageName)?.id || "accueil";

  document.querySelectorAll("[data-main-nav]").forEach((mount) => {
    const active = mount.dataset.active || activeFromPage;
    const nav = document.createElement("nav");
    nav.className = "main-tabs";
    nav.setAttribute("aria-label", "Navigation principale");

    const inner = document.createElement("div");
    inner.className = "main-tabs-inner";

    items.forEach((item) => {
      const link = document.createElement("a");
      link.className = "main-tab";
      link.href = item.href;
      link.textContent = item.label;

      if (item.id === active) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }

      inner.append(link);
    });

    nav.append(inner);
    mount.replaceChildren(nav);
    mount.dataset.navigationReady = "true";
  });
})();
