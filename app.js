// Sorting & Filtering - Table with sort and filter capabilities

const state = {
    allModels: [],
    sortColumn: null,
    sortDirection: 'asc',
    nameFilter: '',
    modalityFilter: ''
};

fetch('mock-data.json')
    .then(response => response.json())
    .then(data => {
        state.allModels = data;
        populateModalityFilter();
        setupEventListeners();
        renderTable();
    })
    .catch(error => {
        console.error('Failed to load model data:', error);
    });

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
        });
    });

    document.getElementById('filterName').addEventListener('input', (e) => {
        state.nameFilter = e.target.value.toLowerCase();
        renderTable();
    });

    document.getElementById('filterModality').addEventListener('change', (e) => {
        state.modalityFilter = e.target.value;
        renderTable();
    });
}

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
