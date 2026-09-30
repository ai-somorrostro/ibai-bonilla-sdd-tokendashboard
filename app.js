// Full Dashboard - Table, Sorting, Filtering, Charts, Tooltips, Pin Panel

const state = {
    allModels: [],
    sortColumn: null,
    sortDirection: 'asc',
    nameFilter: '',
    modalityFilter: '',
    dailyPinned: [],
    weeklyPinned: [],
    barPositions: {},
    hoveredBar: null
};

fetch('mock-data.json')
    .then(response => response.json())
    .then(data => {
        state.allModels = data;
        populateModalityFilter();
        setupEventListeners();
        renderTable();
        renderCharts();
    })
    .catch(error => {
        console.error('Failed to load model data:', error);
    });

// --- Data Computation ---

function computeCosts(models, period) {
    return models.map(m => {
        const inputTokens = period === 'daily' ? m.inputTokensDay : m.inputTokensWeek;
        const outputTokens = period === 'daily' ? m.outputTokensDay : m.outputTokensWeek;
        return {
            name: m.name,
            inputCost: inputTokens * m.inputPricePerToken,
            outputCost: outputTokens * m.outputPricePerToken
        };
    });
}

function computeTotalCost(model, period) {
    if (period === 'daily') {
        return model.inputTokensDay * model.inputPricePerToken + model.outputTokensDay * model.outputPricePerToken;
    }
    return model.inputTokensWeek * model.inputPricePerToken + model.outputTokensWeek * model.outputPricePerToken;
}

// --- Table Rendering ---

function getFilteredAndSorted() {
    let models = [...state.allModels];

    if (state.nameFilter) {
        models = models.filter(m => m.name.toLowerCase().includes(state.nameFilter));
    }

    if (state.modalityFilter) {
        models = models.filter(m => m.inputModality === state.modalityFilter);
    }

    if (state.sortColumn) {
        models.sort((a, b) => {
            let valA = a[state.sortColumn];
            let valB = b[state.sortColumn];
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            if (valA < valB) return state.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return state.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return models;
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const models = getFilteredAndSorted();

    models.forEach(model => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${model.name}</td>
            <td>${model.inputPricePerToken}</td>
            <td>${model.outputPricePerToken}</td>
            <td>${model.ttft_ms}</td>
            <td>${model.inputModality}</td>
            <td>${model.outputModality}</td>
            <td>${model.inputTokensDay}</td>
            <td>${model.outputTokensDay}</td>
            <td>${model.inputTokensWeek}</td>
            <td>${model.outputTokensWeek}</td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === state.sortColumn) {
            th.classList.add(state.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

// --- Chart Rendering ---

function renderBarChart(canvasId, period, models) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const data = models || state.allModels;
    const costData = computeCosts(data, period);
    const maxCost = Math.max(...costData.flatMap(d => [d.inputCost, d.outputCost]));
    const barGroupWidth = chartWidth / costData.length;
    const barWidth = barGroupWidth * 0.3;
    const barGap = barGroupWidth * 0.05;

    ctx.clearRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = '#962f2b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw Y-axis labels
    ctx.fillStyle = '#a12737';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const value = (maxCost / ySteps) * i;
        const y = height - padding.bottom - (value / maxCost) * chartHeight;
        ctx.fillText('$' + value.toFixed(2), padding.left - 8, y + 4);
        ctx.strokeStyle = '#962f2b';
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }

    // Store bar positions for hit detection
    state.barPositions[canvasId] = [];

    // Draw bars
    costData.forEach((d, i) => {
        const x = padding.left + i * barGroupWidth + barGroupWidth / 2;

        // Input bar
        const inputHeight = (d.inputCost / maxCost) * chartHeight;
        const inputX = x - barWidth - barGap / 2;
        const inputY = height - padding.bottom - inputHeight;
        ctx.fillStyle = '#b62225';
        ctx.fillRect(inputX, inputY, barWidth, inputHeight);
        state.barPositions[canvasId].push({ x: inputX, y: inputY, width: barWidth, height: inputHeight, model: data[i], barType: 'input' });

        // Output bar
        const outputHeight = (d.outputCost / maxCost) * chartHeight;
        const outputX = x + barGap / 2;
        const outputY = height - padding.bottom - outputHeight;
        ctx.fillStyle = '#9bc6e5';
        ctx.fillRect(outputX, outputY, barWidth, outputHeight);
        state.barPositions[canvasId].push({ x: outputX, y: outputY, width: barWidth, height: outputHeight, model: data[i], barType: 'output' });

        // X-axis label (truncated)
        ctx.fillStyle = '#a12737';
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        const maxLabelWidth = barGroupWidth - 4;
        let label = d.name;
        while (ctx.measureText(label).width > maxLabelWidth && label.length > 3) {
            label = label.slice(0, -1);
        }
        if (label !== d.name) label = label.slice(0, -1) + '...';
        ctx.fillText(label, x, height - padding.bottom + 14);
    });
}

function renderCharts() {
    const filtered = getFilteredAndSorted();
    renderBarChart('dailyChart', 'daily', filtered);
    renderBarChart('weeklyChart', 'weekly', filtered);
}

// --- Event Handling ---

function populateModalityFilter() {
    const select = document.getElementById('filterModality');
    const modalities = [...new Set(state.allModels.map(m => m.inputModality))];
    modalities.forEach(mod => {
        const option = document.createElement('option');
        option.value = mod;
        option.textContent = mod;
        select.appendChild(option);
    });
}

function setupEventListeners() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (state.sortColumn === column) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortColumn = column;
                state.sortDirection = 'asc';
            }
            renderTable();
            renderCharts();
        });
    });

    document.getElementById('filterName').addEventListener('input', (e) => {
        state.nameFilter = e.target.value.toLowerCase();
        renderTable();
        renderCharts();
    });

    document.getElementById('filterModality').addEventListener('change', (e) => {
        state.modalityFilter = e.target.value;
        renderTable();
        renderCharts();
    });

    setupCanvasEvents('dailyChart', 'daily');
    setupCanvasEvents('weeklyChart', 'weekly');
}

