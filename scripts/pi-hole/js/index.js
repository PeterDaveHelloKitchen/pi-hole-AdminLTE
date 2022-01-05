/* Pi-hole: A black hole for Internet advertisements
 *  (c) 2017 Pi-hole, LLC (https://pi-hole.net)
 *  Network-wide ad blocking via your own hardware.
 *
 *  This file is copyright under the latest version of the EUPL.
 *  Please see LICENSE file for your rights under this license. */

/* global utils:false, Chart:false, updateSessionTimer:false, ChartDataLabels:false */

// Define global variables
var timeLineChart, clientsChart;
var queryTypeChart, forwardDestinationChart;

var THEME_COLORS = [
  "#f56954",
  "#3c8dbc",
  "#00a65a",
  "#00c0ef",
  "#f39c12",
  "#0073b7",
  "#001f3f",
  "#39cccc",
  "#3d9970",
  "#01ff70",
  "#ff851b",
  "#f012be",
  "#8e24aa",
  "#d81b60",
  "#222222",
  "#d2d6de",
];

var customTooltips = function (tooltip) {
  var tooltipEl = document.getElementById(this._chart.canvas.id + "-customTooltip");
  if (!tooltipEl) {
    // Create Tooltip Element once per chart
    tooltipEl = document.createElement("div");
    tooltipEl.id = this._chart.canvas.id + "-customTooltip";
    tooltipEl.classList.add("chartjs-tooltip");
    tooltipEl.innerHTML = "<div class='arrow'></div> <table></table>";
    // avoid browser's font-zoom since we know that <body>'s
    // font-size was set to 14px by bootstrap's css
    var fontZoom = parseFloat($("body").css("font-size")) / 14;
    // set styles and font
    tooltipEl.style.padding = tooltip.yPadding + "px " + tooltip.xPadding + "px";
    tooltipEl.style.borderRadius = tooltip.cornerRadius + "px";
    tooltipEl.style.fontFamily = tooltip._bodyFontFamily;
    tooltipEl.style.fontSize = tooltip.bodyFontSize / fontZoom + "px";
    tooltipEl.style.fontStyle = tooltip._bodyFontStyle;
    // append Tooltip next to canvas-containing box
    tooltipEl.ancestor = this._chart.canvas.closest(".box[id]").parentNode;
    tooltipEl.ancestor.append(tooltipEl);
  }

  // Hide if no tooltip
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  // Set caret position
  tooltipEl.classList.remove("left", "right", "center", "top", "bottom");
  tooltipEl.classList.add(tooltip.xAlign, tooltip.yAlign);

  // Set Text
  if (tooltip.body) {
    var titleLines = tooltip.title || [];
    var bodyLines = tooltip.body.map(function (bodyItem) {
      return bodyItem.lines;
    });
    var innerHtml = "<thead>";

    titleLines.forEach(function (title) {
      innerHtml += "<tr><th>" + title + "</th></tr>";
    });
    innerHtml += "</thead><tbody>";
    var printed = 0;

    var devicePixel = (1 / window.devicePixelRatio).toFixed(1);
    bodyLines.forEach(function (body, i) {
      var labelColors = tooltip.labelColors[i];
      var style = "background-color: " + labelColors.backgroundColor;
      style += "; outline: 1px solid " + labelColors.backgroundColor;
      style += "; border: " + devicePixel + "px solid #fff";
      var span = "<span class='chartjs-tooltip-key' style='" + style + "'></span>";

      var num = body[0].split(": ");
      // do not display entries with value of 0 (in bar chart),
      // but pass through entries with "0.0% (in pie charts)
      if (num[1] !== "0") {
        innerHtml += "<tr><td>" + span + body + "</td></tr>";
        printed++;
      }
    });
    if (printed < 1) {
      innerHtml += "<tr><td>No activity recorded</td></tr>";
    }

    innerHtml += "</tbody>";

    var tableRoot = tooltipEl.querySelector("table");
    tableRoot.innerHTML = innerHtml;
  }

  var canvasPos = this._chart.canvas.getBoundingClientRect();
  var boxPos = tooltipEl.ancestor.getBoundingClientRect();
  var offsetX = canvasPos.left - boxPos.left;
  var offsetY = canvasPos.top - boxPos.top;
  var tooltipWidth = tooltipEl.offsetWidth;
  var tooltipHeight = tooltipEl.offsetHeight;
  var caretX = tooltip.caretX;
  var caretY = tooltip.caretY;
  var caretPadding = tooltip.caretPadding;
  var tooltipX, tooltipY, arrowX;
  var arrowMinIndent = 2 * tooltip.cornerRadius;
  var arrowSize = 5;

  // Compute X position
  if ($(document).width() > 2 * tooltip.width || tooltip.xAlign !== "center") {
    // If the viewport is wide enough, let the tooltip follow the caret position
    tooltipX = offsetX + caretX;
    if (tooltip.yAlign === "top" || tooltip.yAlign === "bottom") {
      switch (tooltip.xAlign) {
        case "center":
          // set a minimal X position to 5px to prevent
          // the tooltip to stick out left of the viewport
          var minX = 5;
          if (2 * tooltipX < tooltipWidth + minX) {
            arrowX = tooltipX - minX;
            tooltipX = minX;
          } else {
            tooltipX -= tooltipWidth / 2;
          }

          break;
        case "left":
          tooltipX -= arrowMinIndent;
          arrowX = arrowMinIndent;
          break;
        case "right":
          tooltipX -= tooltipWidth - arrowMinIndent;
          arrowX = tooltipWidth - arrowMinIndent;
          break;
        default:
          break;
      }
    } else if (tooltip.yAlign === "center") {
      switch (tooltip.xAlign) {
        case "left":
          tooltipX += caretPadding;
          break;
        case "right":
          tooltipX -= tooltipWidth - caretPadding;
          break;
        case "center":
          tooltipX -= tooltipWidth / 2;
          break;
        default:
          break;
      }
    }
  } else {
    // compute the tooltip's center inside ancestor element
    tooltipX = (tooltipEl.ancestor.offsetWidth - tooltipWidth) / 2;
    // move the tooltip if the arrow would stick out to the left
    if (offsetX + caretX - arrowMinIndent < tooltipX) {
      tooltipX = offsetX + caretX - arrowMinIndent;
    }

    // move the tooltip if the arrow would stick out to the right
    if (offsetX + caretX - tooltipWidth + arrowMinIndent > tooltipX) {
      tooltipX = offsetX + caretX - tooltipWidth + arrowMinIndent;
    }

    arrowX = offsetX + caretX - tooltipX;
  }

  // Compute Y position
  switch (tooltip.yAlign) {
    case "top":
      tooltipY = offsetY + caretY + arrowSize + caretPadding;
      break;
    case "center":
      tooltipY = offsetY + caretY - tooltipHeight / 2;
      if (tooltip.xAlign === "left") {
        tooltipX += arrowSize;
      } else if (tooltip.xAlign === "right") {
        tooltipX -= arrowSize;
      }

      break;
    case "bottom":
      tooltipY = offsetY + caretY - tooltipHeight - arrowSize - caretPadding;
      break;
    default:
      break;
  }

  // Position tooltip and display
  tooltipEl.style.top = tooltipY.toFixed(1) + "px";
  tooltipEl.style.left = tooltipX.toFixed(1) + "px";
  if (arrowX === undefined) {
    tooltipEl.querySelector(".arrow").style.left = "";
  } else {
    // Calculate percentage X value depending on the tooltip's
    // width to avoid hanging arrow out on tooltip width changes
    var arrowXpercent = ((100 / tooltipWidth) * arrowX).toFixed(1);
    tooltipEl.querySelector(".arrow").style.left = arrowXpercent + "%";
  }

  tooltipEl.style.opacity = 1;
};

