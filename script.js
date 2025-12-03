// ===== Data =====

var BUS_STOPS = [
    "Arriba St x Regents",
    "1st Ave x G St",
    "Broadway x 1st Ave",
    "Front St x B St",
    "5th Ave x Market St",
    "Park Blvd x University Ave",
    "University Ave x Park Blvd",
    "University Ave x Normal St",
    "University Ave x Richmond St",
    "University Ave x Vermont St",
    "University Ave x Herbert St",
    "30th St x Adams Ave",
    "SDSU Transit Center",
    "College Ave x Montezuma Rd",
    "Pearl St x La Jolla Blvd",
    "Christmas Circle x Palm Canyon Rd",
    "Escondido Transit Center",
    "Rancho Bernardo Transit Station",
    "Del Lago Transit Station",
    "El Cajon Blvd x College Ave"
  ];
  
  // Extra info for cards / popup
  var ROUTE_INFO = {
    "Home to Campus": {
      temperature: "68°F – clear skies",
      intermediateStops: ["Mid-City Transit Hub", "University Ave x Park Blvd"],
      notes: "Typical weekday morning pattern.",
      duration: "Approx. 18 minutes"
    },
    "Campus to UTC": {
      temperature: "70°F – mild",
      intermediateStops: ["El Cajon Blvd x College Ave", "Pearl St x La Jolla Blvd"],
      notes: "Popular afternoon shuttle.",
      duration: "Approx. 22 minutes"
    },
    "Downtown Shuttle": {
      temperature: "72°F – breezy",
      intermediateStops: ["5th Ave x Market St"],
      notes: "Runs every 15 minutes at peak.",
      duration: "Approx. 25 minutes"
    }
  };
  
  var STORAGE_KEY = "smartstopSavedRoutes";
  
  // ===== State =====
  
  /**
   * { name: string, from: string, to: string, isDefault: boolean }
   */
  var savedRoutes = [];
  var pendingRoute = null; // used when “Route Found!” is waiting to be saved
  
  // ===== DOM references =====
  
  var savedTripsContainer = document.getElementById("savedTripsContainer");
  var routeForm = document.getElementById("routeForm");
  var routeNameInput = document.getElementById("routeName");
  var fromInput = document.getElementById("fromStop");
  var toInput = document.getElementById("toStop");
  var stopsList = document.getElementById("stopsList");
  
  // Sidebar
  var menuToggle = document.getElementById("menuToggle");
  var sidebar = document.getElementById("sidebar");
  var closeSidebarBtn = document.getElementById("closeSidebar");
  var backdrop = document.getElementById("backdrop");
  
  // Modal
  var modalOverlay = document.getElementById("modalOverlay");
  var modal = document.getElementById("routeModal");
  var modalTitle = document.getElementById("routeModalTitle");
  var modalBody = document.getElementById("routeModalBody");
  var modalSaveBtn = document.getElementById("modalSaveBtn");
  var modalCloseBtn = document.getElementById("modalCloseBtn");
  
  // ===== Helpers =====
  
  function populateStopsList() {
    while (stopsList.firstChild) {
      stopsList.removeChild(stopsList.firstChild);
    }
    BUS_STOPS.forEach(function (stop) {
      var opt = document.createElement("option");
      opt.value = stop;
      stopsList.appendChild(opt);
    });
  }
  
  function loadRoutesFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Could not read routes from storage:", e);
    }
    return null;
  }
  
  function saveRoutesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoutes));
    } catch (e) {
      console.warn("Could not save routes:", e);
    }
  }
  
  function initSavedRoutes() {
    var stored = loadRoutesFromStorage();
  
    if (stored && Array.isArray(stored) && stored.length > 0) {
      // Use whatever is in storage
      savedRoutes = stored;
    } else {
      // Seed defaults (no “default route” badge, but still isDefault: true)
      savedRoutes = [
        {
          name: "Home to Campus",
          from: "Arriba St x Regents",
          to: "SDSU Transit Center",
          isDefault: true
        },
        {
          name: "Campus to UTC",
          from: "College Ave x Montezuma Rd",
          to: "El Cajon Blvd x College Ave",
          isDefault: true
        },
        {
          name: "Downtown Shuttle",
          from: "Broadway x 1st Ave",
          to: "Front St x B St",
          isDefault: true
        }
      ];
      saveRoutesToStorage();
    }
  }
  
  function isValidStop(stopName) {
    return BUS_STOPS.indexOf(stopName) !== -1;
  }
  
  function getRouteDetails(route) {
    var info = ROUTE_INFO[route.name];
    if (!info) {
      info = {
        temperature: "70°F – sample data",
        intermediateStops: ["Sample midpoint stop"],
        notes: "Prototype route information (not real-time).",
        duration: "Approx. 20 minutes"
      };
    }
    return info;
  }
  
  function buildRouteDetailsHTML(route, info) {
    var stopsText = info.intermediateStops.join(", ");
  
    var html = "";
    html +=
      '<p><span class="modal__label">From:</span> ' +
      route.from +
      "</p>";
    html +=
      '<p><span class="modal__label">To:</span> ' +
      route.to +
      "</p>";
    html +=
      '<p><span class="modal__label">Temperature:</span> ' +
      info.temperature +
      "</p>";
    html +=
      '<p><span class="modal__label">Intermediate stops:</span> ' +
      stopsText +
      "</p>";
    html +=
      '<p><span class="modal__label">Estimated duration:</span> ' +
      info.duration +
      "</p>";
    html += "<p>" + info.notes + "</p>";
  
    return html;
  }
  
  // ===== Rendering =====
  
  function createTripCard(route, index) {
    var card = document.createElement("article");
    card.className = "trip-card";
  
    // header row: name + red X
    var headerRow = document.createElement("div");
    headerRow.className = "trip-card__header";
  
    var nameEl = document.createElement("h3");
    nameEl.className = "trip-card__name";
    nameEl.textContent = route.name;
  
    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "trip-card__delete";
    deleteBtn.textContent = "×";
  
    deleteBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      removeRoute(index);
    });
  
    headerRow.appendChild(nameEl);
    headerRow.appendChild(deleteBtn);
  
    var pathEl = document.createElement("p");
    pathEl.className = "trip-card__path";
    pathEl.textContent = route.from + " → " + route.to;
  
    var meta = document.createElement("div");
    meta.className = "trip-card__meta";
  
    // Only show badge for custom (non-default) routes
    if (!route.isDefault) {
      var badge = document.createElement("span");
      badge.className = "trip-card__badge";
      badge.textContent = "Custom route";
      meta.appendChild(badge);
    }
  
    card.appendChild(headerRow);
    card.appendChild(pathEl);
    if (meta.childNodes.length > 0) {
      card.appendChild(meta);
    }
  
    // Clicking anywhere on card (except X) opens details modal
    card.addEventListener("click", function () {
      openModalForSavedRoute(route);
    });
  
    return card;
  }
  
  function renderSavedTrips() {
    while (savedTripsContainer.firstChild) {
      savedTripsContainer.removeChild(savedTripsContainer.firstChild);
    }
  
    if (savedRoutes.length === 0) {
      var placeholder = document.createElement("p");
      placeholder.className = "saved-trips__placeholder";
      placeholder.textContent =
        "Create a new route to add to your Saved Trips!";
      savedTripsContainer.appendChild(placeholder);
      return;
    }
  
    savedRoutes.forEach(function (route, index) {
      var card = createTripCard(route, index);
      savedTripsContainer.appendChild(card);
    });
  }
  
  // ===== Modal =====
  
  function openModal() {
    modalOverlay.hidden = false;
    modal.classList.add("modal--open");
    modal.setAttribute("aria-hidden", "false");
  }
  
  function closeModal() {
    modalOverlay.hidden = true;
    modal.classList.remove("modal--open");
    modal.setAttribute("aria-hidden", "true");
    pendingRoute = null;
  }
  
  function openModalForNewRoute(route) {
    var info = getRouteDetails(route);
    modalTitle.textContent = "Route Found!";
    modalBody.innerHTML = buildRouteDetailsHTML(route, info);
    modalSaveBtn.style.display = "inline-block";
    pendingRoute = route;
    openModal();
  }
  
  function openModalForSavedRoute(route) {
    var info = getRouteDetails(route);
    modalTitle.textContent = "Route Details";
    modalBody.innerHTML = buildRouteDetailsHTML(route, info);
    modalSaveBtn.style.display = "none";
    openModal();
  }
  
  // ===== Actions =====
  
  function handleFormSubmit(event) {
    event.preventDefault();
  
    var name = routeNameInput.value.trim();
    var from = fromInput.value.trim();
    var to = toInput.value.trim();
  
    if (!name || !from || !to) {
      alert("All fields required");
      return;
    }
  
    if (!isValidStop(from) || !isValidStop(to)) {
      alert(
        "One or more stops are not recognized.\nPlease choose stops from the suggestion list."
      );
      return;
    }
  
    var newRoute = {
      name: name,
      from: from,
      to: to,
      isDefault: false
    };
  
    openModalForNewRoute(newRoute);
  }
  
  function removeRoute(index) {
    savedRoutes.splice(index, 1);
    saveRoutesToStorage();
    renderSavedTrips();
  }
  
  // ===== Sidebar =====
  
  function openSidebar() {
    sidebar.classList.add("sidebar--open");
    sidebar.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
  }
  
  function closeSidebar() {
    sidebar.classList.remove("sidebar--open");
    sidebar.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
  }
  
  // ===== Event wiring =====
  
  routeForm.addEventListener("submit", handleFormSubmit);
  
  menuToggle.addEventListener("click", function () {
    openSidebar();
  });
  
  closeSidebarBtn.addEventListener("click", function () {
    closeSidebar();
  });
  
  backdrop.addEventListener("click", function () {
    closeSidebar();
  });
  
  // Modal events
  modalCloseBtn.addEventListener("click", function () {
    closeModal();
  });
  
  modalOverlay.addEventListener("click", function () {
    closeModal();
  });
  
  modalSaveBtn.addEventListener("click", function () {
    if (pendingRoute) {
      savedRoutes.push(pendingRoute);
      saveRoutesToStorage();
      renderSavedTrips();
    }
    closeModal();
  });
  
  // ===== Init (script is deferred, DOM ready) =====
  
  populateStopsList();
  initSavedRoutes();
  renderSavedTrips();
  
  
  