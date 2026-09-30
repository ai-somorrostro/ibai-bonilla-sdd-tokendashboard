// Visualizations - Canvas bar charts for daily and weekly costs

const state = {
    allModels: []
};

fetch('mock-data.json')
    .then(response => response.json())
    .then(data => {
        state.allModels = data;
        renderCharts();
    })
    .catch(error => {
        console.error('Failed to load model data:', error);
    });

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

function renderBarChart(canvasId, period) {
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

    const costData = computeCosts(state.allModels, period);
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

    // Draw bars
    costData.forEach((d, i) => {
        const x = padding.left + i * barGroupWidth + barGroupWidth / 2;

        // Input bar
        const inputHeight = (d.inputCost / maxCost) * chartHeight;
        const inputX = x - barWidth - barGap / 2;
        const inputY = height - padding.bottom - inputHeight;
        ctx.fillStyle = '#b62225';
        ctx.fillRect(inputX, inputY, barWidth, inputHeight);

        // Output bar
        const outputHeight = (d.outputCost / maxCost) * chartHeight;
        const outputX = x + barGap / 2;
        const outputY = height - padding.bottom - outputHeight;
        ctx.fillStyle = '#9bc6e5';
        ctx.fillRect(outputX, outputY, barWidth, outputHeight);

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
    renderBarChart('dailyChart', 'daily');
    renderBarChart('weeklyChart', 'weekly');
}