// Functions to update data in page

var failures = 0;
function updateQueriesOverTime() {
  $.getJSON("api.php?overTimeData10mins", function (data) {
    if ("FTLnotrunning" in data) {
      return;
    }

    // convert received objects to arrays
    data.domains_over_time = utils.objectToArray(data.domains_over_time);
    data.ads_over_time = utils.objectToArray(data.ads_over_time);
    // remove last data point since it not representative
    data.ads_over_time[0].splice(-1, 1);
    // Remove possibly already existing data
    timeLineChart.data.labels = [];
    timeLineChart.data.datasets = [];

    var labels = ["Blocked DNS Queries", "Permitted DNS Queries"];
    var blockedColor = $(".queries-blocked").css("background-color");
    var permittedColor = $(".queries-permitted").css("background-color");
    var colors = [blockedColor, permittedColor];

    // Collect values and colors, and labels
    for (var i = 0; i < labels.length; i++) {
      timeLineChart.data.datasets.push({
        data: [],
        // If we ran out of colors, make a random one
        backgroundColor: colors[i],
        pointRadius: 0,
        pointHitRadius: 5,
        pointHoverRadius: 5,
        label: labels[i],
        cubicInterpolationMode: "monotone",
      });
    }

    // Add data for each hour that is available
    for (var hour in data.ads_over_time[0]) {
      if (Object.prototype.hasOwnProperty.call(data.ads_over_time[0], hour)) {
        var h = parseInt(data.domains_over_time[0][hour], 10);
        var d =
          parseInt(data.ads_over_time[0][0], 10) < 1200
            ? new Date().setHours(Math.floor(h / 6), 10 * (h % 6), 0, 0)
            : new Date(1000 * h);

        timeLineChart.data.labels.push(d);
        var blocked = data.ads_over_time[1][hour];
        var permitted = data.domains_over_time[1][hour] - blocked;
        timeLineChart.data.datasets[0].data.push(blocked);
        timeLineChart.data.datasets[1].data.push(permitted);
      }
    }

    $("#queries-over-time .overlay").hide();
    timeLineChart.update();
  })
    .done(function () {
      // Reload graph after 10 minutes
      failures = 0;
      setTimeout(updateQueriesOverTime, 600000);
    })
    .fail(function () {
      failures++;
      if (failures < 5) {
        // Try again after 1 minute only if this has not failed more
        // than five times in a row
        setTimeout(updateQueriesOverTime, 60000);
      }
    });
}

