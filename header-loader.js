// header-loader.js
// Loads _header.html into #header-placeholder on every page

(function() {
    document.addEventListener('DOMContentLoaded', function() {
        var placeholder = document.getElementById('header-placeholder');
        if (!placeholder) return;
        fetch('_header.html')
            .then(function(response) { return response.text(); })
            .then(function(html) { placeholder.innerHTML = html; })
            .catch(function(err) { console.error('Failed to load header:', err); });
    });
})();
