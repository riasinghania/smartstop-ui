// Data

var BUS_STOPS = [ // These are common bus stops in SD 
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
  
  // The route cards that automatically come up when you load the page 
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
  
  var STORAGE_KEY = "smartstopSavedRoutes"; // Allows us to save and load data from local storage. is the name of the box in localStorage where your app saves route data.
  
  // State 
  
  /** The breakdown of the Save Route Feature:
   * { name: string, from: string, to: string, isDefault: boolean }
   */
  var savedRoutes = [];
  var pendingRoute = null; // used when “Route Found!” is waiting to be saved
  
  // DOM references - aka finding an element in HTML, saving reference to it in this var, using it later. 
  
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
  
  // Helpers
  
  // Fills the datalist with all available bus stops.
  // First clears any existing options, then creates and appends one <option> per stop.
  function populateStopsList() {
    while (stopsList.firstChild) {
      stopsList.removeChild(stopsList.firstChild);
    }
    BUS_STOPS.forEach(function (stop) {
      var opt = document.createElement("option");
      opt.value = stop;
      stopsList.appendChild(opt); //appendChild creates the list effect in the dropdown
    });
  }
  // Loads saved routes from localStorage. Parses the stored JSON and returns
  // an array if valid; otherwise returns null if nothing is saved or an error occurs.
  function loadRoutesFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY); //second string from localStorage
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed; //double checking if the parsed JSON input is really an array 
    } catch (error) {
      console.warn("Could not read routes from storage:", error);
    }
    return null;
  }
  
  // Saves the current routes array to localStorage. Converts the data to JSON
  // before storing. If saving fails (e.g., storage full), logs a warning instead of crashing.
  function saveRoutesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRoutes)); // // Convert the routes array to JSON and store it under the SmartStop key
    } catch (error) {
      console.warn("Could not save routes:", error);
    }
  }
  
  // Initializes the savedRoutes array. If routes exist in localStorage, use them;
  // otherwise load the three default routes and save them to storage.
  function initSavedRoutes() {
    var stored = loadRoutesFromStorage();
  
    if (stored && Array.isArray(stored) && stored.length > 0) {
      // Use whatever is in storage
      savedRoutes = stored;
    } else {
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
  
  //checking if the bus stop name is valid/in the list
  function isValidStop(stopName) {
    return BUS_STOPS.indexOf(stopName) !== -1;
  }
  
  // Returns detailed info for a given route. If the route has no predefined data,
  // a fallback sample info object is used instead.
  function getRouteDetails(route) {
    var info = ROUTE_INFO[route.name]; //looking at the route details and using the name as the key
    if (!info) { //if there are no details we are going to use this sample data  
      info = {
        temperature: "70°F – sample data",
        intermediateStops: ["Sample midpoint stop"],
        notes: "Prototype route information (not real-time).",
        duration: "Approx. 20 minutes"
      };
    }
    return info;
  }
  
  // Builds the HTML string that goes inside the route details modal. 
  // Takes a route and its info object, formats each field, and returns
  function buildRouteDetailsHTML(route, info) {
    var stopsText = info.intermediateStops.join(", "); //converting the array of intermediate stops into a comma-string 
    //building the HTML:
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
    html += "<p>" + info.notes + "</p>"; //finding the value stored in the notes field
  
    return html;
  }
  
  // Rendering

  // Creates a visual "trip card" element for a saved route.
  // Builds the card structure (title, delete button, path, badge) using DOM methods,
  // attaches click behaviors (delete or open modal), and returns a complete element.
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
  
      // Prevent card click from triggering (delete only)
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
    // Append meta section only if it has children (a badge)
    if (meta.childNodes.length > 0) {
      card.appendChild(meta);
    }
  
    // Clicking anywhere on card (except X) opens details modal
    card.addEventListener("click", function () {
      openModalForSavedRoute(route);
    });
  
    return card;
  }
  
  // Renders all saved trip cards into the Saved Trips panel.
  // Clears old content, shows a placeholder if no trips exist, or creates
  // a card for each saved route and appends it to the container.
  function renderSavedTrips() {
    while (savedTripsContainer.firstChild) {
      savedTripsContainer.removeChild(savedTripsContainer.firstChild);
    }
    
    if (savedRoutes.length === 0) { //scenario of no saved routes
      var placeholder = document.createElement("p");
      placeholder.className = "saved-trips__placeholder";
      placeholder.textContent =
        "Create a new route to add to your Saved Trips!";
      savedTripsContainer.appendChild(placeholder);
      return;
    }
  
    savedRoutes.forEach(function (route, index) { //otherwise, using helper functions we are adding the saved routes
      var card = createTripCard(route, index);
      savedTripsContainer.appendChild(card);
    });
  }
  
  // Modal
  
  // This function makes the modal appear on the screen and updates 
  // accessibility properties to indicate it is open.
  function openModal() {
    modalOverlay.hidden = false;
    modal.classList.add("modal--open"); //referring to the open state in CSS
    modal.setAttribute("aria-hidden", "false");
  }
  
  // This function makes the modal disappear on the screen and updates 
  // accessibility properties to indicate it is closed.
  function closeModal() {
    modalOverlay.hidden = true;
    modal.classList.remove("modal--open");
    modal.setAttribute("aria-hidden", "true");
    pendingRoute = null;
  }
  
  // Prepares and opens the modal for a newly found route (before saving).
  // Fills in the modal title, details, shows the Save button, stores the route
  // temporarily, and then opens the modal.
  function openModalForNewRoute(route) {
    var info = getRouteDetails(route);
    modalTitle.textContent = "Route Found!"; // Update the modal's title to reflect a new route being found
    modalBody.innerHTML = buildRouteDetailsHTML(route, info);
    modalSaveBtn.style.display = "inline-block"; // Show the Save button (used only for new routes)
    pendingRoute = route; // Store this route temporarily so the Save button knows what to save
    openModal();
  }
  
  // Opens the modal for an already-saved route. Fills in the details,
  // hides the Save button and displays the modal.
  function openModalForSavedRoute(route) {
    var info = getRouteDetails(route);
    modalTitle.textContent = "Route Details";
    modalBody.innerHTML = buildRouteDetailsHTML(route, info);
    modalSaveBtn.style.display = "none"; //route is already saved we do not need to save again
    openModal();
  }
  
  // Actions
  
  // Handles the Save Route form submission. Validates user input, checks that
  // both stops are valid, builds a new route object, and opens the modal to show details.
  function handleFormSubmit(event) {
    event.preventDefault(); //prevents the form from reloading the whole page
  
    var name = routeNameInput.value.trim();
    var from = fromInput.value.trim();
    var to = toInput.value.trim();
  
    if (!name || !from || !to) { //ensuring all fields are filled in
      alert("All fields required");
      return;
    }
  
    if (!isValidStop(from) || !isValidStop(to)) { //checking if both stops are in the list/valid
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
  
    openModalForNewRoute(newRoute); //show the details modal for the new route
  }
  
  // Removes a route from the savedRoutes array using its index,
  // updates localStorage, and re-renders the Saved Trips panel.
  function removeRoute(index) {
    savedRoutes.splice(index, 1);
    saveRoutesToStorage();
    renderSavedTrips();
  }
  
  // Sidebar 
  
  function openSidebar() {
    sidebar.classList.add("sidebar--open");
    sidebar.setAttribute("aria-hidden", "false");
    backdrop.hidden = false; //showing the overlay 
  }
  
  function closeSidebar() {
    sidebar.classList.remove("sidebar--open");
    sidebar.setAttribute("aria-hidden", "true");
    backdrop.hidden = true; //hiding the overlay 
  }
  
  // Event Writing 
  
  // When the form is submitted, run our handler instead of refreshing the page
  routeForm.addEventListener("submit", handleFormSubmit);
  
  // Clicking the hamburger icon opens the sidebar menu
  menuToggle.addEventListener("click", function () {
    openSidebar();
  });
  
  // Clicking the X button inside the sidebar closes it
  closeSidebarBtn.addEventListener("click", function () {
    closeSidebar();
  });
  
  // Clicking the dark backdrop also closes the sidebar (common UI behavior)
  backdrop.addEventListener("click", function () {
    closeSidebar();
  });
  
  // Modal events
  // Close button inside the modal closes the modal popup
  modalCloseBtn.addEventListener("click", function () {
    closeModal();
  });
  
  // Clicking outside the modal (on the overlay) also closes it
  modalOverlay.addEventListener("click", function () {
    closeModal();
  });
  
  // Clicking "Save route" stores the new route and updates the Saved Trips list
  modalSaveBtn.addEventListener("click", function () {
    if (pendingRoute) {
      savedRoutes.push(pendingRoute);
      saveRoutesToStorage();
      renderSavedTrips();
    }
    closeModal();
  });
  
  // Run the setup steps the moment the page is ready.
  populateStopsList();
  initSavedRoutes();
  renderSavedTrips();
  
  /* I used ChatGPT Model 5's assistance and the following prompts:
    * Provide a list of common bus stops in the San Diego area: from La Jolla, to SDSD, to the city maybe?
    * How do I store the data a user puts into the Save Route form in local storage?
    * “I need a JavaScript function that takes a route object and a routeInfo object and returns an HTML string showing the route details 
    * (from, to, temperature, intermediate stops, duration, notes). Build the HTML using <p> elements and labels.”?
    * What is the basic structure for functions that are responsible for opening up modal cards. For pre-saved routes, for the act of saving a route?
    * How do I remove a route from localStorage and the Saved Routes column?
    * I have several helper functions in my JS file (populateStopsList, initSavedRoutes, renderSavedTrips). 
    * Where should I call these in my script so the page initializes correctly, and why?
    * How do I account for if the application cannot read something from Local Storage? Can you show me how this would look in a function.
  */ 
  