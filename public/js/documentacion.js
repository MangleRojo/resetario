// Documentación - Tab Navigation
document.addEventListener('DOMContentLoaded', function () {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const ejeListItems = document.querySelectorAll('.eje-list-item');

    if (tabButtons.length === 0) return; // Not on documentation page

    // Function to activate a tab
    function activateTab(targetTab) {
        // Remove active class from all buttons and panels
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        tabPanels.forEach(panel => {
            panel.classList.remove('active');
            panel.setAttribute('hidden', '');
        });

        // Find and activate the corresponding button
        const targetButton = document.querySelector(`.tab-button[data-tab="${targetTab}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
            targetButton.setAttribute('aria-selected', 'true');
        }

        // Show corresponding panel
        const targetPanel = document.getElementById(`tab-${targetTab}`);
        if (targetPanel) {
            targetPanel.classList.add('active');
            targetPanel.removeAttribute('hidden');
        }
    }

    // Add click listeners to tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.dataset.tab;
            activateTab(targetTab);
        });
    });

    // Add click listeners to eje list items
    ejeListItems.forEach(item => {
        item.addEventListener('click', function () {
            const targetTab = this.dataset.tab;
            if (targetTab) {
                activateTab(targetTab);
            }
        });
    });

    console.log('Documentation tabs initialized');
});
