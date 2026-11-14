/* ==========================================================================
   Omi AI — Environmental Dashboard Logic
   Connects Study Region buttons and Overview panels to Flask endpoints.
   Never invents NASA measurements or fake statistics.
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('dashboard-root');
    if (!root) return;

    var uploadUrl = root.getAttribute('data-upload-url') || '/upload';
    var regionEndpoint = root.getAttribute('data-region-endpoint') || '/api/regions';
    var comparisonEndpoint = root.getAttribute('data-comparison-endpoint') || '/api/regions/compare';
    var statusBanner = document.getElementById('dashboard-status-banner');
    var activeRegionLabel = document.getElementById('overview-active-region');

    var tempPanel = document.getElementById('temperature-panel-body');
    var rainPanel = document.getElementById('rainfall-panel-body');
    var obsPanel = document.getElementById('observations-panel-body');
    var compPanel = document.getElementById('comparison-panel-body');

    function setBanner(type, message) {
      if (!statusBanner) return;
      statusBanner.className = 'notice notice-' + type;
      statusBanner.textContent = message;
    }

    function clearSelectedCards() {
      document.querySelectorAll('[data-region-card]').forEach(function (card) {
        card.classList.remove('is-selected');
      });
    }

    function renderEmptyPanel(panel, message) {
      if (!panel) return;
      panel.className = 'empty-state';
      panel.innerHTML =
        '<p>' + window.OmiUI.escapeHtml(message) + '</p>' +
        '<a href="' + window.OmiUI.escapeHtml(uploadUrl) + '" class="btn btn-secondary btn-sm">Analyse Dataset</a>';
    }

    function normalizeSeries(raw) {
      if (!Array.isArray(raw)) return [];
      return raw
        .map(function (item) {
          if (!item || typeof item !== 'object') return null;
          var label = item.date || item.time || item.timestamp || item.year || item.label || '';
          var val = Number(item.value !== undefined ? item.value : (item.temperature !== undefined ? item.temperature : item.rainfall));
          if (Number.isNaN(val)) return null;
          return { label: String(label), value: val };
        })
        .filter(Boolean);
    }

    function renderObservationsTable(panel, rows) {
      if (!panel) return;
      if (!Array.isArray(rows) || rows.length === 0) {
        renderEmptyPanel(panel, 'No historical observation records were returned for this selection.');
        return;
      }

      var keys = Object.keys(rows[0]).slice(0, 5);
      var thead = '<tr>' + keys.map(function (k) {
        return '<th>' + window.OmiUI.escapeHtml(k) + '</th>';
      }).join('') + '</tr>';

      var tbody = rows.slice(0, 8).map(function (row) {
        return '<tr>' + keys.map(function (k) {
          return '<td>' + window.OmiUI.escapeHtml(row[k]) + '</td>';
        }).join('') + '</tr>';
      }).join('');

      panel.className = 'card-body';
      panel.innerHTML =
        '<div class="preview-table-wrap"><table class="data-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div>';
    }

    function applyRegionResponse(regionKey, data) {
      var regionName = regionKey === 'edo' ? 'Edo State' : 'Lagos State';
      if (activeRegionLabel) {
        activeRegionLabel.textContent = 'Active region: ' + regionName;
      }

      var tempSeries = normalizeSeries(data.temperature_series || data.temperature);
      if (tempSeries.length > 0 && tempPanel) {
        tempPanel.className = 'card-body';
        window.OmiUI.renderLineChartSvg(tempPanel, tempSeries, {
          unit: data.temperature_unit || '°C',
          color: '#102A43'
        });
      } else {
        renderEmptyPanel(tempPanel, 'No temperature time-series returned by the backend for ' + regionName + '.');
      }

      var rainSeries = normalizeSeries(data.rainfall_series || data.rainfall);
      if (rainSeries.length > 0 && rainPanel) {
        rainPanel.className = 'card-body';
        window.OmiUI.renderLineChartSvg(rainPanel, rainSeries, {
          unit: data.rainfall_unit || 'mm',
          color: '#168C83'
        });
      } else {
        renderEmptyPanel(rainPanel, 'No rainfall time-series returned by the backend for ' + regionName + '.');
      }

      renderObservationsTable(obsPanel, data.observations || data.records || []);
    }

    function queryRegion(regionKey) {
      var card = document.querySelector('[data-region-card="' + regionKey + '"]');
      var statusEl = document.querySelector('[data-region-status="' + regionKey + '"]');
      var btn = document.querySelector('[data-analyse-region="' + regionKey + '"]');

      clearSelectedCards();
      if (card) card.classList.add('is-selected');
      if (statusEl) statusEl.textContent = 'Querying Flask backend...';
      if (btn) btn.disabled = true;

      setBanner('info', 'Requesting environmental records for ' + (regionKey === 'edo' ? 'Edo State' : 'Lagos State') + '...');

      fetch(regionEndpoint + '/' + encodeURIComponent(regionKey), {
        headers: { 'Accept': 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Backend returned HTTP ' + res.status);
          return res.json();
        })
        .then(function (payload) {
          if (!payload || Object.keys(payload).length === 0) {
            throw new Error('No environmental records returned from backend.');
          }
          if (statusEl) statusEl.textContent = 'Dataset loaded';
          setBanner('success', 'Loaded returned observations for ' + (regionKey === 'edo' ? 'Edo State' : 'Lagos State') + '.');
          applyRegionResponse(regionKey, payload);
        })
        .catch(function (err) {
          if (statusEl) statusEl.textContent = 'No connected regional dataset';
          setBanner(
            'warning',
            'Regional data endpoint (' + regionEndpoint + '/' + regionKey + ') did not return an active dataset (' + err.message + '). You can still upload and analyse a CSV file directly on the Analyse a Dataset page.'
          );
        })
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    }

    document.querySelectorAll('[data-analyse-region]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var regionKey = btn.getAttribute('data-analyse-region');
        if (regionKey) queryRegion(regionKey);
      });
    });

    var compareBtn = document.getElementById('compare-regions-btn');
    if (compareBtn) {
      compareBtn.addEventListener('click', function () {
        compareBtn.disabled = true;
        setBanner('info', 'Requesting regional comparison between Lagos State and Edo State...');

        fetch(comparisonEndpoint, { headers: { 'Accept': 'application/json' } })
          .then(function (res) {
            if (!res.ok) throw new Error('Backend returned HTTP ' + res.status);
            return res.json();
          })
          .then(function (data) {
            if (!data || !compPanel) throw new Error('Empty comparison payload.');
            compPanel.className = 'card-body';
            compPanel.innerHTML =
              '<div class="preview-table-wrap"><table class="data-table">' +
              '<thead><tr><th>Metric</th><th>Lagos State</th><th>Edo State</th></tr></thead>' +
              '<tbody>' +
              '<tr><td>Mean Temperature</td><td class="mono-value">' + window.OmiUI.escapeHtml(data.lagos_temp_mean || '—') + '</td><td class="mono-value">' + window.OmiUI.escapeHtml(data.edo_temp_mean || '—') + '</td></tr>' +
              '<tr><td>Mean Rainfall</td><td class="mono-value">' + window.OmiUI.escapeHtml(data.lagos_rain_mean || '—') + '</td><td class="mono-value">' + window.OmiUI.escapeHtml(data.edo_rain_mean || '—') + '</td></tr>' +
              '</tbody></table></div>';
            setBanner('success', 'Regional comparison data loaded from Flask backend.');
          })
          .catch(function (err) {
            setBanner(
              'warning',
              'Regional comparison endpoint (' + comparisonEndpoint + ') is not available yet (' + err.message + '). Analyse datasets individually via Upload CSV.'
            );
          })
          .finally(function () {
            compareBtn.disabled = false;
          });
      });
    }

    var exploreBtn = document.getElementById('explore-trends-btn');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', function () {
        var overviewEl = document.getElementById('environmental-overview');
        if (overviewEl) {
          overviewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // Check URL query parameter ?region=lagos or ?region=edo
    try {
      var params = new URLSearchParams(window.location.search);
      var preselected = params.get('region');
      if (preselected === 'lagos' || preselected === 'edo') {
        queryRegion(preselected);
      }
    } catch (e) {}
  });
})();
