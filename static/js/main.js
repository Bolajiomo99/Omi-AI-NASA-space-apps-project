/* ==========================================================================
   Omi AI — Shared UI Utilities, Theme Manager, Navigation & Profile/Settings
   Pure Vanilla JavaScript
   ========================================================================== */

(function () {
  'use strict';

  var THEME_STORAGE_KEY = 'omi_theme';
  var PREFS_STORAGE_KEY = 'omi_workspace_prefs';

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    var normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', normalized);
    if (normalized === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch (e) {}

    // Sync topbar icon buttons
    var sunIcons = document.querySelectorAll('.theme-icon-sun');
    var moonIcons = document.querySelectorAll('.theme-icon-moon');
    sunIcons.forEach(function (el) {
      el.classList.toggle('is-hidden', normalized === 'dark');
    });
    moonIcons.forEach(function (el) {
      el.classList.toggle('is-hidden', normalized !== 'dark');
    });

    // Sync settings page theme buttons
    var themeChoiceBtns = document.querySelectorAll('[data-set-theme]');
    themeChoiceBtns.forEach(function (btn) {
      var isMatch = btn.getAttribute('data-set-theme') === normalized;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
    });
  }

  function initThemeControls() {
    applyTheme(getSavedTheme());

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = getSavedTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    });

    document.querySelectorAll('[data-set-theme]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var chosen = btn.getAttribute('data-set-theme');
        applyTheme(chosen);
      });
    });
  }

  function initNavigationDrawers() {
    // Workspace sidebar mobile drawer
    var sidebar = document.getElementById('workspace-sidebar');
    var sidebarToggle = document.getElementById('sidebar-toggle');
    var backdrop = document.getElementById('sidebar-backdrop');

    function setSidebarOpen(open) {
      if (!sidebar || !sidebarToggle) return;
      sidebar.classList.toggle('is-open', open);
      if (backdrop) backdrop.classList.toggle('is-visible', open);
      sidebarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', function () {
        setSidebarOpen(!sidebar.classList.contains('is-open'));
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setSidebarOpen(false);
      });
    }

    // Landing page mobile menu
    var landingMenuToggle = document.getElementById('landing-menu-toggle');
    var landingDrawer = document.getElementById('landing-mobile-drawer');

    if (landingMenuToggle && landingDrawer) {
      landingMenuToggle.addEventListener('click', function () {
        var isOpen = landingDrawer.classList.toggle('is-open');
        landingMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      landingDrawer.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          landingDrawer.classList.remove('is-open');
          landingMenuToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        if (landingDrawer) landingDrawer.classList.remove('is-open');
      }
    });
  }

  function getPreferences() {
    var defaults = {
      temp_unit: '°C',
      rain_unit: 'mm',
      default_region: 'lagos',
      alpha: '0.05'
    };
    try {
      var raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (!raw) return defaults;
      var parsed = JSON.parse(raw);
      return Object.assign({}, defaults, parsed);
    } catch (e) {
      return defaults;
    }
  }

  function savePreferences(prefs) {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function initSettingsPage() {
    var root = document.getElementById('settings-root');
    var form = document.getElementById('settings-form');
    if (!root || !form) return;

    var banner = document.getElementById('settings-feedback-banner');
    var prefs = getPreferences();

    var tempSelect = document.getElementById('pref-temp-unit');
    var rainSelect = document.getElementById('pref-rain-unit');
    var regionSelect = document.getElementById('pref-default-region');
    var alphaSelect = document.getElementById('pref-alpha');

    if (tempSelect) tempSelect.value = prefs.temp_unit;
    if (rainSelect) rainSelect.value = prefs.rain_unit;
    if (regionSelect) regionSelect.value = prefs.default_region;
    if (alphaSelect) alphaSelect.value = prefs.alpha;

    function showNotice(type, text) {
      if (!banner) return;
      banner.className = 'notice notice-' + type;
      banner.textContent = text;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var updated = {
        temp_unit: tempSelect ? tempSelect.value : '°C',
        rain_unit: rainSelect ? rainSelect.value : 'mm',
        default_region: regionSelect ? regionSelect.value : 'lagos',
        alpha: alphaSelect ? alphaSelect.value : '0.05'
      };
      savePreferences(updated);

      var endpoint = root.getAttribute('data-settings-endpoint') || '/api/settings';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ theme: getSavedTheme() }, updated))
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          showNotice('success', 'Workspace preferences saved to browser storage and synced with the Flask backend.');
        })
        .catch(function () {
          showNotice('info', 'Preferences saved locally in your browser. Connect the Flask /api/settings route to persist server-side.');
        });
    });

    var resetBtn = document.getElementById('reset-prefs-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        try {
          localStorage.removeItem(PREFS_STORAGE_KEY);
          localStorage.removeItem(THEME_STORAGE_KEY);
        } catch (e) {}
        applyTheme('light');
        var fresh = getPreferences();
        if (tempSelect) tempSelect.value = fresh.temp_unit;
        if (rainSelect) rainSelect.value = fresh.rain_unit;
        if (regionSelect) regionSelect.value = fresh.default_region;
        if (alphaSelect) alphaSelect.value = fresh.alpha;
        showNotice('info', 'Local appearance and workspace preferences have been reset to defaults.');
      });
    }
  }

  function initProfilePage() {
    var root = document.getElementById('profile-root');
    var form = document.getElementById('profile-form');
    if (!root || !form) return;

    var nameInput = document.getElementById('profile-name-input');
    var emailInput = document.getElementById('profile-email-input');
    var displayName = document.getElementById('profile-display-name');
    var displayEmail = document.getElementById('profile-display-email');
    var avatarCircle = document.getElementById('profile-avatar-circle');
    var banner = document.getElementById('profile-feedback-banner');

    function computeInitials(name) {
      var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return 'DR';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    if (nameInput) {
      nameInput.addEventListener('input', function () {
        var val = nameInput.value.trim() || 'Dr. Researcher';
        if (displayName) displayName.textContent = val;
        if (avatarCircle) avatarCircle.textContent = computeInitials(val);
      });
    }

    if (emailInput) {
      emailInput.addEventListener('input', function () {
        if (displayEmail) displayEmail.textContent = emailInput.value.trim() || 'researcher@omi-ai.org';
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var formData = new FormData(form);
      var payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        affiliation: formData.get('affiliation'),
        role: formData.get('role'),
        interests: formData.getAll('interests'),
        study_regions: formData.getAll('study_regions')
      };

      var endpoint = root.getAttribute('data-profile-endpoint') || '/api/profile';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          if (banner) {
            banner.className = 'notice notice-success';
            banner.textContent = 'Researcher profile updated on the Flask backend.';
          }
        })
        .catch(function () {
          if (banner) {
            banner.className = 'notice notice-warning';
            banner.textContent = 'Profile form is ready for Flask database integration, but /api/profile is not currently reachable.';
          }
        });
    });
  }

  /**
   * Reusable SVG Time-Series Line Chart Renderer (Strictly from real returned points)
   * points: Array<{ label: string, value: number }>
   */
  function renderLineChartSvg(container, points, options) {
    if (!container) return;
    var opts = options || {};
    var unit = opts.unit || '';
    var strokeColor = opts.color || '#168C83';

    var valid = (points || []).filter(function (pt) {
      return pt && typeof pt.value === 'number' && !Number.isNaN(pt.value);
    });

    if (valid.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No numeric time-series points were returned for plotting.</p></div>';
      return;
    }

    var width = 760;
    var height = 260;
    var pad = { top: 20, right: 20, bottom: 38, left: 56 };
    var plotW = width - pad.left - pad.right;
    var plotH = height - pad.top - pad.bottom;

    var values = valid.map(function (p) { return p.value; });
    var minVal = Math.min.apply(null, values);
    var maxVal = Math.max.apply(null, values);
    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }
    var yMargin = (maxVal - minVal) * 0.1;
    var yMin = minVal - yMargin;
    var yMax = maxVal + yMargin;

    function xFor(i) {
      if (valid.length === 1) return pad.left + plotW / 2;
      return pad.left + (i / (valid.length - 1)) * plotW;
    }

    function yFor(v) {
      return pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
    }

    var pathParts = valid.map(function (pt, idx) {
      return (idx === 0 ? 'M' : 'L') + xFor(idx).toFixed(2) + ' ' + yFor(pt.value).toFixed(2);
    });

    var gridLines = [];
    for (var g = 0; g <= 4; g++) {
      var frac = g / 4;
      var gy = pad.top + frac * plotH;
      var gVal = yMax - frac * (yMax - yMin);
      gridLines.push(
        '<line x1="' + pad.left + '" y1="' + gy.toFixed(1) + '" x2="' + (width - pad.right) + '" y2="' + gy.toFixed(1) + '" stroke="var(--border-subtle)" stroke-width="1"/>' +
        '<text x="' + (pad.left - 10) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" fill="var(--text-muted)" font-family="JetBrains Mono, monospace" font-size="11">' + gVal.toFixed(1) + '</text>'
      );
    }

    var firstLabel = escapeHtml(valid[0].label || '');
    var midLabel = escapeHtml(valid[Math.floor(valid.length / 2)].label || '');
    var lastLabel = escapeHtml(valid[valid.length - 1].label || '');

    var circles = valid.map(function (pt, idx) {
      var cx = xFor(idx).toFixed(2);
      var cy = yFor(pt.value).toFixed(2);
      return '<circle class="chart-point" data-idx="' + idx + '" cx="' + cx + '" cy="' + cy + '" r="' + (valid.length > 60 ? 2.5 : 4) + '" fill="' + strokeColor + '" stroke="var(--bg-surface)" stroke-width="1.5"/>';
    }).join('');

    container.innerHTML =
      '<div style="position:relative;">' +
        '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" style="overflow:visible;" role="img" aria-label="Time-series trend chart">' +
          gridLines.join('') +
          '<path d="' + pathParts.join(' ') + '" fill="none" stroke="' + strokeColor + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
          circles +
          '<text x="' + pad.left + '" y="' + (height - 10) + '" text-anchor="start" fill="var(--text-muted)" font-family="JetBrains Mono, monospace" font-size="11">' + firstLabel + '</text>' +
          '<text x="' + (pad.left + plotW / 2) + '" y="' + (height - 10) + '" text-anchor="middle" fill="var(--text-muted)" font-family="JetBrains Mono, monospace" font-size="11">' + midLabel + '</text>' +
          '<text x="' + (width - pad.right) + '" y="' + (height - 10) + '" text-anchor="end" fill="var(--text-muted)" font-family="JetBrains Mono, monospace" font-size="11">' + lastLabel + '</text>' +
        '</svg>' +
        '<div class="chart-tooltip is-hidden"></div>' +
      '</div>';

    var tooltip = container.querySelector('.chart-tooltip');
    var svg = container.querySelector('svg');
    if (!tooltip || !svg) return;

    container.querySelectorAll('.chart-point').forEach(function (dot) {
      dot.addEventListener('mouseenter', function () {
        var idx = Number(dot.getAttribute('data-idx'));
        var pt = valid[idx];
        if (!pt) return;
        tooltip.textContent = pt.label + ' · ' + pt.value.toFixed(2) + (unit ? ' ' + unit : '');
        tooltip.classList.remove('is-hidden');
        var rect = container.getBoundingClientRect();
        var dotRect = dot.getBoundingClientRect();
        tooltip.style.left = Math.max(8, Math.min(rect.width - 170, dotRect.left - rect.left - 40)) + 'px';
        tooltip.style.top = Math.max(4, dotRect.top - rect.top - 36) + 'px';
      });
      dot.addEventListener('mouseleave', function () {
        tooltip.classList.add('is-hidden');
      });
    });
  }

  window.OmiUI = {
    escapeHtml: escapeHtml,
    applyTheme: applyTheme,
    getSavedTheme: getSavedTheme,
    getPreferences: getPreferences,
    renderLineChartSvg: renderLineChartSvg
  };

  document.addEventListener('DOMContentLoaded', function () {
    initThemeControls();
    initNavigationDrawers();
    initSettingsPage();
    initProfilePage();
  });
})();