var querytypeids = [];
function updateQueryTypes() {
  $.getJSON("api.php?getQueryTypes", function (data) {
    if ("FTLnotrunning" in data) {
      return;
    }

    var v = [],
      c = [],
      k = [],
      i = 0;
    // Collect values and colors, and labels
    var iter = Object.prototype.hasOwnProperty.call(data, "querytypes") ? data.querytypes : data;

    querytypeids = [];
    var sorted = [];
    Object.keys(iter).forEach(function (key) {
      sorted.push([key, iter[key]]);
    });
    sorted.sort(function (a, b) {
      return b[1] - a[1];
    });
    for (var key in sorted) {
      if (Object.prototype.hasOwnProperty.call(sorted, key)) {
        if (sorted[key][1] > 0) {
          v.push(sorted[key][1]);
          c.push(THEME_COLORS[i % THEME_COLORS.length]);
          k.push(sorted[key][0]);
          querytypeids.push(i + 1);
        }

        i++;
      }
    }

    // Build a single dataset with the data to be pushed
    var dd = { data: v, backgroundColor: c, barThickness: 20 };
    // and push it at once
    queryTypeChart.data.datasets[0] = dd;
    queryTypeChart.data.labels = k;
    $("#query-types-pie .overlay").hide();
    queryTypeChart.update();
    // Don't use animation for further updates
    queryTypeChart.options.animation.duration = 0;
  }).done(function () {
    var maxtick = calcLastTick(queryTypeChart);
    if (maxtick > 100) {
      queryTypeChart.options.layout.padding.right = "44";
    } else {
      queryTypeChart.options.scales.xAxes[0].ticks.max = maxtick;
    }
    queryTypeChart.update();

    // Count how many bars the chart shows, calculates and sets the height
    var bars = queryTypeChart.data.datasets[0].data.length;
    $("#queryTypeChart")
      .parent()
      .height(bars * 48);

    // Compares the height of both graphs and finds the tallest one
    var max = bars;
    if (forwardDestinationChart.data.datasets[0].data.length > max) {
      max = forwardDestinationChart.data.datasets[0].data.length;
    }

    // Use the value to set the parent's height
    $(".chart-container").height(max * 48);

    // Reload graph after minute
    setTimeout(updateQueryTypes, 60000);
  });
}

