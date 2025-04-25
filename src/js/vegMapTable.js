$(document).ready(function() {
    var data = [
        { color: "red", col1: "Row 1 Col 1", col2: "Row 1 Col 2", col3: "Row 1 Col 3", col4: "Row 1 Col 4", col5: "Row 1 Col 5" },
        { color: "blue", col1: "Row 2 Col 1", col2: "Row 2 Col 2", col3: "Row 2 Col 3", col4: "Row 2 Col 4", col5: "Row 2 Col 5" },
        { color: "green", col1: "Row 3 Col 1", col2: "Row 3 Col 2", col3: "Row 3 Col 3", col4: "Row 3 Col 4", col5: "Row 3 Col 5" },
        { color: "orange", col1: "Row 4 Col 1", col2: "Row 4 Col 2", col3: "Row 4 Col 3", col4: "Row 4 Col 4", col5: "Row 4 Col 5" },
        { color: "purple", col1: "Row 5 Col 1", col2: "Row 5 Col 2", col3: "Row 5 Col 3", col4: "Row 5 Col 4", col5: "Row 5 Col 5" },
        { color: "pink", col1: "Row 6 Col 1", col2: "Row 6 Col 2", col3: "Row 6 Col 3", col4: "Row 6 Col 4", col5: "Row 6 Col 5" }
    ];

    var tableBody = $('#example tbody');

    data.forEach(function(item) {
        var row = $('<tr>');
        row.append($(`<td><div style="width: 15px; height: 15px; background-color: ${item.color};"></div></td>`));
        row.append($('<td>').text(item.col1));
        row.append($('<td>').text(item.col2));
        row.append($('<td>').text(item.col3));
        row.append($('<td>').text(item.col4));
        row.append($('<td>').text(item.col5));
        tableBody.append(row);
    });

    $('#example').DataTable();
});
