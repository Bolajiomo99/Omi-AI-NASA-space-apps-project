/* ==========================================================================
   Omi AI — Shared investigation result rendering
   Used by the dashboard and the AI assistant so both show exactly the same
   charts and statistics for a backend analysis result.
   ========================================================================== */

(function () {
  'use strict';

  var COLORS = { lagos: '#168C83', edo: '#C2410C', trend: '#102A43' };

  function ui() { return window.OmiUI; }
  function esc(v) { return ui().escapeHtml(v); }

  function isComparison(result) {
    return result && Array.isArray(result.regions);
  }

  function units(result) {
    var variableId = (result.variable && result.variable.id) || 'temperature';
    var u = ui().unitsFor(variableId);
    u.toMonthly = function (v) {
      if (v === null || v === undefined) return null;
      if (u.level === 'mm/day') return v / 30.44;
      return u.toLevel(v);
    };
    u.monthly = u.level === 'mm/year' ? 'mm/month' : u.level;
    return u;
  }

  function regionColor(region) {
    return COLORS[region && region.id] || COLORS.lagos;
  }

  function annualPoints(single, u) {
    return (single.annual_series || []).map(function (p) {
      return { label: String(p.year), value: u.toLevel(p.value) };
    });
  }

  function trendPoints(single, u) {
    return ((single.trend && single.trend.trend_line) || []).map(function (p) {
      return { label: String(p.date).slice(0, 4), value: u.toLevel(p.value) };
    });
  }

  function chartConfig(result, mode) {
    var u = units(result);
    var singles = isComparison(result) ? result.regions : [result];
    var series = [];

    singles.forEach(function (single) {
      var color = regionColor(single.region);
      var name = single.region ? single.region.name : '';
      if (mode === 'monthly') {
        series.push({
          name: name,
          color: color,
          showPoints: false,
          points: (single.monthly_series || []).map(function (p) {
            return { label: p.date, value: u.toMonthly(p.value) };
          })
        });
      } else {
        series.push({ name: name + ' (yearly)', color: color, points: annualPoints(single, u) });
        series.push({
          name: name + ' trend',
          color: singles.length > 1 ? color : COLORS.trend,
          dashed: true,
          showPoints: false,
          points: trendPoints(single, u)
        });
      }
    });

    return {
      unit: mode === 'monthly' ? u.monthly : u.level,
      legend: true,
      ariaLabel: (result.variable ? result.variable.name : 'Variable') + ' time series',
      series: series
    };
  }

  function sig(trend) {
    return trend.significant
      ? '<span class="sig-badge is-significant">Significant</span>'
      : '<span class="sig-badge">Not significant</span>';
  }

  function kpiHtml(result) {
    var u = units(result);
    var fmt = ui().formatNumber;
    var digits = u.level === 'mm/year' ? 0 : 2;
    if (isComparison(result)) {
      return result.regions.map(function (single) {
        var t = single.trend;
        return '<div class="kpi-cell"><div class="kpi-label">' + esc(single.region.name) + '</div>' +
          '<div class="kpi-value">' + fmt(u.toRate(t.sens_slope.slope_per_decade), digits, true) +
          ' <span class="kpi-unit">' + esc(u.rate) + '</span></div><div>' + sig(t) + '</div></div>';
      }).join('') +
        '<div class="kpi-cell"><div class="kpi-label">Same direction?</div><div class="kpi-value">' +
        (result.comparison.same_direction ? 'Yes' : 'No') + '</div></div>' +
        '<div class="kpi-cell"><div class="kpi-label">Faster change</div><div class="kpi-value">' +
        esc(result.comparison.faster_change || '—') + '</div></div>';
    }
    var t = result.trend;
    var s = result.statistics;
    return '<div class="kpi-cell"><div class="kpi-label">Trend direction</div><div class="kpi-value kpi-text">' + esc(t.direction) + '</div></div>' +
      '<div class="kpi-cell"><div class="kpi-label">Rate (Sen\'s slope)</div><div class="kpi-value">' + fmt(u.toRate(t.sens_slope.slope_per_decade), digits, true) + ' <span class="kpi-unit">' + esc(u.rate) + '</span></div></div>' +
      '<div class="kpi-cell"><div class="kpi-label">Mann-Kendall p-value</div><div class="kpi-value">' + ui().formatP(t.mann_kendall.p_value) + '</div><div>' + sig(t) + '</div></div>' +
      '<div class="kpi-cell"><div class="kpi-label">Yearly average</div><div class="kpi-value">' + fmt(u.toLevel(s.mean), digits) + ' <span class="kpi-unit">' + esc(u.level) + '</span></div></div>';
  }

  function row(label, value) {
    return '<tr><td style="font-weight:500;">' + esc(label) + '</td><td class="mono-value">' + esc(value) + '</td></tr>';
  }

  function statsRows(single, u) {
    var fmt = ui().formatNumber;
    var t = single.trend;
    var lr = t.linear_regression;
    var sen = t.sens_slope;
    var mk = t.mann_kendall;
    var d = u.level === 'mm/year' ? 1 : 4;
    var conf = Math.round((sen.confidence_level || 0.95) * 100);
    var rows = [
      row('Years analysed', single.period.start_year + '–' + single.period.end_year + ' (' + single.period.years + ' years)'),
      row("Sen's slope", fmt(u.toRate(sen.slope_per_year), d, true) + ' per year'),
      row("Sen's slope " + conf + '% CI', fmt(u.toRate(sen.confidence_interval_per_year[0]), d, true) + ' to ' + fmt(u.toRate(sen.confidence_interval_per_year[1]), d, true) + ' per year'),
      row('Linear regression slope', fmt(u.toRate(lr.slope_per_year), d, true) + ' per year'),
      row('Regression ' + conf + '% CI', fmt(u.toRate(lr.confidence_interval_per_year[0]), d, true) + ' to ' + fmt(u.toRate(lr.confidence_interval_per_year[1]), d, true) + ' per year'),
      row('Regression R² / p-value', fmt(lr.r_squared, 3) + ' / ' + ui().formatP(lr.p_value)),
      row(mk.test, 'trend: ' + mk.trend + ', tau ' + fmt(mk.tau, 3) + ', p ' + ui().formatP(mk.p_value)),
      row('Significance level (α)', String(single.alpha))
    ];
    if (single.seasonal_check) {
      rows.push(row(single.seasonal_check.test, 'trend: ' + single.seasonal_check.trend + ', p ' + ui().formatP(single.seasonal_check.p_value)));
    }
    var s = single.statistics;
    var ld = u.level === 'mm/year' ? 0 : 2;
    rows.push(row('Yearly min / max', fmt(u.toLevel(s.minimum), ld) + ' / ' + fmt(u.toLevel(s.maximum), ld) + ' ' + u.level));
    rows.push(row('Standard deviation', fmt(u.toRate(s.standard_deviation), ld) + ' ' + u.level));
    return rows.join('');
  }

  function statsHtml(result) {
    var u = units(result);
    if (isComparison(result)) {
      return result.regions.map(function (single) {
        return '<h4 class="table-caption">' + esc(single.region.name) + '</h4><table class="data-table"><tbody>' + statsRows(single, u) + '</tbody></table>';
      }).join('');
    }
    return '<table class="data-table"><tbody>' + statsRows(result, u) + '</tbody></table>';
  }

  function comparisonHtml(result) {
    if (!isComparison(result)) return '';
    var u = units(result);
    var fmt = ui().formatNumber;
    var a = result.regions[0];
    var b = result.regions[1];
    var d = u.level === 'mm/year' ? 0 : 2;
    function cells(fn) { return '<td class="mono-value">' + fn(a) + '</td><td class="mono-value">' + fn(b) + '</td>'; }
    return '<table class="data-table"><thead><tr><th>Metric</th><th>' + esc(a.region.name) + '</th><th>' + esc(b.region.name) + '</th></tr></thead><tbody>' +
      '<tr><td>Yearly average (' + esc(u.level) + ')</td>' + cells(function (r) { return fmt(u.toLevel(r.statistics.mean), d); }) + '</tr>' +
      '<tr><td>Sen\'s slope (' + esc(u.rate) + ')</td>' + cells(function (r) { return fmt(u.toRate(r.trend.sens_slope.slope_per_decade), d, true); }) + '</tr>' +
      '<tr><td>Trend direction</td>' + cells(function (r) { return esc(r.trend.direction); }) + '</tr>' +
      '<tr><td>Mann-Kendall p-value</td>' + cells(function (r) { return ui().formatP(r.trend.mann_kendall.p_value); }) + '</tr>' +
      '<tr><td>Statistically significant</td>' + cells(function (r) { return r.trend.significant ? 'Yes' : 'No'; }) + '</tr>' +
      '</tbody></table>';
  }

  function sourceHtml(result) {
    var single = isComparison(result) ? result.regions[0] : result;
    var src = single.source || {};
    var q = single.data_quality || {};
    var list = function (items) {
      return '<ul>' + (items || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
    };
    var locations = (isComparison(result) ? result.regions : [result]).map(function (r) {
      return esc(r.region.name) + ' (' + r.region.latitude + '°N, ' + r.region.longitude + '°E)';
    }).join('; ');
    return '<p><strong>Dataset:</strong> ' + esc(src.dataset) + ' — ' + esc(src.underlying_product) +
      '. Parameter <span class="mono-value">' + esc(src.parameter) + '</span> (' + esc(src.parameter_name) + '), native unit ' + esc(src.native_unit) +
      ', ' + esc(src.spatial_resolution) + ', ' + esc(src.temporal_resolution) + ' records.</p>' +
      '<p><strong>Locations:</strong> ' + locations + '.</p>' +
      '<p><strong>Data quality:</strong> ' + esc(q.valid_months) + ' of ' + esc(q.expected_months) + ' months valid; ' + esc(q.complete_years_used) + ' complete years used.' +
      (src.retrieved_at ? ' Retrieved ' + esc(src.retrieved_at) + '.' : '') + '</p>' +
      '<p><strong>Method</strong></p>' + list(single.methodology) +
      '<p><strong>Limitations</strong></p>' + list(result.limitations) +
      '<p class="meta-line">Source documentation: <a href="' + esc(src.documentation) + '" target="_blank" rel="noopener">power.larc.nasa.gov/docs</a></p>';
  }

  function explanationHtml(text) {
    return String(text || '').split(/\n\n+/).map(function (para) {
      return '<p>' + esc(para) + '</p>';
    }).join('');
  }

  function title(result) {
    var name = result.variable ? result.variable.name : '';
    var where = isComparison(result)
      ? result.regions.map(function (r) { return r.region.name; }).join(' vs ')
      : result.region.name;
    return name + ' · ' + where + ' · ' + result.period.start_year + '–' + result.period.end_year;
  }

  /** Compact card used inside chat bubbles. */
  function renderChatCard(container, result) {
    var mode = 'annual';
    container.className = 'chat-result-card';
    container.innerHTML =
      '<div class="chat-result-title">' + esc(title(result)) + '</div>' +
      '<div class="kpi-strip kpi-strip-compact">' + kpiHtml(result) + '</div>' +
      '<div class="chat-chart"></div>' +
      '<div class="chat-result-foot meta-line">Source: NASA POWER (MERRA-2). Dashed line = fitted trend.</div>';
    ui().renderChart(container.querySelector('.chat-chart'), chartConfig(result, mode));
  }

  window.OmiResults = {
    isComparison: isComparison,
    chartConfig: chartConfig,
    kpiHtml: kpiHtml,
    statsHtml: statsHtml,
    comparisonHtml: comparisonHtml,
    sourceHtml: sourceHtml,
    explanationHtml: explanationHtml,
    title: title,
    renderChatCard: renderChatCard
  };
})();