function updateClientsOverTime() {
  $.getJSON("api.php?overTimeDataClients&getClientNames", function (data) {
    if ("FTLnotrunning" in data) {
      return;
    }

    // Remove graph if there are no results (e.g. privacy mode enabled)
    if (jQuery.isEmptyObject(data.over_time)) {
      $("#clients").parent().remove();
      return;
    }

    // convert received objects to arrays
    data.over_time = utils.objectToArray(data.over_time);

    // remove last data point since it not representative
    data.over_time[0].splice(-1, 1);
    var timestamps = data.over_time[0];
    var plotdata = data.over_time[1];
    var labels = [];
    var key;

    for (key in data.clients) {
      if (Object.prototype.hasOwnProperty.call(data.clients, key)) {
        var client = data.clients[key];
        labels.push(client.name.length > 0 ? client.name : client.ip);
      }
    }

    // Remove possibly already existing data
    clientsChart.data.labels = [];
    clientsChart.data.datasets = [];

    // Collect values and colors, and labels
    var numClients = 0;
    if (plotdata.length > 0) {
      numClients = plotdata[0].length;
    }

    for (var i = 0; i < numClients; i++) {
      clientsChart.data.datasets.push({
        data: [],
        // If we ran out of colors, make a random one
        backgroundColor:
          i < THEME_COLORS.length
            ? THEME_COLORS[i]
            : "#" + (0x1000000 + Math.random() * 0xffffff).toString(16).substr(1, 6),
        pointRadius: 0,
        pointHitRadius: 5,
        pointHoverRadius: 5,
        label: labels[i],
        cubicInterpolationMode: "monotone",
      });
    }

    // Add data for each dataset that is available
    for (var j in timestamps) {
      if (!Object.prototype.hasOwnProperty.call(timestamps, j)) {
        continue;
      }

      for (key in plotdata[j]) {
        if (Object.prototype.hasOwnProperty.call(plotdata[j], key)) {
          clientsChart.data.datasets[key].data.push(plotdata[j][key]);
        }
      }

      var d = new Date(1000 * parseInt(timestamps[j], 10));
      clientsChart.data.labels.push(d);
    }

    $("#clients .overlay").hide();
    clientsChart.update();
  })
    .done(function () {
      // Reload graph after 10 minutes
      failures = 0;
      setTimeout(updateClientsOverTime, 600000);
    })
    .fail(function () {
      failures++;
      if (failures < 5) {
        // Try again after 1 minute only if this has not failed more
        // than five times in a row
        setTimeout(updateClientsOverTime, 60000);
      }
    });
}

function updateForwardDestinations() {
  $.getJSON("api.php?getForwardDestinations", function (data) {
    if ("FTLnotrunning" in data) {
      return;
    }

    var v = [],
      c = [],
      k = [],
      i = 0,
      values = [];

    // Collect values and colors
    Object.keys(data.forward_destinations).forEach(function (key) {
      var value = data.forward_destinations[key];

      if (key.indexOf("|") !== -1) {
        key = key.substr(0, key.indexOf("|"));
      }

      values.push([key, value, THEME_COLORS[i++ % THEME_COLORS.length]]);
    });

    values.sort(function (a, b) {
      return b[1] - a[1];
    });

    // Split data into individual arrays for the graphs
    values.forEach(function (value) {
      k.push(value[0]);
      v.push(value[1]);
      c.push(value[2]);
    });

    // Build a single dataset with the data to be pushed
    var dd = { data: v, backgroundColor: c, barThickness: 20 };
    // and push it at once
    forwardDestinationChart.data.labels = k;
    forwardDestinationChart.data.datasets[0] = dd;
    $("#forward-destinations-pie .overlay").hide();
    forwardDestinationChart.update();
    // Don't use animation for further updates
    forwardDestinationChart.options.animation.duration = 0;
  }).done(function () {
    var maxtick = calcLastTick(forwardDestinationChart);
    if (maxtick > 100) {
      forwardDestinationChart.options.layout.padding.right = "44";
    } else {
      forwardDestinationChart.options.scales.xAxes[0].ticks.max = maxtick;
    }
    forwardDestinationChart.update();

    // Count how many bars the chart shows, calculates and sets the height
    var bars = forwardDestinationChart.data.datasets[0].data.length;
    $("#forwardDestinationChart")
      .parent()
      .height(bars * 48);

    // Compares the height of both graphs and finds the tallest one
    var max = bars;
    if (queryTypeChart.data.datasets[0].data.length > max) {
      max = queryTypeChart.data.datasets[0].data.length;
    }

    // Use the value to set the parent's height
    $(".chart-container").height(max * 48);

    // Reload graph after one minute
    setTimeout(updateForwardDestinations, 60000);
  });
}

