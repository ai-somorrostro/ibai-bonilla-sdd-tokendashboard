// Dashboard Display - Fetch and render all 10 models in a table

const state = {
    allModels: []
};

fetch('mock-data.json')
    .then(response => response.json())
    .then(data => {
        state.allModels = data;
        renderTable();
    })
    .catch(error => {
        console.error('Failed to load model data:', error);
    });

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    state.allModels.forEach(model => {
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
}
