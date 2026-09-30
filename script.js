/**
 * ============================================================================
 * LAVINIA EXPLORER - FRONTEND APPLICATION & ADMIN PORTAL LOGIC (script.js)
 * ============================================================================
 * Specifications Implemented:
 * 1. Base Coordinates & BSR-01 : Mount Lavinia (6.8398° N, 79.8656° E), <= 25.00 km
 * 2. Backend PHP Integration   : Connects to api/get_places.php, api/admin_login.php,
 *                                api/create_place.php, api/update_place.php, api/delete_place.php
 *                                (with automatic local fallback if DB is offline)
 * 3. Destination Filtering     : Instant category pills & time-of-day filtering (FR-CAT)
 * 4. Interactive Map (FR-MAP)  : Leaflet.js custom pins, popups, 25km ring & route line
 * 5. Itinerary Planner (FR-PLN): Add/remove, reorder, auto-optimize, cumulative Haversine
 *                                distance calculation, and printer-friendly export view
 * 6. Admin Portal (FR-ADM)     : Login, 30-minute inactivity timeout tracker, live BSR-01
 *                                coordinate check, FR-VAL-02 image validation, & full CRUD
 * ============================================================================
 */

"use strict";

/* --------------------------------------------------------------------------
   1. BASE CONFIGURATION & CONSTANTS
   -------------------------------------------------------------------------- */
const MOUNT_LAVINIA_CENTER = {
  name: "Mount Lavinia Hub",
  lat: 6.8398,
  lng: 79.8656,
  maxRadiusKm: 25.0
};


const SESSION_TIMEOUT_SECONDS = 1800; // 30 minutes inactivity timeout
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (FR-VAL-02)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const CATEGORY_CONFIG = {
  "Nature & Wildlife": {
    badgeClass: "bg-cat-nature",
    icon: "bi-tree-fill",
    hex: "#0D6832"
  },
  "Heritage & History": {
    badgeClass: "bg-cat-heritage",
    icon: "bi-bank2",
    hex: "#853A00"
  },
  "Religious & Cultural": {
    badgeClass: "bg-cat-religious",
    icon: "bi-peace-fill",
    hex: "#5B21B6"
  },
  "Leisure & Dining": {
    badgeClass: "bg-cat-leisure",
    icon: "bi-cup-hot-fill",
    hex: "#035388"
  },
  "Conservation": {
    badgeClass: "bg-cat-conservation",
    icon: "bi-shield-fill-check",
    hex: "#0F5156"
  }
};

/* --------------------------------------------------------------------------
   2. SEED POI DATASET (Matches schema.sql for seamless fallback if DB offline)
   -------------------------------------------------------------------------- */
const INITIAL_POIS = [
  {
    id: 1,
    title: "Mount Lavinia Golden Mile Beach",
    category: "Leisure & Dining",
    time_suitability: "Morning, Evening/Night",
    description:
      "Famous golden sandy shoreline stretching along Mount Lavinia, renowned for calm morning swims, vibrant beachside seafood restaurants, and panoramic Indian Ocean sunsets.",
    opening_hours: "Open 24 Hours (Lifeguards: 7:00 AM – 6:00 PM)",
    travel_tips:
      "Best visited for calm morning swims or iconic Indian Ocean sunsets followed by fresh seafood along the shore.",
    latitude: 6.8332,
    longitude: 79.8617,
    image_url: null
  },
  {
    id: 2,
    title: "Governor's Mansion (Mount Lavinia Hotel Heritage Wing)",
    category: "Heritage & History",
    time_suitability: "Morning, Afternoon, Evening/Night",
    description:
      "Constructed in 1806 as the coastal residence of British Governor Sir Thomas Maitland, famous for its neoclassical colonial architecture and historic romance with Lovina Aponsuwa.",
    opening_hours: "Daily: 9:00 AM – 10:00 PM",
    travel_tips:
      "Built in 1806 by Sir Thomas Maitland. Ask the concierge about the historic secret tunnel and Governor's terrace.",
    latitude: 6.8328,
    longitude: 79.8613,
    image_url: null
  },
  {
    id: 3,
    title: "Dehiwala National Zoological Gardens",
    category: "Nature & Wildlife",
    time_suitability: "Morning, Afternoon",
    description:
      "One of Asia's oldest zoological gardens featuring landscaped botanical shaded pathways, a dedicated butterfly garden, nocturnal house, and diverse wildlife conservation exhibits.",
    opening_hours: "Daily: 8:30 AM – 6:00 PM",
    travel_tips:
      "Arrive before 9:30 AM to beat the midday heat. Wear comfortable walking shoes and carry refillable water bottles.",
    latitude: 6.8568,
    longitude: 79.8744,
    image_url: null
  },
  {
    id: 4,
    title: "Bellanwila Rajamaha Viharaya",
    category: "Religious & Cultural",
    time_suitability: "Morning, Evening/Night",
    description:
      "Historic Buddhist temple housing one of the thirty-two sacred saplings (Detis Phala Ruka) of the Jaya Sri Maha Bodhi in Anuradhapura and intricate modern temple murals.",
    opening_hours: "Daily: 6:00 AM – 9:00 PM",
    travel_tips:
      "Dress modestly in white or light-colored clothing covering shoulders and knees. Evening oil-lamp pooja is serene.",
    latitude: 6.8465,
    longitude: 79.8904,
    image_url: null
  },
  {
    id: 5,
    title: "Attidiya Bird Sanctuary & Wetland Trail",
    category: "Conservation",
    time_suitability: "Morning, Afternoon",
    description:
      "Protected lowland marsh and freshwater mangrove sanctuary supporting over 150 species of resident and migratory waterbirds, endemic fish, and wetland flora.",
    opening_hours: "Daily: 6:00 AM – 6:00 PM",
    travel_tips:
      "Bring binoculars for spotting migratory kingfishers, purple herons, and endemic wetland flora between 6:30 AM and 9:00 AM.",
    latitude: 6.8419,
    longitude: 79.8856,
    image_url: null
  },
  {
    id: 6,
    title: "Sri Lanka Air Force Museum (Ratmalana)",
    category: "Heritage & History",
    time_suitability: "Morning, Afternoon",
    description:
      "Premier aviation museum located at the historic Ratmalana Air Base, showcasing restored vintage aircraft, helicopters, radar equipment, and Sri Lankan aviation history.",
    opening_hours: "Tue – Sun: 8:30 AM – 4:30 PM (Closed Mondays)",
    travel_tips:
      "Bring valid photo ID (NIC or Passport) for entry at the airbase gate. Features restored vintage aircraft and hangars.",
    latitude: 6.8206,
    longitude: 79.8861,
    image_url: null
  },
  {
    id: 7,
    title: "Mount Lavinia Sea Turtle Conservation Station",
    category: "Conservation",
    time_suitability: "Morning, Evening/Night",
    description:
      "Community-led coastal marine hatchery protecting endangered Green, Olive Ridley, and Leatherback sea turtle nests and rehabilitating injured turtles.",
    opening_hours: "Daily: 8:30 AM – 6:30 PM",
    travel_tips:
      "Learn about Olive Ridley and Green Turtle hatchery protection along the southern coast. Flash photography is prohibited.",
    latitude: 6.8275,
    longitude: 79.8622,
    image_url: null
  },
  {
    id: 8,
    title: "Bellanwila-Attidiya Walking & Cycling Park",
    category: "Leisure & Dining",
    time_suitability: "Morning, Evening/Night",
    description:
      "Scenic 3-kilometer waterside recreation promenade bordered by lush wetlands, outdoor fitness stations, cycle rentals, and traditional Sri Lankan street food stalls.",
    opening_hours: "Daily: 5:00 AM – 9:00 PM",
    travel_tips:
      "Paved 3 km waterside loop with local herbal porridge (Kola Kanda) stalls in the morning and street food in the evening.",
    latitude: 6.8489,
    longitude: 79.8938,
    image_url: null
  },
  {
    id: 9,
    title: "Bolgoda Lake Eco Mangrove Sanctuary (North Bank)",
    category: "Nature & Wildlife",
    time_suitability: "Morning, Afternoon",
    description:
      "Sri Lanka's largest natural freshwater lake system spanning scenic estuaries, mangrove islands, water monitor habitats, and tranquil eco-kayaking routes.",
    opening_hours: "Daily: 6:30 AM – 6:00 PM",
    travel_tips:
      "Sri Lanka's largest natural freshwater lake system. Book a morning kayak or eco-boat tour to explore mangrove channels.",
    latitude: 6.7865,
    longitude: 79.9032,
    image_url: null
  },
  {
    id: 10,
    title: "Kotte Rajamaha Viharaya & Archaeological Ruins",
    category: "Religious & Cultural",
    time_suitability: "Morning, Afternoon, Evening/Night",
    description:
      "Ancient royal temple and archaeological complex from the 15th-century Kingdom of Sri Jayawardenepura Kotte, featuring historic laterite (Kabok) tunnels and sacred relics.",
    opening_hours: "Daily: 6:00 AM – 8:30 PM",
    travel_tips:
      "Dates back to the 15th-century Kingdom of Kotte. Inspect the ancient laterite (Kabok) tunnels and Dalada Maligawa ruins.",
    latitude: 6.8884,
    longitude: 79.9041,
    image_url: null
  },
  {
    id: 11,
    title: "Beddagana Wetland Park (Biodiversity Zone)",
    category: "Conservation",
    time_suitability: "Morning, Afternoon",
    description:
      "RAMSAR-accredited urban wetland park adjacent to the Diyawanna Oya, offering elevated timber boardwalks, birdwatching towers, and urban fishing cat habitats.",
    opening_hours: "Daily: 6:00 AM – 6:00 PM",
    travel_tips:
      "Elevated wooden boardwalks over urban marshes. Ideal for butterfly watching, fishing cat conservation talks, and nature photography.",
    latitude: 6.8914,
    longitude: 79.9096,
    image_url: null
  },
  {
    id: 12,
    title: "Colombo National Museum (Cinnamon Gardens)",
    category: "Heritage & History",
    time_suitability: "Morning, Afternoon",
    description:
      "Sri Lanka's largest cultural and historical museum, founded in 1877 by Sir William Henry Gregory, housing the royal throne and regalia of the last King of Kandy.",
    opening_hours: "Tue – Sun: 9:00 AM – 5:00 PM (Closed Mondays)",
    travel_tips:
      "Established in 1877. Houses the regalia of the Kandyan Monarchs and ancient stone inscriptions. Allow at least 90 minutes.",
    latitude: 6.9106,
    longitude: 79.8609,
    image_url: null
  }
];