function updateTopClientsChart() {
  $.getJSON("api.php?summaryRaw&getQuerySources&topClientsBlocked", function (data) {
    if ("FTLnotrunning" in data) {
      return;
    }

    // Clear tables before filling them with data
    $("#client-frequency td").parent().remove();
    var clienttable = $("#client-frequency").find("tbody:last");
    var client, percentage, clientname, clientip, idx, url;
    for (client in data.top_sources) {
      if (Object.prototype.hasOwnProperty.call(data.top_sources, client)) {
        // Sanitize client
        if (utils.escapeHtml(client) !== client) {
          // Make a copy with the escaped index if necessary
          data.top_sources[utils.escapeHtml(client)] = data.top_sources[client];
        }

        client = utils.escapeHtml(client);
        if (client.indexOf("|") !== -1) {
          idx = client.indexOf("|");
          clientname = client.substr(0, idx);
          clientip = client.substr(idx + 1, client.length - idx);
        } else {
          clientname = client;
          clientip = client;
        }

        url =
          '<a href="queries.php?client=' +
          clientip +
          '" title="' +
          clientip +
          '">' +
          clientname +
          "</a>";
        percentage = (data.top_sources[client] / data.dns_queries_today) * 100;
        clienttable.append(
          "<tr> " +
            utils.addTD(url) +
            utils.addTD(data.top_sources[client]) +
            utils.addTD(utils.colorBar(percentage, data.dns_queries_today, "progress-bar-blue")) +
            "</tr> "
        );
      }
    }

    // Clear tables before filling them with data
    $("#client-frequency-blocked td").parent().remove();
    var clientblockedtable = $("#client-frequency-blocked").find("tbody:last");
    for (client in data.top_sources_blocked) {
      if (Object.prototype.hasOwnProperty.call(data.top_sources_blocked, client)) {
        // Sanitize client
        if (utils.escapeHtml(client) !== client) {
          // Make a copy with the escaped index if necessary
          data.top_sources_blocked[utils.escapeHtml(client)] = data.top_sources_blocked[client];
        }

        client = utils.escapeHtml(client);
        if (client.indexOf("|") !== -1) {
          idx = client.indexOf("|");
          clientname = client.substr(0, idx);
          clientip = client.substr(idx + 1, client.length - idx);
        } else {
          clientname = client;
          clientip = client;
        }

        url =
          '<a href="queries.php?client=' +
          clientip +
          '&type=blocked" title="' +
          clientip +
          '">' +
          clientname +
          "</a>";
        percentage = (data.top_sources_blocked[client] / data.ads_blocked_today) * 100;
        clientblockedtable.append(
          "<tr> " +
            utils.addTD(url) +
            utils.addTD(data.top_sources_blocked[client]) +
            utils.addTD(utils.colorBar(percentage, data.ads_blocked_today, "progress-bar-blue")) +
            "</tr> "
        );
      }
    }

    // Remove table if there are no results (e.g. privacy mode enabled)
    if (jQuery.isEmptyObject(data.top_sources)) {
      $("#client-frequency").parent().remove();
    }

    // Remove table if there are no results (e.g. privacy mode enabled)
    if (jQuery.isEmptyObject(data.top_sources_blocked)) {
      $("#client-frequency-blocked").parent().remove();
    }

    $("#client-frequency .overlay").hide();
    $("#client-frequency-blocked .overlay").hide();
    // Update top clients list data every ten seconds
    setTimeout(updateTopClientsChart, 10000);
  });
}