function setupCanvasEvents(canvasId, period) {
    const canvas = document.getElementById(canvasId);

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = hitTest(canvasId, x, y);

        if (hit) {
            state.hoveredBar = { ...hit, period };
            showTooltip(e.clientX, e.clientY, hit.model, period);
            highlightBar(canvasId, hit.index, true);
        } else {
            state.hoveredBar = null;
            hideTooltip();
            clearHighlight(canvasId);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        state.hoveredBar = null;
        hideTooltip();
        clearHighlight(canvasId);
    });

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = hitTest(canvasId, x, y);

        if (hit) {
            pinModel(hit.model, period);
        }
    });
}

function hitTest(canvasId, x, y) {
    const positions = state.barPositions[canvasId];
    if (!positions) return null;

    for (let i = 0; i < positions.length; i++) {
        const bar = positions[i];
        if (x >= bar.x && x <= bar.x + bar.width && y >= bar.y && y <= bar.y + bar.height) {
            return { index: i, model: bar.model, barType: bar.barType };
        }
    }
    return null;
}

// --- Tooltip ---

function showTooltip(x, y, model, period) {
    const tooltip = document.getElementById('tooltip');
    const inputTokens = period === 'daily' ? model.inputTokensDay : model.inputTokensWeek;
    const outputTokens = period === 'daily' ? model.outputTokensDay : model.outputTokensWeek;
    const inputCost = (inputTokens * model.inputPricePerToken).toFixed(2);
    const outputCost = (outputTokens * model.outputPricePerToken).toFixed(2);

    tooltip.innerHTML = `
        <div class="tooltip-title">${model.name}</div>
        <div class="tooltip-row"><span>Input Price:</span><span>$${model.inputPricePerToken.toExponential(2)}</span></div>
        <div class="tooltip-row"><span>Output Price:</span><span>$${model.outputPricePerToken.toExponential(2)}</span></div>
        <div class="tooltip-row"><span>TTFT:</span><span>${model.ttft_ms}ms</span></div>
        <div class="tooltip-row"><span>Input Modality:</span><span>${model.inputModality}</span></div>
        <div class="tooltip-row"><span>Output Modality:</span><span>${model.outputModality}</span></div>
        <div class="tooltip-row"><span>Input Tokens:</span><span>${inputTokens.toLocaleString()}</span></div>
        <div class="tooltip-row"><span>Output Tokens:</span><span>${outputTokens.toLocaleString()}</span></div>
        <div class="tooltip-row"><span>Input Cost:</span><span>$${inputCost}</span></div>
        <div class="tooltip-row"><span>Output Cost:</span><span>$${outputCost}</span></div>
    `;
    tooltip.style.display = 'block';

    const tooltipRect = tooltip.getBoundingClientRect();
    let left = x + 12;
    let top = y + 12;

    if (left + tooltipRect.width > window.innerWidth) {
        left = x - tooltipRect.width - 12;
    }
    if (top + tooltipRect.height > window.innerHeight) {
        top = y - tooltipRect.height - 12;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

// --- Bar Highlighting ---

function highlightBar(canvasId, index, active) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const positions = state.barPositions[canvasId];
    if (!positions || !positions[index]) return;

    const bar = positions[index];
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderBarChart(canvasId, canvasId === 'dailyChart' ? 'daily' : 'weekly');

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.shadowColor = 'rgba(182, 34, 37, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = bar.barType === 'input' ? '#b62225' : '#9bc6e5';
    ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
    ctx.restore();
}

function clearHighlight(canvasId) {
    renderBarChart(canvasId, canvasId === 'dailyChart' ? 'daily' : 'weekly');
}

// --- Pin Management ---

function pinModel(model, period) {
    const pinnedList = period === 'daily' ? state.dailyPinned : state.weeklyPinned;
    const existing = pinnedList.findIndex(p => p.name === model.name);
    if (existing !== -1) {
        pinnedList.splice(existing, 1);
    }

    pinnedList.push(model);

    if (pinnedList.length > 3) {
        pinnedList.shift();
    }

    renderPinnedModels();
}

function unpinModel(period, index) {
    const pinnedList = period === 'daily' ? state.dailyPinned : state.weeklyPinned;
    pinnedList.splice(index, 1);
    renderPinnedModels();
}

function renderPinnedModels() {
    renderPinnedForPeriod('daily', state.dailyPinned, 'dailyPanel', 'dailyPinned');
    renderPinnedForPeriod('weekly', state.weeklyPinned, 'weeklyPanel', 'weeklyPinned');
}

function renderPinnedForPeriod(period, pinnedList, panelId, containerId) {
    const container = document.getElementById(containerId);
    const panel = document.getElementById(panelId);
    container.innerHTML = '';

    if (pinnedList.length === 0) {
        panel.classList.remove('visible');
        return;
    }

    panel.classList.add('visible');

    const minCost = Math.min(...pinnedList.map(m => computeTotalCost(m, period)));

    pinnedList.forEach((m, index) => {
        const totalCost = computeTotalCost(m, period);
        const isCostEffective = totalCost === minCost;

        const card = document.createElement('div');
        card.className = 'pinned-card' + (isCostEffective ? ' cost-effective' : '');

        const inputTokens = period === 'daily' ? m.inputTokensDay : m.inputTokensWeek;
        const outputTokens = period === 'daily' ? m.outputTokensDay : m.outputTokensWeek;
        const inputCost = (inputTokens * m.inputPricePerToken).toFixed(2);
        const outputCost = (outputTokens * m.outputPricePerToken).toFixed(2);
        const totalCostStr = totalCost.toFixed(2);

        card.innerHTML = `
            ${isCostEffective ? '<span class="cost-badge">BEST</span>' : ''}
            <div class="card-header">
                <span class="card-title">${m.name}</span>
                <button class="card-close" onclick="unpinModel('${period}', ${index})">&times;</button>
            </div>
            <div class="card-row"><span>Input Price</span><span>$${m.inputPricePerToken.toExponential(2)}</span></div>
            <div class="card-row"><span>Output Price</span><span>$${m.outputPricePerToken.toExponential(2)}</span></div>
            <div class="card-row"><span>TTFT</span><span>${m.ttft_ms}ms</span></div>
            <div class="card-row"><span>Input Modality</span><span>${m.inputModality}</span></div>
            <div class="card-row"><span>Output Modality</span><span>${m.outputModality}</span></div>
            <div class="card-row"><span>Input Tokens</span><span>${inputTokens.toLocaleString()}</span></div>
            <div class="card-row"><span>Output Tokens</span><span>${outputTokens.toLocaleString()}</span></div>
            <div class="card-row"><span>Input Cost</span><span>$${inputCost}</span></div>
            <div class="card-row"><span>Output Cost</span><span>$${outputCost}</span></div>
            <div class="card-row"><span>Total Cost</span><span>$${totalCostStr}</span></div>
        `;
        container.appendChild(card);
    });
}
