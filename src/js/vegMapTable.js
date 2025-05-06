import { fireVegMatrixURL } from './constants.js';

$(document).ready(async function() {
    // Initialize DataTable first with empty data
    const table = $('#example').DataTable({
        columns: [
            { title: "Color", render: function(data) {
                return `<div style="width: 15px; height: 15px; background-color: ${data}"></div>`;
            }},
            { title: "Vegetation" },
            { title: "Hectares" },
            { title: "Percent of Full Park" },
            { title: "Percent of Burn Area" },
            { title: "Burn Severity Mean" },
            { title: "Burn Severity SD" }
        ]
    });

    try {
        // Fetch CSV data
        const response = await fetch(fireVegMatrixURL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse CSV text
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));
        const headers = rows[0];
        
        // Process data rows (skip header row)
        const data = rows.slice(1)
            .filter(row => row.length > 1) // Skip empty rows
            .map(row => {
                return [
                    row[1]?.trim() || '#000000', // color
                    row[0]?.trim() || '', // vegetation type
                    row[2]?.trim() || '', // hectares
                    row[3]?.trim() || '', // percent park
                    row[4]?.trim() || '', // percent burn area
                    row[5]?.trim() || '', // burn severity mean
                    row[6]?.trim() || ''  // burn severity SD
                ];
            });

        // Clear existing data and add new data
        table.clear();
        table.rows.add(data);
        table.draw();

    } catch (error) {
        console.error('Error loading CSV data:', error);
        // Optionally show error message to user
        $('#example').before(`<div class="error-message">Error loading data: ${error.message}</div>`);
    }
});