function updateTopLists() {
  $.getJSON("api.php?summaryRaw&topItems", function (data) {
    if ("FTLnotrunning" in data) {
      return;
    }

    // Clear tables before filling them with data
    $("#domain-frequency td").parent().remove();
    $("#ad-frequency td").parent().remove();
    var domaintable = $("#domain-frequency").find("tbody:last");
    var adtable = $("#ad-frequency").find("tbody:last");
    var url, domain, percentage, urlText;
    for (domain in data.top_queries) {
      if (Object.prototype.hasOwnProperty.call(data.top_queries, domain)) {
        // Sanitize domain
        if (utils.escapeHtml(domain) !== domain) {
          // Make a copy with the escaped index if necessary
          data.top_queries[utils.escapeHtml(domain)] = data.top_queries[domain];
        }

        domain = utils.escapeHtml(domain);
        urlText = domain === "" ? "." : domain;
        url = '<a href="queries.php?domain=' + domain + '">' + urlText + "</a>";
        percentage = (data.top_queries[domain] / data.dns_queries_today) * 100;
        domaintable.append(
          "<tr> " +
            utils.addTD(url) +
            utils.addTD(data.top_queries[domain]) +
            utils.addTD(utils.colorBar(percentage, data.dns_queries_today, "queries-permitted")) +
            "</tr> "
        );
      }
    }

    // Remove table if there are no results (e.g. privacy mode enabled)
    if (jQuery.isEmptyObject(data.top_queries)) {
      $("#domain-frequency").parent().remove();
    }

    for (domain in data.top_ads) {
      if (Object.prototype.hasOwnProperty.call(data.top_ads, domain)) {
        // Sanitize domain
        if (utils.escapeHtml(domain) !== domain) {
          // Make a copy with the escaped index if necessary
          data.top_ads[utils.escapeHtml(domain)] = data.top_ads[domain];
        }

        domain = utils.escapeHtml(domain);
        urlText = domain === "" ? "." : domain;
        url = '<a href="queries.php?domain=' + domain + '">' + urlText + "</a>";
        percentage = (data.top_ads[domain] / data.ads_blocked_today) * 100;
        adtable.append(
          "<tr> " +
            utils.addTD(url) +
            utils.addTD(data.top_ads[domain]) +
            utils.addTD(utils.colorBar(percentage, data.ads_blocked_today, "queries-blocked")) +
            "</tr> "
        );
      }
    }

    // Remove table if there are no results (e.g. privacy mode enabled)
    if (jQuery.isEmptyObject(data.top_ads)) {
      $("#ad-frequency").parent().remove();
    }

    $("#domain-frequency .overlay").hide();
    $("#ad-frequency .overlay").hide();
    // Update top lists data every 10 seconds
    setTimeout(updateTopLists, 10000);
  });
}

var FTLoffline = false;
function updateSummaryData(runOnce) {
  var setTimer = function (timeInSeconds) {
    if (!runOnce) {
      setTimeout(updateSummaryData, timeInSeconds * 1000);
    }
  };

  $.getJSON("api.php?summary", function (data) {
    updateSessionTimer();

    if ("FTLnotrunning" in data) {
      data.dns_queries_today = "Lost";
      data.ads_blocked_today = "connection";
      data.ads_percentage_today = "to";
      data.domains_being_blocked = "API";
      // Show spinner
      $("#queries-over-time .overlay").show();
      $("#forward-destinations-pie .overlay").show();
      $("#query-types-pie .overlay").show();
      $("#client-frequency .overlay").show();
      $("#domain-frequency .overlay").show();
      $("#ad-frequency .overlay").show();

      FTLoffline = true;
    } else if (FTLoffline) {
      // FTL was previously offline
      FTLoffline = false;
      updateQueriesOverTime();
      updateTopClientsChart();
      updateTopLists();
    }

    var formatter = new Intl.NumberFormat();
    //Element name might have a different name to the property of the API so we split it at |
    [
      "ads_blocked_today|queries_blocked_today",
      "dns_queries_today",
      "ads_percentage_today|percentage_blocked_today",
      "unique_clients",
      "domains_being_blocked",
    ].forEach(function (arrayItem, idx) {
      var apiElName = arrayItem.split("|");
      var apiName = apiElName[0];
      var elName = apiElName[1];
      var $todayElement = elName ? $("span#" + elName) : $("span#" + apiName);
      // Round to one decimal place and format locale-aware
      var text = formatter.format(Math.round(data[apiName] * 10) / 10);
      var textData = idx === 2 && data[apiName] !== "to" ? text + "%" : text;
      if ($todayElement.text() !== textData && $todayElement.text() !== textData + "%") {
        $todayElement.addClass("glow");
        $todayElement.text(textData);
      }
    });

    if (Object.prototype.hasOwnProperty.call(data, "dns_queries_all_types")) {
      $("#total_queries").prop(
        "title",
        "only A + AAAA queries (" + data.dns_queries_all_types + " in total)"
      );
    }

    setTimeout(function () {
      $("span.glow").removeClass("glow");
    }, 500);
  })
    .done(function () {
      if (!FTLoffline) {
        setTimer(1);
      } else {
        setTimer(10);
      }
    })
    .fail(function () {
      setTimer(300);
    });
}