/* --------------------------------------------------------------------------
   3. APPLICATION STATE
   -------------------------------------------------------------------------- */
const appState = {
  pois: [],
  activeCategory: "All",
  activeTime: "All",
  searchQuery: "",
  sortBy: "distance-asc",
  itineraryIds: [],
  showRadiusRing: true,
  backendConnected: false,
  admin: {
    authenticated: false,
    username: null,
    lastActivityMs: 0,
    timerInterval: null
  }
};

// Leaflet Map References
let mapInstance = null;
let markerLayerGroup = null;
let radiusCircle = null;
let itineraryPolyline = null;
const markerLookup = new Map();

/* --------------------------------------------------------------------------
   4. MATHEMATICAL & NORMALIZATION UTILITIES
   -------------------------------------------------------------------------- */

/**
 * Calculates the straight-line (great-circle) distance between two coordinates
 * using the Haversine formula (BSR-01).
 */
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Normalizes a POI object coming from either MySQL (`api/get_places.php`) or fallback seed data.
 */
function normalizePoiRecord(raw) {
  const lat = Number(raw.latitude ?? raw.lat ?? MOUNT_LAVINIA_CENTER.lat);
  const lng = Number(raw.longitude ?? raw.lng ?? MOUNT_LAVINIA_CENTER.lng);
  const computedDist = calculateHaversineKm(
    MOUNT_LAVINIA_CENTER.lat,
    MOUNT_LAVINIA_CENTER.lng,
    lat,
    lng
  );
  const distanceKm = Number(raw.distance_km ?? raw.distanceFromHubKm ?? computedDist);

  let bestTimeArr = [];
  if (Array.isArray(raw.bestTime)) {
    bestTimeArr = raw.bestTime;
  } else if (typeof raw.time_suitability === "string") {
    bestTimeArr = raw.time_suitability
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const timeSuitabilityStr =
    raw.time_suitability || bestTimeArr.join(", ") || "Morning, Afternoon";

  return {
    id: Number(raw.id),
    title: String(raw.title || ""),
    category: String(raw.category || "Leisure & Dining"),
    time_suitability: timeSuitabilityStr,
    bestTime: bestTimeArr,
    description: String(
      raw.description ||
        raw.travel_tips ||
        raw.travelTips ||
        "Verified attraction within the 25 km Mount Lavinia explorer zone."
    ),
    opening_hours: String(raw.opening_hours || raw.operatingHours || "Daily: 8:00 AM – 6:00 PM"),
    operatingHours: String(raw.opening_hours || raw.operatingHours || "Daily: 8:00 AM – 6:00 PM"),
    travel_tips: String(raw.travel_tips || raw.travelTips || ""),
    travelTips: String(raw.travel_tips || raw.travelTips || ""),
    distance_km: distanceKm,
    distanceFromHubKm: distanceKm,
    latitude: lat,
    lat: lat,
    longitude: lng,
    lng: lng,
    image_url: raw.image_url || raw.imageUrl || null,
    imageUrl: raw.image_url || raw.imageUrl || null
  };
}

/**
 * Escapes HTML special characters to prevent XSS when rendering dynamic content.
 */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates a high-contrast SVG placeholder thumbnail when no custom photo is uploaded.
 */
function generateThumbnailPlaceholder(poi) {
  if (poi.imageUrl) {
    return poi.imageUrl;
  }

  const catMeta = CATEGORY_CONFIG[poi.category] || { hex: "#0F172A" };
  const safeLabel = escapeHtml(
    poi.title.length > 34 ? poi.title.slice(0, 32) + "..." : poi.title
  );
  const safeCoords = `${poi.lat.toFixed(4)}° N, ${poi.lng.toFixed(4)}° E`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
      <defs>
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.12"/>
        </pattern>
      </defs>
      <rect width="600" height="360" fill="${catMeta.hex}"/>
      <rect width="600" height="360" fill="url(#grid)"/>
      <circle cx="520" cy="70" r="95" fill="#FFFFFF" fill-opacity="0.08"/>
      <circle cx="80" cy="310" r="120" fill="#000000" fill-opacity="0.16"/>
      <rect x="24" y="20" width="205" height="32" rx="6" fill="#090D16" fill-opacity="0.8"/>
      <text x="36" y="41" fill="#FFBA08" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700">
        ${safeCoords}
      </text>
      <text x="26" y="190" fill="#FFFFFF" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="23" font-weight="800">
        ${safeLabel}
      </text>
      <text x="26" y="222" fill="#E2E8F0" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="600">
        ${escapeHtml(poi.category)} • Mount Lavinia 25 km Guide
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* --------------------------------------------------------------------------
   5. INITIALIZATION & BACKEND DATA FETCHING
   -------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  const dateInput = document.getElementById("tripDateInput");
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  loadItineraryFromStorage();
  initLeafletMap();
  bindEventListeners();

  await fetchPlacesFromBackend();
  await checkAdminSessionStatus();
  renderAll();
}

/**
 * Fetches POIs from `api/get_places.php` with automatic fallback to local seed data
 * if running without PHP/MySQL.
 */
async function fetchPlacesFromBackend() {
  try {
    const response = await fetch("api/get_places.php", {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const rawList = Array.isArray(data) ? data : data.places;

    if (Array.isArray(rawList) && rawList.length > 0) {
      appState.pois = rawList.map(normalizePoiRecord);
      appState.backendConnected = true;
      saveLocalPoisBackup(appState.pois);
      return;
    }
  } catch (err) {
    // Graceful fallback when running outside Apache/MySQL
    appState.backendConnected = false;
  }

  const cachedPois = loadLocalPoisBackup();
  appState.pois = (cachedPois || INITIAL_POIS).map(normalizePoiRecord);
}

/* --------------------------------------------------------------------------
   6. LEAFLET.JS INTERACTIVE MAP (FR-MAP)
   -------------------------------------------------------------------------- */
function initLeafletMap() {
  const mapEl = document.getElementById("laviniaMap");
  if (!mapEl || typeof L === "undefined") return;

  mapInstance = L.map("laviniaMap", {
    center: [MOUNT_LAVINIA_CENTER.lat, MOUNT_LAVINIA_CENTER.lng],
    zoom: 12,
    scrollWheelZoom: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapInstance);

  // 25 km Radius Boundary Ring (BSR-01)
  radiusCircle = L.circle([MOUNT_LAVINIA_CENTER.lat, MOUNT_LAVINIA_CENTER.lng], {
    radius: MOUNT_LAVINIA_CENTER.maxRadiusKm * 1000,
    color: "#0047B3",
    weight: 2.5,
    dashArray: "8, 6",
    fillColor: "#0047B3",
    fillOpacity: 0.04
  }).addTo(mapInstance);

  // Mount Lavinia Reference Hub Pin (0.0 km)
  const hubIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div class="hc-map-pin bg-cat-hub" title="Mount Lavinia Center Hub"><i class="bi bi-tsunami"></i></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });

  L.marker([MOUNT_LAVINIA_CENTER.lat, MOUNT_LAVINIA_CENTER.lng], {
    icon: hubIcon,
    zIndexOffset: 1000
  })
    .addTo(mapInstance)
    .bindPopup(`
      <div class="hc-popup">
        <span class="badge bg-cat-hub mb-1">0.0 km Center Point</span>
        <h6 class="fw-bold mb-1">${escapeHtml(MOUNT_LAVINIA_CENTER.name)}</h6>
        <p class="small mb-0">Coordinates: 6.8398° N, 79.8656° E<br/>All BSR-01 25 km radius checks &amp; day-trip routes originate here.</p>
      </div>
    `);

  markerLayerGroup = L.layerGroup().addTo(mapInstance);
}

function renderMapMarkers(filteredPois) {
  if (!mapInstance || !markerLayerGroup) return;

  markerLayerGroup.clearLayers();
  markerLookup.clear();

  filteredPois.forEach((poi) => {
    const catMeta = CATEGORY_CONFIG[poi.category] || {
      badgeClass: "bg-dark",
      icon: "bi-geo-alt-fill"
    };
    const isAdded = appState.itineraryIds.includes(poi.id);

    const customPin = L.divIcon({
      className: "custom-div-icon",
      html: `
        <div class="hc-map-pin ${catMeta.badgeClass}">
          <i class="bi ${catMeta.icon}"></i>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34]
    });

    const popupHtml = `
      <div style="min-width: 230px;">
        <div class="d-flex justify-content-between align-items-center gap-1 mb-1">
          <span class="badge ${catMeta.badgeClass}">${escapeHtml(poi.category)}</span>
          <span class="badge bg-dark">${poi.distanceFromHubKm} km</span>
        </div>
        <h6 class="fw-bold mb-1">${escapeHtml(poi.title)}</h6>
        <p class="small mb-1">${escapeHtml(poi.description)}</p>
        <div class="small mb-1"><strong>Hours:</strong> ${escapeHtml(poi.operatingHours)}</div>
        <div class="small mb-2 text-secondary"><strong>Tip:</strong> ${escapeHtml(poi.travelTips)}</div>
        <button
          type="button"
          class="btn btn-sm w-100 ${isAdded ? "btn-hc-success" : "btn-hc-primary"} popup-itinerary-btn"
          onclick="window.toggleItineraryStop(${poi.id})"
        >
          <i class="bi ${isAdded ? "bi-check2-circle" : "bi-plus-circle-fill"} me-1"></i>
          ${isAdded ? "Added to Day Plan (Remove)" : "Add to Day Plan"}
        </button>
      </div>
    `;

    const marker = L.marker([poi.lat, poi.lng], { icon: customPin }).bindPopup(popupHtml);
    marker.addTo(markerLayerGroup);
    markerLookup.set(poi.id, marker);
  });

  renderItineraryRouteLine();
}

function renderItineraryRouteLine() {
  if (!mapInstance) return;

  if (itineraryPolyline) {
    mapInstance.removeLayer(itineraryPolyline);
    itineraryPolyline = null;
  }

  if (appState.itineraryIds.length === 0) return;

  const routeCoordinates = [
    [MOUNT_LAVINIA_CENTER.lat, MOUNT_LAVINIA_CENTER.lng]
  ];

  appState.itineraryIds.forEach((id) => {
    const poi = appState.pois.find((p) => p.id === id);
    if (poi) {
      routeCoordinates.push([poi.lat, poi.lng]);
    }
  });

  itineraryPolyline = L.polyline(routeCoordinates, {
    color: "#090D16",
    weight: 3.5,
    dashArray: "6, 8",
    opacity: 0.85
  }).addTo(mapInstance);
}

window.focusPoiOnMap = function (poiId) {
  const poi = appState.pois.find((p) => p.id === poiId);
  if (!poi || !mapInstance) return;

  document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
  mapInstance.setView([poi.lat, poi.lng], 14, { animate: true });

  const marker = markerLookup.get(poiId);
  if (marker) {
    marker.openPopup();
  }
};

/* --------------------------------------------------------------------------
   7. FILTERING, SORTING & PLACE CARDS RENDERER (FR-CAT)
   -------------------------------------------------------------------------- */
function getFilteredAndSortedPois() {
  const query = appState.searchQuery.trim().toLowerCase();

  const filtered = appState.pois.filter((poi) => {
    // 1. Enforce BSR-01 25 km radius constraint
    if (poi.distanceFromHubKm > MOUNT_LAVINIA_CENTER.maxRadiusKm) {
      return false;
    }

    // 2. Category Pill Filter
    const matchesCategory =
      appState.activeCategory === "All" || poi.category === appState.activeCategory;

    // 3. Time-of-Day Suitability Filter
    const matchesTime =
      appState.activeTime === "All" || poi.bestTime.includes(appState.activeTime);

    // 4. Keyword Search Filter
    const matchesQuery =
      query === "" ||
      poi.title.toLowerCase().includes(query) ||
      poi.category.toLowerCase().includes(query) ||
      poi.description.toLowerCase().includes(query) ||
      poi.travelTips.toLowerCase().includes(query);

    return matchesCategory && matchesTime && matchesQuery;
  });

  filtered.sort((a, b) => {
    if (appState.sortBy === "distance-asc") {
      return a.distanceFromHubKm - b.distanceFromHubKm;
    }
    if (appState.sortBy === "distance-desc") {
      return b.distanceFromHubKm - a.distanceFromHubKm;
    }
    if (appState.sortBy === "name-asc") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return filtered;
}

function renderPoiCards(filteredPois) {
  const gridEl = document.getElementById("poiGridContainer");
  const emptyEl = document.getElementById("emptyStateContainer");
  const summaryEl = document.getElementById("resultsSummaryText");
  const totalStatEl = document.getElementById("statTotalPois");

  if (totalStatEl) {
    totalStatEl.textContent = appState.pois.length;
  }

  if (summaryEl) {
    summaryEl.textContent = `Showing ${filteredPois.length} of ${appState.pois.length} verified destinations within 25 km of Mount Lavinia`;
  }

  if (!gridEl) return;

  if (filteredPois.length === 0) {
    gridEl.innerHTML = "";
    emptyEl?.classList.remove("d-none");
    return;
  }

  emptyEl?.classList.add("d-none");

  gridEl.innerHTML = filteredPois
    .map((poi) => {
      const catMeta = CATEGORY_CONFIG[poi.category] || {
        badgeClass: "bg-dark",
        icon: "bi-geo-alt-fill"
      };
      const isInItinerary = appState.itineraryIds.includes(poi.id);
      const stopNumber = appState.itineraryIds.indexOf(poi.id) + 1;
      const thumbSrc = generateThumbnailPlaceholder(poi);

      const timeBadgesHtml = poi.bestTime
        .map(
          (t) =>
            `<span class="badge bg-light text-dark border border-dark me-1">${escapeHtml(t)}</span>`
        )
        .join("");

      return `
        <div class="col-12 col-md-6 col-xl-4">
          <article class="poi-card" aria-label="${escapeHtml(poi.title)}">
            <!-- Thumbnail + Category & Straight-Line Distance Badges -->
            <div class="poi-thumbnail-wrapper">
              <img
                src="${thumbSrc}"
                alt="${escapeHtml(poi.title)} thumbnail"
                class="poi-thumbnail-img"
                loading="lazy"
              />
              <span class="poi-distance-pill" title="Straight-line Haversine distance from Mount Lavinia">
                <i class="bi bi-signpost-split-fill me-1 text-warning"></i>${poi.distanceFromHubKm} km
              </span>
              <span class="poi-category-badge ${catMeta.badgeClass}">
                <i class="bi ${catMeta.icon} me-1"></i>${escapeHtml(poi.category)}
              </span>
            </div>

            <!-- Card Body -->
            <div class="poi-card-body">
              <h3 class="h5 fw-extrabold mb-2">${escapeHtml(poi.title)}</h3>
              <p class="small hc-muted mb-2">${escapeHtml(poi.description)}</p>

              <!-- Opening Hours & Time Suitability -->
              <div class="poi-meta-box">
                <div class="mb-1">
                  <i class="bi bi-clock-fill me-1 text-primary-hc"></i>
                  <strong>Hours:</strong> ${escapeHtml(poi.operatingHours)}
                </div>
                <div>
                  <i class="bi bi-sun-fill me-1 text-warning"></i>
                  <strong>Best Time:</strong> ${timeBadgesHtml}
                </div>
              </div>

              <!-- Visitor Travel Tips -->
              <div class="poi-tip-box flex-grow-1">
                <strong><i class="bi bi-lightbulb-fill me-1"></i>Travel Tip:</strong>
                ${escapeHtml(poi.travelTips)}
              </div>

              <!-- Card Footer Buttons -->
              <div class="d-flex gap-2 mt-auto">
                <button
                  type="button"
                  class="btn ${isInItinerary ? "btn-hc-success" : "btn-hc-primary"} flex-grow-1"
                  onclick="window.toggleItineraryStop(${poi.id})"
                >
                  <i class="bi ${isInItinerary ? "bi-check-circle-fill" : "bi-plus-circle-fill"} me-1"></i>
                  ${isInItinerary ? `In Plan (Stop #${stopNumber})` : "Add to Day Plan"}
                </button>
                <button
                  type="button"
                  class="btn btn-hc-outline"
                  onclick="window.focusPoiOnMap(${poi.id})"
                  title="Locate on Interactive Map"
                  aria-label="Locate ${escapeHtml(poi.title)} on Map"
                >
                  <i class="bi bi-geo-alt-fill"></i>
                </button>
              </div>
            </div>
          </article>
        </div>
      `;
    })
    .join("");
}

/* --------------------------------------------------------------------------
   8. DAY-TRIP ITINERARY PLANNER & PRINT EXPORT (FR-PLN)
   -------------------------------------------------------------------------- */
window.toggleItineraryStop = function (poiId) {
  const existingIdx = appState.itineraryIds.indexOf(poiId);
  if (existingIdx > -1) {
    appState.itineraryIds.splice(existingIdx, 1);
  } else {
    appState.itineraryIds.push(poiId);
  }

  saveItineraryToStorage();
  renderAll();
};

window.moveItineraryStop = function (index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= appState.itineraryIds.length) return;

  const temp = appState.itineraryIds[index];
  appState.itineraryIds[index] = appState.itineraryIds[targetIndex];
  appState.itineraryIds[targetIndex] = temp;

  saveItineraryToStorage();
  renderAll();
};

window.removeItineraryStopAtIndex = function (index) {
  appState.itineraryIds.splice(index, 1);
  saveItineraryToStorage();
  renderAll();
};

function autoOrderItineraryNearest() {
  if (appState.itineraryIds.length <= 1) return;

  const remaining = appState.itineraryIds
    .map((id) => appState.pois.find((p) => p.id === id))
    .filter(Boolean);

  const orderedIds = [];
  let currentLat = MOUNT_LAVINIA_CENTER.lat;
  let currentLng = MOUNT_LAVINIA_CENTER.lng;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDist = Infinity;

    remaining.forEach((poi, idx) => {
      const dist = calculateHaversineKm(currentLat, currentLng, poi.lat, poi.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = idx;
      }
    });

    const chosen = remaining.splice(nearestIndex, 1)[0];
    orderedIds.push(chosen.id);
    currentLat = chosen.lat;
    currentLng = chosen.lng;
  }

  appState.itineraryIds = orderedIds;
  saveItineraryToStorage();
  renderAll();
}

function renderItineraryPlanner() {
  const listContainer = document.getElementById("itineraryListContainer");
  const stopCountEl = document.getElementById("itineraryStopCount");
  const totalDistEl = document.getElementById("itineraryTotalDistance");
  const estTimeEl = document.getElementById("itineraryEstTime");
  const statPlannedEl = document.getElementById("statPlannedStops");

  const printBtn = document.getElementById("printItineraryBtn");
  const optimizeBtn = document.getElementById("optimizeRouteBtn");
  const clearBtn = document.getElementById("clearItineraryBtn");

  const validPois = appState.itineraryIds
    .map((id) => appState.pois.find((p) => p.id === id))
    .filter(Boolean);

  document.querySelectorAll(".itinerary-count-badge").forEach((badge) => {
    badge.textContent = validPois.length;
  });

  if (statPlannedEl) {
    statPlannedEl.textContent = validPois.length;
  }

  let prevLat = MOUNT_LAVINIA_CENTER.lat;
  let prevLng = MOUNT_LAVINIA_CENTER.lng;
  let prevLabel = "Mount Lavinia Hub";
  let cumulativeKm = 0;

  const stopsWithLegData = validPois.map((poi, idx) => {
    const legKm = calculateHaversineKm(prevLat, prevLng, poi.lat, poi.lng);
    cumulativeKm += legKm;
    const legInfo = {
      stopNumber: idx + 1,
      poi,
      fromLabel: prevLabel,
      legKm: Number(legKm.toFixed(2)),
      cumulativeKm: Number(cumulativeKm.toFixed(2))
    };
    prevLat = poi.lat;
    prevLng = poi.lng;
    prevLabel = poi.title;
    return legInfo;
  });

  const estimatedMinutes = Math.round(cumulativeKm * 2.5);

  if (stopCountEl) stopCountEl.textContent = stopsWithLegData.length;
  if (totalDistEl) totalDistEl.textContent = cumulativeKm.toFixed(2);
  if (estTimeEl) estTimeEl.textContent = estimatedMinutes;

  const hasStops = stopsWithLegData.length > 0;
  if (printBtn) printBtn.disabled = !hasStops;
  if (optimizeBtn) optimizeBtn.disabled = stopsWithLegData.length < 2;
  if (clearBtn) clearBtn.disabled = !hasStops;

  if (listContainer) {
    if (!hasStops) {
      listContainer.innerHTML = `
        <div class="hc-empty-state text-center p-4 rounded-3 my-2">
          <i class="bi bi-journal-plus display-5 d-block mb-2"></i>
          <h3 class="h6 fw-bold">Your Day Plan is Empty</h3>
          <p class="small hc-muted mb-0">
            Click <strong>"Add to Day Plan"</strong> on any destination card or map marker to start building your custom sequence of stops.
          </p>
        </div>
      `;
    } else {
      listContainer.innerHTML = stopsWithLegData
        .map((item, idx) => {
          const { stopNumber, poi, fromLabel, legKm } = item;
          const catMeta = CATEGORY_CONFIG[poi.category] || { badgeClass: "bg-dark" };

          return `
            <div class="itinerary-stop-card">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div class="d-flex align-items-center gap-2">
                  <span class="stop-index-badge">${stopNumber}</span>
                  <div>
                    <h4 class="h6 fw-bold mb-0">${escapeHtml(poi.title)}</h4>
                    <span class="badge ${catMeta.badgeClass} small">${escapeHtml(poi.category)}</span>
                  </div>
                </div>
                <div class="btn-group btn-group-sm" role="group" aria-label="Reorder or remove stop">
                  <button
                    type="button"
                    class="btn btn-hc-outline"
                    onclick="window.moveItineraryStop(${idx}, -1)"
                    ${idx === 0 ? "disabled" : ""}
                    title="Move Up"
                  >
                    <i class="bi bi-arrow-up"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-hc-outline"
                    onclick="window.moveItineraryStop(${idx}, 1)"
                    ${idx === stopsWithLegData.length - 1 ? "disabled" : ""}
                    title="Move Down"
                  >
                    <i class="bi bi-arrow-down"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-hc-danger"
                    onclick="window.removeItineraryStopAtIndex(${idx})"
                    title="Remove Stop"
                  >
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>

              <div class="d-flex flex-wrap justify-content-between align-items-center gap-1 pt-2 border-top border-secondary-subtle small">
                <span class="leg-distance-tag">
                  <i class="bi bi-signpost-2-fill me-1"></i>+${legKm} km from ${escapeHtml(fromLabel)}
                </span>
                <span class="hc-muted">
                  <i class="bi bi-clock me-1"></i>${escapeHtml(poi.operatingHours)}
                </span>
              </div>
            </div>
          `;
        })
        .join("");
    }
  }

  populatePrintableItinerary(stopsWithLegData, cumulativeKm, estimatedMinutes);
}

function populatePrintableItinerary(stopsWithLegData, cumulativeKm, estimatedMinutes) {
  const titleInput = document.getElementById("tripTitleInput");
  const dateInput = document.getElementById("tripDateInput");

  const printTitleEl = document.getElementById("printTripTitle");
  const printDateEl = document.getElementById("printTripDate");
  const printStopCountEl = document.getElementById("printStopCount");
  const printTotalDistEl = document.getElementById("printTotalDistance");
  const printEstTimeEl = document.getElementById("printEstTime");
  const printTableBody = document.getElementById("printItineraryTableBody");

  if (printTitleEl && titleInput) {
    printTitleEl.textContent = titleInput.value.trim() || "My Mount Lavinia Day Trip";
  }
  if (printDateEl && dateInput) {
    printDateEl.textContent = dateInput.value || new Date().toLocaleDateString();
  }
  if (printStopCountEl) printStopCountEl.textContent = stopsWithLegData.length;
  if (printTotalDistEl) printTotalDistEl.textContent = cumulativeKm.toFixed(2);
  if (printEstTimeEl) printEstTimeEl.textContent = estimatedMinutes;

  if (printTableBody) {
    printTableBody.innerHTML = stopsWithLegData
      .map(
        ({ stopNumber, poi, fromLabel, legKm, cumulativeKm: cumKm }) => `
        <tr>
          <td class="fw-bold text-center">${stopNumber}</td>
          <td>
            <div class="fw-bold">${escapeHtml(poi.title)}</div>
            <div class="small">Category: ${escapeHtml(poi.category)}</div>
            <div class="small">Best Time: ${escapeHtml(poi.bestTime.join(", "))}</div>
          </td>
          <td>${escapeHtml(poi.operatingHours)}</td>
          <td>
            <div><strong>+${legKm} km</strong> (from ${escapeHtml(fromLabel)})</div>
            <div class="small">Cumulative: ${cumKm} km</div>
          </td>
          <td>
            <div class="mb-1">${escapeHtml(poi.description)}</div>
            <div class="small"><strong>Tip:</strong> ${escapeHtml(poi.travelTips)}</div>
          </td>
        </tr>
      `
      )
      .join("");
  }
}

/* --------------------------------------------------------------------------
   9. ADMIN MANAGEMENT PORTAL (FR-ADM, BSR-01, FR-VAL-02, 30-MIN SESSION)
   -------------------------------------------------------------------------- */
async function checkAdminSessionStatus() {
  try {
    const res = await fetch("api/admin_login.php?action=status", {
      headers: { Accept: "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        setAdminAuthenticated(true, data.username || "admin");
        return;
      }
    }
  } catch (e) {
    // Check local fallback session
    const savedSession = sessionStorage.getItem("lavinia_admin_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (Date.now() - parsed.lastActivityMs < SESSION_TIMEOUT_SECONDS * 1000) {
          setAdminAuthenticated(true, parsed.username || "admin");
          return;
        }
      } catch (_) {
        // Ignore invalid JSON
      }
    }
  }
  setAdminAuthenticated(false, null);
}

function setAdminAuthenticated(isAuth, username) {
  appState.admin.authenticated = isAuth;
  appState.admin.username = username;
  appState.admin.lastActivityMs = isAuth ? Date.now() : 0;

  const navBtnText = document.getElementById("navAdminBtnText");
  const navBtn = document.getElementById("navAdminPortalBtn");
  const sessionUserEl = document.getElementById("adminSessionUser");

  if (navBtnText) {
    navBtnText.textContent = isAuth ? "Admin Dashboard" : "Admin Login";
  }
  if (navBtn) {
    navBtn.classList.toggle("btn-hc-primary", isAuth);
    navBtn.classList.toggle("btn-hc-outline", !isAuth);
  }
  if (sessionUserEl && username) {
    sessionUserEl.textContent = username;
  }

  if (appState.admin.timerInterval) {
    clearInterval(appState.admin.timerInterval);
    appState.admin.timerInterval = null;
  }

  if (isAuth) {
    sessionStorage.setItem(
      "lavinia_admin_session",
      JSON.stringify({ username, lastActivityMs: appState.admin.lastActivityMs })
    );
    appState.admin.timerInterval = setInterval(updateAdminSessionTimer, 1000);
    updateAdminSessionTimer();
    renderAdminPoiTable();
  } else {
    sessionStorage.removeItem("lavinia_admin_session");
  }
}

function refreshAdminActivity() {
  if (!appState.admin.authenticated) return;
  appState.admin.lastActivityMs = Date.now();
  sessionStorage.setItem(
    "lavinia_admin_session",
    JSON.stringify({
      username: appState.admin.username,
      lastActivityMs: appState.admin.lastActivityMs
    })
  );
}

function updateAdminSessionTimer() {
  const timerEl = document.getElementById("adminSessionTimer");
  if (!appState.admin.authenticated) return;

  const elapsedSeconds = Math.floor((Date.now() - appState.admin.lastActivityMs) / 1000);
  const remaining = Math.max(0, SESSION_TIMEOUT_SECONDS - elapsedSeconds);

  if (remaining <= 0) {
    handleAdminLogout(true);
    return;
  }

  if (timerEl) {
    const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
    const secs = String(remaining % 60).padStart(2, "0");
    timerEl.textContent = `${mins}:${secs}`;
  }
}

async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");
  const feedbackEl = document.getElementById("adminLoginFeedback");

  const username = usernameInput?.value.trim() || "";
  const password = passwordInput?.value || "";

  try {
    const res = await fetch("api/admin_login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && (data.success || data.status === "success")) {
      completeAdminLoginSuccess(data.username || username);
      return;
    } else {
      showLoginFeedback(data.message || "Invalid administrator credentials.", true);
      return;
    }
  } catch (err) {
    // Fallback verification when running without Apache/MySQL server
    if (username === "admin" && password === "Admin@123") {
      completeAdminLoginSuccess("admin");
    } else {
      showLoginFeedback(
        "Invalid credentials. Default login is Username: admin | Password: Admin@123",
        true
      );
    }
  }
}

function completeAdminLoginSuccess(username) {
  setAdminAuthenticated(true, username);
  const loginEl = document.getElementById("adminLoginModal");
  const dashEl = document.getElementById("adminDashboardModal");
  if (loginEl && typeof bootstrap !== "undefined") {
    bootstrap.Modal.getOrCreateInstance(loginEl).hide();
  }
  if (dashEl && typeof bootstrap !== "undefined") {
    bootstrap.Modal.getOrCreateInstance(dashEl).show();
  }
}

function showLoginFeedback(msg, isError) {
  const feedbackEl = document.getElementById("adminLoginFeedback");
  if (!feedbackEl) return;
  feedbackEl.classList.remove("d-none", "text-danger", "text-success", "border-danger", "border-success");
  feedbackEl.classList.add(
    isError ? "text-danger" : "text-success",
    isError ? "border-danger" : "border-success"
  );
  feedbackEl.textContent = msg;
}

async function handleAdminLogout(expired = false) {
  try {
    await fetch("api/admin_login.php?action=logout", { method: "POST" });
  } catch (_) {
    // Ignore offline error
  }
  setAdminAuthenticated(false, null);

  const dashEl = document.getElementById("adminDashboardModal");
  if (dashEl && typeof bootstrap !== "undefined") {
    bootstrap.Modal.getOrCreateInstance(dashEl).hide();
  }

  if (expired) {
    const loginEl = document.getElementById("adminLoginModal");
    if (loginEl && typeof bootstrap !== "undefined") {
      bootstrap.Modal.getOrCreateInstance(loginEl).show();
    }
    showLoginFeedback(
      "Your session expired due to 30 minutes of inactivity. Please sign in again.",
      true
    );
  }
}

function showAdminCrudAlert(msg, isError = false) {
  const alertEl = document.getElementById("adminCrudAlert");
  if (!alertEl) return;
  alertEl.classList.remove("d-none", "alert-danger", "alert-success");
  alertEl.classList.add(isError ? "alert-danger" : "alert-success");
  alertEl.innerHTML = `<i class="bi ${
    isError ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill"
  } me-1"></i>${escapeHtml(msg)}`;
}

/**
 * Live BSR-01 Coordinate Distance Validator inside Admin Form
 */
function updateLiveBsrBadge() {
  const latVal = parseFloat(document.getElementById("poiLat")?.value);
  const lngVal = parseFloat(document.getElementById("poiLng")?.value);
  const badgeEl = document.getElementById("bsrValidationBadge");
  if (!badgeEl) return;

  if (Number.isNaN(latVal) || Number.isNaN(lngVal)) {
    badgeEl.className = "p-2 rounded border border-dark small fw-bold mb-2 bg-light";
    badgeEl.innerHTML =
      '<i class="bi bi-geo-fill me-1"></i>BSR-01 Distance Check: Enter coordinates to verify &le; 25.00 km from Mount Lavinia.';
    return;
  }

  const distKm = calculateHaversineKm(
    MOUNT_LAVINIA_CENTER.lat,
    MOUNT_LAVINIA_CENTER.lng,
    latVal,
    lngVal
  );

  if (distKm <= MOUNT_LAVINIA_CENTER.maxRadiusKm) {
    badgeEl.className = "p-2 rounded border border-success small fw-bold mb-2 bg-success-subtle text-success-emphasis";
    badgeEl.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>BSR-01 Passed: <strong>${distKm.toFixed(
      2
    )} km</strong> from Mount Lavinia (within 25.00 km limit).`;
  } else {
    badgeEl.className = "p-2 rounded border border-danger small fw-bold mb-2 bg-danger-subtle text-danger-emphasis";
    badgeEl.innerHTML = `<i class="bi bi-x-octagon-fill me-1"></i>BSR-01 Violation: <strong>${distKm.toFixed(
      2
    )} km</strong> exceeds the strict 25.00 km Mount Lavinia boundary!`;
  }
}

function renderAdminPoiTable() {
  const tbody = document.getElementById("adminPoiTableBody");
  const countEl = document.getElementById("adminTotalPoiCount");
  if (countEl) countEl.textContent = appState.pois.length;
  if (!tbody) return;

  tbody.innerHTML = appState.pois
    .map((poi) => {
      const catMeta = CATEGORY_CONFIG[poi.category] || { badgeClass: "bg-dark" };
      return `
        <tr>
          <td>
            <div class="fw-bold small">${escapeHtml(poi.title)}</div>
            <span class="badge ${catMeta.badgeClass}" style="font-size: 0.7rem;">${escapeHtml(
              poi.category
            )}</span>
          </td>
          <td class="small">${escapeHtml(poi.time_suitability)}</td>
          <td class="small fw-bold">${poi.distanceFromHubKm.toFixed(2)} km</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button
                type="button"
                class="btn btn-hc-outline"
                onclick="window.startEditPoi(${poi.id})"
                title="Edit POI"
              >
                <i class="bi bi-pencil-fill"></i>
              </button>
              <button
                type="button"
                class="btn btn-hc-danger"
                onclick="window.deletePoiRecord(${poi.id})"
                title="Delete POI"
              >
                <i class="bi bi-trash-fill"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

window.startEditPoi = function (poiId) {
  refreshAdminActivity();
  const poi = appState.pois.find((p) => p.id === poiId);
  if (!poi) return;

  document.getElementById("poiFormId").value = poi.id;
  document.getElementById("poiTitle").value = poi.title;
  document.getElementById("poiCategory").value = poi.category;
  document.getElementById("poiOpeningHours").value = poi.opening_hours;
  document.getElementById("poiLat").value = poi.latitude;
  document.getElementById("poiLng").value = poi.longitude;
  document.getElementById("poiDescription").value = poi.description;
  document.getElementById("poiTravelTips").value = poi.travel_tips;

  document.querySelectorAll(".poi-time-check").forEach((chk) => {
    chk.checked = poi.bestTime.includes(chk.value);
  });

  document.getElementById("adminFormHeading").innerHTML =
    '<i class="bi bi-pencil-square me-1 text-primary-hc"></i>Edit Point of Interest';
  document.getElementById("adminCancelEditBtn")?.classList.remove("d-none");
  updateLiveBsrBadge();
};

function resetAdminPoiForm() {
  const form = document.getElementById("adminPoiForm");
  if (form) form.reset();
  document.getElementById("poiFormId").value = "";
  document.getElementById("adminFormHeading").innerHTML =
    '<i class="bi bi-plus-circle-fill me-1 text-primary-hc"></i>Add New Point of Interest';
  document.getElementById("adminCancelEditBtn")?.classList.add("d-none");
  updateLiveBsrBadge();
}

async function handleAdminPoiFormSubmit(e) {
  e.preventDefault();
  refreshAdminActivity();

  const editId = parseInt(document.getElementById("poiFormId")?.value || "", 10);
  const title = document.getElementById("poiTitle")?.value.trim() || "";
  const category = document.getElementById("poiCategory")?.value || "";
  const openingHours = document.getElementById("poiOpeningHours")?.value.trim() || "";
  const lat = parseFloat(document.getElementById("poiLat")?.value || "");
  const lng = parseFloat(document.getElementById("poiLng")?.value || "");
  const description = document.getElementById("poiDescription")?.value.trim() || "";
  const travelTips = document.getElementById("poiTravelTips")?.value.trim() || "";
  const imageInput = document.getElementById("poiImageFile");

  const selectedTimes = Array.from(document.querySelectorAll(".poi-time-check:checked")).map(
    (c) => c.value
  );

  if (selectedTimes.length === 0) {
    showAdminCrudAlert("Please select at least one Time Suitability option.", true);
    return;
  }

  // BSR-01 Validation: Must be <= 25.00 km of Mount Lavinia
  const distanceKm = calculateHaversineKm(
    MOUNT_LAVINIA_CENTER.lat,
    MOUNT_LAVINIA_CENTER.lng,
    lat,
    lng
  );
  if (Number.isNaN(distanceKm) || distanceKm > MOUNT_LAVINIA_CENTER.maxRadiusKm) {
    showAdminCrudAlert(
      `BSR-01 Violation: Coordinates are ${distanceKm.toFixed(
        2
      )} km from Mount Lavinia, exceeding the strict 25.00 km boundary.`,
      true
    );
    return;
  }

  // FR-VAL-02 Image Validation: Max 5MB, .jpg/.png/.webp
  const file = imageInput?.files?.[0] || null;
  if (file) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showAdminCrudAlert("FR-VAL-02 Violation: Image exceeds maximum size of 5MB.", true);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showAdminCrudAlert(
        "FR-VAL-02 Violation: Invalid image type. Only .jpg, .png, and .webp are allowed.",
        true
      );
      return;
    }
  }

  const timeSuitabilityStr = selectedTimes.join(", ");
  const endpoint = editId ? "api/update_place.php" : "api/create_place.php";

  const formData = new FormData();
  if (editId) formData.append("id", String(editId));
  formData.append("title", title);
  formData.append("category", category);
  formData.append("time_suitability", timeSuitabilityStr);
  formData.append("opening_hours", openingHours);
  formData.append("latitude", String(lat));
  formData.append("longitude", String(lng));
  formData.append("description", description);
  formData.append("travel_tips", travelTips);
  if (file) formData.append("image", file);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (res.ok && (data.success || data.status === "success")) {
      await fetchPlacesFromBackend();
      renderAll();
      renderAdminPoiTable();
      resetAdminPoiForm();
      showAdminCrudAlert(data.message || "Point of Interest saved to MySQL database.");
      return;
    } else if (data.code === "BSR-01" || data.code === "FR-VAL-02") {
      showAdminCrudAlert(data.message, true);
      return;
    }
  } catch (_) {
    // Fallback local CRUD when running without Apache/MySQL
  }

  // Local state update when running without live MySQL connection
  if (editId) {
    const idx = appState.pois.findIndex((p) => p.id === editId);
    if (idx > -1) {
      appState.pois[idx] = normalizePoiRecord({
        ...appState.pois[idx],
        title,
        category,
        time_suitability: timeSuitabilityStr,
        opening_hours: openingHours,
        latitude: lat,
        longitude: lng,
        distance_km: distanceKm,
        description,
        travel_tips: travelTips
      });
    }
    showAdminCrudAlert(`Updated "${title}" (${distanceKm.toFixed(2)} km from Mount Lavinia).`);
  } else {
    const nextId =
      appState.pois.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    appState.pois.push(
      normalizePoiRecord({
        id: nextId,
        title,
        category,
        time_suitability: timeSuitabilityStr,
        opening_hours: openingHours,
        latitude: lat,
        longitude: lng,
        distance_km: distanceKm,
        description,
        travel_tips: travelTips,
        image_url: null
      })
    );
    showAdminCrudAlert(`Created "${title}" (${distanceKm.toFixed(2)} km from Mount Lavinia).`);
  }

  saveLocalPoisBackup(appState.pois);
  renderAll();
  renderAdminPoiTable();
  resetAdminPoiForm();
}

window.deletePoiRecord = async function (poiId) {
  refreshAdminActivity();
  const target = appState.pois.find((p) => p.id === poiId);
  if (!target) return;

  try {
    const res = await fetch("api/delete_place.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: poiId })
    });
    const data = await res.json();
    if (res.ok && (data.success || data.status === "success")) {
      await fetchPlacesFromBackend();
    } else {
      appState.pois = appState.pois.filter((p) => p.id !== poiId);
    }
  } catch (_) {
    appState.pois = appState.pois.filter((p) => p.id !== poiId);
  }

  appState.itineraryIds = appState.itineraryIds.filter((id) => id !== poiId);
  saveItineraryToStorage();
  saveLocalPoisBackup(appState.pois);
  renderAll();
  renderAdminPoiTable();
  showAdminCrudAlert(`Deleted "${target.title}" from the catalog.`);
};

/* --------------------------------------------------------------------------
   10. LOCALSTORAGE PERSISTENCE
   -------------------------------------------------------------------------- */
const STORAGE_KEY_ITINERARY = "lavinia_explorer_itinerary_v1";
const STORAGE_KEY_POIS = "lavinia_explorer_pois_backup_v1";

function saveItineraryToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_ITINERARY, JSON.stringify(appState.itineraryIds));
  } catch (_) {}
}

function loadItineraryFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITINERARY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        appState.itineraryIds = parsed.map(Number);
      }
    }
  } catch (_) {
    appState.itineraryIds = [];
  }
}

function saveLocalPoisBackup(pois) {
  try {
    localStorage.setItem(STORAGE_KEY_POIS, JSON.stringify(pois));
  } catch (_) {}
}

function loadLocalPoisBackup() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POIS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return null;
}

/* --------------------------------------------------------------------------
   11. MASTER RENDER & EVENT LISTENERS
   -------------------------------------------------------------------------- */
function renderAll() {
  const filteredPois = getFilteredAndSortedPois();
  renderPoiCards(filteredPois);
  renderMapMarkers(filteredPois);
  renderItineraryPlanner();
}

function resetAllFilters() {
  appState.activeCategory = "All";
  appState.activeTime = "All";
  appState.searchQuery = "";
  appState.sortBy = "distance-asc";

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) sortSelect.value = "distance-asc";

  const timeAllRadio = document.getElementById("timeAll");
  if (timeAllRadio) timeAllRadio.checked = true;

  document.querySelectorAll("#categoryPillsContainer .hc-category-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === "All");
  });

  renderAll();
}

function bindEventListeners() {
  // Category Filter Pills
  const categoryContainer = document.getElementById("categoryPillsContainer");
  if (categoryContainer) {
    categoryContainer.addEventListener("click", (e) => {
      const pill = e.target.closest(".hc-category-pill");
      if (!pill) return;

      document
        .querySelectorAll("#categoryPillsContainer .hc-category-pill")
        .forEach((btn) => btn.classList.remove("active"));
      pill.classList.add("active");

      appState.activeCategory = pill.dataset.category || "All";
      renderAll();
    });
  }

  // Time-of-Day Filter Radios
  document.querySelectorAll('input[name="timeFilter"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      appState.activeTime = e.target.value;
      renderAll();
    });
  });

  // Search Input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      appState.searchQuery = e.target.value;
      renderAll();
    });
  }

  // Clear Search Button
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      appState.searchQuery = "";
      renderAll();
    });
  }

  // Sort Dropdown
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      appState.sortBy = e.target.value;
      renderAll();
    });
  }

  // Reset Filter Buttons
  document.getElementById("resetFiltersBtn")?.addEventListener("click", resetAllFilters);
  document.getElementById("emptyResetBtn")?.addEventListener("click", resetAllFilters);

  // Map Controls: Recenter & Toggle 25km Ring
  document.getElementById("recenterMapBtn")?.addEventListener("click", () => {
    if (mapInstance) {
      mapInstance.setView([MOUNT_LAVINIA_CENTER.lat, MOUNT_LAVINIA_CENTER.lng], 12, {
        animate: true
      });
    }
  });

  document.getElementById("toggleRadiusBtn")?.addEventListener("click", () => {
    if (!mapInstance || !radiusCircle) return;
    appState.showRadiusRing = !appState.showRadiusRing;
    if (appState.showRadiusRing) {
      radiusCircle.addTo(mapInstance);
    } else {
      mapInstance.removeLayer(radiusCircle);
    }
  });

  // Itinerary Actions
  document.getElementById("printItineraryBtn")?.addEventListener("click", () => {
    renderItineraryPlanner();
    window.print();
  });

  document
    .getElementById("optimizeRouteBtn")
    ?.addEventListener("click", autoOrderItineraryNearest);

  document.getElementById("clearItineraryBtn")?.addEventListener("click", () => {
    appState.itineraryIds = [];
    saveItineraryToStorage();
    renderAll();
  });

  document.getElementById("tripTitleInput")?.addEventListener("input", renderItineraryPlanner);
  document.getElementById("tripDateInput")?.addEventListener("change", renderItineraryPlanner);

  // Admin Portal Navigation Button
  document.getElementById("navAdminPortalBtn")?.addEventListener("click", () => {
    if (appState.admin.authenticated) {
      refreshAdminActivity();
      renderAdminPoiTable();
      const dashEl = document.getElementById("adminDashboardModal");
      if (dashEl && typeof bootstrap !== "undefined") {
        bootstrap.Modal.getOrCreateInstance(dashEl).show();
      }
    } else {
      const loginEl = document.getElementById("adminLoginModal");
      if (loginEl && typeof bootstrap !== "undefined") {
        bootstrap.Modal.getOrCreateInstance(loginEl).show();
      }
    }
  });

  // Admin Login Form & Logout
  document
    .getElementById("adminLoginForm")
    ?.addEventListener("submit", handleAdminLoginSubmit);
  document
    .getElementById("adminLogoutBtn")
    ?.addEventListener("click", () => handleAdminLogout(false));

  // Admin POI CRUD Form & Live BSR-01 Coordinate Distance Check
  document
    .getElementById("adminPoiForm")
    ?.addEventListener("submit", handleAdminPoiFormSubmit);
  document
    .getElementById("adminCancelEditBtn")
    ?.addEventListener("click", resetAdminPoiForm);
  document.getElementById("poiLat")?.addEventListener("input", updateLiveBsrBadge);
  document.getElementById("poiLng")?.addEventListener("input", updateLiveBsrBadge);
}
