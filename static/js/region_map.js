/* ==========================================================================
   Omi AI — Study region map (Leaflet)
   Shows a world map with the supported study regions (from /api/regions).
   Clicking a region selects it in the investigation form; the popup can run
   the analysis directly. Each region also shows the NASA POWER / MERRA-2
   grid cell (0.5° x 0.625°) its data comes from.
   ========================================================================== */

(function () {
  'use strict';

  var COLORS = { lagos: '#168C83', edo: '#C2410C' };
  // Lagos lies west of Edo, so its label goes on the left to avoid overlap.
  var LABEL_LEFT = { lagos: true };
  var NIGERIA_BOUNDS = [[4.0, 2.6], [13.9, 14.7]];
  var STUDY_BOUNDS = [[5.6, 2.4], [7.6, 6.9]];
  var CELL_HALF_LAT = 0.25;     // MERRA-2 grid: 0.5° latitude
  var CELL_HALF_LON = 0.3125;   // 0.625° longitude

  var TILES = {
    light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };
  var ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

  var map = null;
  var tileLayer = null;
  var regions = {};
  var layers = {};
  var selected = [];
  var listeners = [];

  function esc(v) {
    return window.OmiUI ? window.OmiUI.escapeHtml(v) : String(v);
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setTiles() {
    if (!map) return;
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(TILES[currentTheme()], {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 12,
      minZoom: 2
    }).addTo(map);
  }

  function pinIcon(region, isSelected) {
    var color = COLORS[region.id] || '#168C83';
    return L.divIcon({
      className: 'omi-pin-wrap',
      html:
        '<div class="omi-pin' + (isSelected ? ' is-selected' : '') + (LABEL_LEFT[region.id] ? ' is-label-left' : '') + '" style="--pin:' + color + '">' +
          '<span class="omi-pin-dot"></span>' +
          '<span class="omi-pin-label">' + esc(region.name) + '</span>' +
        '</div>',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  }

  function popupHtml(region) {
    return '<div class="omi-popup">' +
      '<strong>' + esc(region.name) + '</strong>' +
      '<div class="omi-popup-meta">' + esc(region.description || '') + '</div>' +
      '<div class="omi-popup-meta">' + region.latitude.toFixed(4) + '° N, ' + region.longitude.toFixed(4) + '° E</div>' +
      '<div class="omi-popup-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" data-map-analyse="' + esc(region.id) + '">Analyse ' + esc(region.name) + '</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-map-analyse="both">Compare both</button>' +
      '</div>' +
    '</div>';
  }

  function refreshStyles() {
    Object.keys(layers).forEach(function (id) {
      var isSel = selected.indexOf(id) !== -1;
      layers[id].marker.setIcon(pinIcon(regions[id], isSel));
      layers[id].cell.setStyle({
        weight: isSel ? 2.5 : 1.5,
        fillOpacity: isSel ? 0.28 : 0.12
      });
    });
  }

  function notify(regionKey, origin) {
    listeners.forEach(function (fn) {
      try { fn(regionKey, origin); } catch (e) {}
    });
  }

  /** Select 'lagos', 'edo' or 'both'. options.fly pans/zooms the map. */
  function select(regionKey, options) {
    var opts = options || {};
    selected = regionKey === 'both' ? Object.keys(regions) : (regions[regionKey] ? [regionKey] : []);
    refreshStyles();
    if (map && opts.fly && selected.length) {
      if (selected.length > 1) {
        map.flyToBounds(STUDY_BOUNDS, { duration: 0.8, padding: [20, 20] });
      } else {
        var r = regions[selected[0]];
        map.flyTo([r.latitude, r.longitude], 8, { duration: 0.8 });
      }
    }
  }

  function showWorld() {
    if (map) map.flyTo([15, 10], 2, { duration: 0.8 });
    setViewButtons('world');
  }

  function showNigeria() {
    if (map) map.flyToBounds(NIGERIA_BOUNDS, { duration: 0.8 });
    setViewButtons('nigeria');
  }

  function setViewButtons(view) {
    var w = document.getElementById('map-world-btn');
    var n = document.getElementById('map-nigeria-btn');
    if (w) { w.classList.toggle('is-active', view === 'world'); w.setAttribute('aria-pressed', view === 'world' ? 'true' : 'false'); }
    if (n) { n.classList.toggle('is-active', view === 'nigeria'); n.setAttribute('aria-pressed', view === 'nigeria' ? 'true' : 'false'); }
  }

  function addRegion(region) {
    regions[region.id] = region;
    var color = COLORS[region.id] || '#168C83';
    var lat = region.latitude;
    var lon = region.longitude;

    var cell = L.rectangle(
      [[lat - CELL_HALF_LAT, lon - CELL_HALF_LON], [lat + CELL_HALF_LAT, lon + CELL_HALF_LON]],
      { color: color, weight: 1.5, fillColor: color, fillOpacity: 0.12, interactive: true }
    ).addTo(map);
    cell.bindTooltip(region.name + ' · NASA data grid cell (0.5° × 0.625°)', { sticky: true });

    var marker = L.marker([lat, lon], {
      icon: pinIcon(region, false),
      keyboard: true,
      title: region.name,
      riseOnHover: true
    }).addTo(map);
    marker.bindPopup(popupHtml(region), { closeButton: true, autoPanPadding: [24, 24] });

    function choose() {
      select(region.id, { fly: false });
      notify(region.id, 'map');
    }
    marker.on('click', choose);
    cell.on('click', function () { choose(); marker.openPopup(); });

    layers[region.id] = { marker: marker, cell: cell };
  }

  function init() {
    var el = document.getElementById('region-map');
    var root = document.getElementById('dashboard-root');
    if (!el || !root) return;

    if (typeof L === 'undefined') {
      el.innerHTML = '<div class="empty-state"><p>The map could not load. You can still choose a region with the Location menu above.</p></div>';
      return;
    }

    map = L.map(el, {
      center: [15, 10],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
      scrollWheelZoom: false,
      zoomControl: true
    });
    setTiles();
    document.addEventListener('omi:themechange', setTiles);

    // Scroll-zoom only after the map is clicked, so page scrolling is not hijacked.
    map.on('focus click', function () { map.scrollWheelZoom.enable(); });
    map.on('blur mouseout', function () { map.scrollWheelZoom.disable(); });

    map.on('click', function (event) {
      if (event.originalEvent && event.originalEvent.target && event.originalEvent.target.closest('.leaflet-interactive, .omi-pin')) return;
      L.popup({ autoPanPadding: [24, 24] })
        .setLatLng(event.latlng)
        .setContent('<div class="omi-popup"><strong>Not a study region yet</strong><div class="omi-popup-meta">Omi currently analyses Lagos State and Edo State, Nigeria. Pick one of the highlighted markers.</div></div>')
        .openOn(map);
    });

    // Buttons inside popups.
    el.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-map-analyse]');
      if (!btn) return;
      var key = btn.getAttribute('data-map-analyse');
      map.closePopup();
      select(key, { fly: true });
      document.dispatchEvent(new CustomEvent('omi:map-analyse', { detail: { region: key } }));
    });

    var worldBtn = document.getElementById('map-world-btn');
    var nigeriaBtn = document.getElementById('map-nigeria-btn');
    if (worldBtn) worldBtn.addEventListener('click', showWorld);
    if (nigeriaBtn) nigeriaBtn.addEventListener('click', showNigeria);

    var endpoint = root.getAttribute('data-regions-endpoint') || '/api/regions';
    fetch(endpoint, { headers: { 'Accept': 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (list) {
        (list || []).forEach(function (region) {
          if (typeof region.latitude === 'number' && typeof region.longitude === 'number') addRegion(region);
        });
        var initial = document.getElementById('inv-region');
        select(initial ? initial.value : 'lagos', { fly: false });
        // Start on the whole world, then fly to Nigeria to show where the study regions are.
        setViewButtons('world');
        setTimeout(showNigeria, 900);
      })
      .catch(function () {});

    // Leaflet needs a size refresh if the container was resized while hidden.
    window.addEventListener('resize', function () { map.invalidateSize(); });
  }

  window.OmiMap = {
    select: select,
    onSelect: function (fn) { listeners.push(fn); },
    showWorld: showWorld,
    showNigeria: showNigeria,
    getMap: function () { return map; }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