$(function () {
  // Pull in data via AJAX
  updateSummaryData();

  var gridColor = $(".graphs-grid").css("background-color");
  var ticksColor = $(".graphs-ticks").css("color");
  var ctx = document.getElementById("queryOverTimeChart").getContext("2d");
  timeLineChart = new Chart(ctx, {
    type: utils.getGraphType(),
    data: {
      labels: [],
      datasets: [{ data: [] }],
    },
    options: {
      tooltips: {
        enabled: true,
        mode: "x-axis",
        itemSort: function (a, b) {
          return b.datasetIndex - a.datasetIndex;
        },
        callbacks: {
          title: function (tooltipItem) {
            var label = tooltipItem[0].xLabel;
            var time = label.match(/(\d?\d):?(\d?\d?)/);
            var h = parseInt(time[1], 10);
            var m = parseInt(time[2], 10) || 0;
            var from = utils.padNumber(h) + ":" + utils.padNumber(m - 5) + ":00";
            var to = utils.padNumber(h) + ":" + utils.padNumber(m + 4) + ":59";
            return "Queries from " + from + " to " + to;
          },
          label: function (tooltipItems, data) {
            if (tooltipItems.datasetIndex === 0) {
              var percentage = 0;
              var permitted = parseInt(data.datasets[1].data[tooltipItems.index], 10);
              var blocked = parseInt(data.datasets[0].data[tooltipItems.index], 10);
              var total = permitted + blocked;
              if (total > 0) {
                percentage = (100 * blocked) / total;
              }

              return (
                data.datasets[tooltipItems.datasetIndex].label +
                ": " +
                tooltipItems.yLabel +
                " (" +
                percentage.toFixed(1) +
                "%)"
              );
            }

            return data.datasets[tooltipItems.datasetIndex].label + ": " + tooltipItems.yLabel;
          },
        },
      },
      legend: {
        display: false,
      },
      scales: {
        xAxes: [
          {
            type: "time",
            stacked: true,
            time: {
              unit: "hour",
              displayFormats: {
                hour: "HH:mm",
              },
              tooltipFormat: "HH:mm",
            },
            gridLines: {
              color: gridColor,
              zeroLineColor: gridColor,
            },
            ticks: {
              fontColor: ticksColor,
            },
          },
        ],
        yAxes: [
          {
            stacked: true,
            ticks: {
              beginAtZero: true,
              fontColor: ticksColor,
            },
            gridLines: {
              color: gridColor,
            },
          },
        ],
      },
      maintainAspectRatio: false,
    },
  });

  // Pull in data via AJAX

  updateQueriesOverTime();

  // Create / load "Top Clients over Time" only if authorized
  var clientsChartEl = document.getElementById("clientsChart");
  if (clientsChartEl) {
    ctx = clientsChartEl.getContext("2d");
    clientsChart = new Chart(ctx, {
      type: utils.getGraphType(),
      data: {
        labels: [],
        datasets: [{ data: [] }],
      },
      options: {
        tooltips: {
          enabled: false,
          mode: "x-axis",
          custom: customTooltips,
          yAlign: "top",
          itemSort: function (a, b) {
            return b.yLabel - a.yLabel;
          },
          callbacks: {
            title: function (tooltipItem) {
              var label = tooltipItem[0].xLabel;
              var time = label.match(/(\d?\d):?(\d?\d?)/);
              var h = parseInt(time[1], 10);
              var m = parseInt(time[2], 10) || 0;
              var from = utils.padNumber(h) + ":" + utils.padNumber(m - 5) + ":00";
              var to = utils.padNumber(h) + ":" + utils.padNumber(m + 4) + ":59";
              return "Client activity from " + from + " to " + to;
            },
            label: function (tooltipItems, data) {
              return data.datasets[tooltipItems.datasetIndex].label + ": " + tooltipItems.yLabel;
            },
          },
        },
        legend: {
          display: false,
        },
        scales: {
          xAxes: [
            {
              type: "time",
              stacked: true,
              time: {
                unit: "hour",
                displayFormats: {
                  hour: "HH:mm",
                },
                tooltipFormat: "HH:mm",
              },
              gridLines: {
                color: gridColor,
                zeroLineColor: gridColor,
              },
              ticks: {
                fontColor: ticksColor,
              },
            },
          ],
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
                fontColor: ticksColor,
              },
              stacked: true,
              gridLines: {
                color: gridColor,
              },
            },
          ],
        },
        maintainAspectRatio: false,
        hover: {
          animationDuration: 0,
        },
      },
    });

    // Pull in data via AJAX
    updateClientsOverTime();
  }

  // Create / load "Top Domains" and "Top Advertisers" only if authorized
  if (document.getElementById("domain-frequency") && document.getElementById("ad-frequency")) {
    updateTopLists();
  }

  // Create / load "Top Clients" only if authorized
  if (document.getElementById("client-frequency")) {
    updateTopClientsChart();
  }

  $("#queryOverTimeChart").click(function (evt) {
    var activePoints = timeLineChart.getElementAtEvent(evt);
    if (activePoints.length > 0) {
      //get the internal index of slice in pie chart
      var clickedElementindex = activePoints[0]._index;

      //get specific label by index
      var label = timeLineChart.data.labels[clickedElementindex];

      //get value by index
      var from = label / 1000 - 300;
      var until = label / 1000 + 300;
      window.location.href = "queries.php?from=" + from + "&until=" + until;
    }

    return false;
  });

  $("#clientsChart").click(function (evt) {
    var activePoints = clientsChart.getElementAtEvent(evt);
    if (activePoints.length > 0) {
      //get the internal index of slice in pie chart
      var clickedElementindex = activePoints[0]._index;

      //get specific label by index
      var label = clientsChart.data.labels[clickedElementindex];

      //get value by index
      var from = label / 1000 - 300;
      var until = label / 1000 + 300;
      window.location.href = "queries.php?from=" + from + "&until=" + until;
    }

    return false;
  });

  if (document.getElementById("queryTypeChart")) {
    ctx = document.getElementById("queryTypeChart").getContext("2d");
    queryTypeChart = new Chart(ctx, {
      plugins: [ChartDataLabels],
      type: "horizontalBar",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
          },
        ],
      },
      options: barChartOptions,
    });

    // Pull in data via AJAX
    updateQueryTypes();
  }

  if (document.getElementById("forwardDestinationChart")) {
    ctx = document.getElementById("forwardDestinationChart").getContext("2d");
    forwardDestinationChart = new Chart(ctx, {
      plugins: [ChartDataLabels],
      type: "horizontalBar",
      data: {
        labels: [],
        datasets: [{ data: [] }],
      },
      options: barChartOptions,
    });

    // Pull in data via AJAX
    updateForwardDestinations();
  }
});

var IntlF = new Intl.NumberFormat();
var barChartOptions = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    datalabels: {
      color: $("body").css("color"),
      anchor: "end",
      align: "end",
      offset: -1,
      clamp: true,
      font: {
        weight: "bold",
        lineHeight: 1,
      },
      formatter: function (t) {
        return IntlF.format(t) + "%";
      },
    },
  },
  legend: {
    display: false,
  },
  tooltips: {
    enabled: false,
  },
  animation: {
    duration: 750,
  },
  cutoutPercentage: 0,
  onClick: barChartClicked,
  onHover: function (event, bar) {
    event.target.style.cursor = bar[0] ? "pointer" : "default";
  },
  scales: {
    xAxes: [
      {
        display: true,
        ticks: {
          fontColor: $(".graphs-ticks").css("color"),
          beginAtZero: true,
        },
        gridLines: {
          color: $(".graphs-grid").css("background-color"),
          zeroLineColor: $(".graphs-grid").css("background-color"),
        },
      },
    ],
    yAxes: [
      {
        ticks: {
          beginAtZero: true,
          fontColor: $("body").css("color"),
          mirror: true,
          z: 1,
          padding: -1,
          labelOffset: -17,
        },
        gridLines: {
          color: "transparent",
          zeroLineColor: $(".graphs-grid").css("background-color"),
        },
      },
    ],
  },
};

function barChartClicked(event, array) {
  if (event.target.id === "forwardDestinationChart") {
    var obj = encodeURIComponent(array[0]._model.label);
    if (obj.length > 0) {
      window.location.href = "queries.php?forwarddest=" + obj;
    }
  } else {
    //console.log(event, array);
    window.location.href = "queries.php?querytype=" + querytypeids[array[0]._index];
  }
}

// Check if we have to add padding so the value label isn't cropped
function calcLastTick(chart) {
  var lasttick = chart.scales["x-axis-0"].max;
  var tickstep = lasttick - chart.scales["x-axis-0"].ticks.at(-2);
  var maxval = Math.max.apply(null, chart.data.datasets[0].data);

  // width of entire x-scale (in pixels)
  var scaleW = chart.scales["x-axis-0"].width;

  // width of the longest bar (in pixels)
  var barW = (scaleW / lasttick) * maxval;

  if (scaleW - barW < 44) {
    // If there's no space to fit the label, adds an extra tick to the scale
    return lasttick + tickstep;
  } else {
    return lasttick;
  }
}

//destroy all chartjs customTooltips on window resize
window.addEventListener("resize", function () {
  $(".chartjs-tooltip").remove();
});
