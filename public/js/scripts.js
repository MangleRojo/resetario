import { MatrixGrid } from './components/MatrixGrid.js';
import { DotsBackground } from './components/DotsBackground.js';

document.addEventListener('DOMContentLoaded', () => {
    // Background Animation
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
        new DotsBackground(mainContainer);
    }

    // Mobile Menu Logic
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            nav.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
                nav.classList.remove('active');
            }
        });
    }

    // Matrix Grid Initialization - COMMENTED OUT
    // const artContainer = document.querySelector('.art-container');
    // const staticImage = document.querySelector('.main-art');
    
    // if (artContainer && staticImage) {
    //     // Create a container for the grid
    //     const gridContainer = document.createElement('div');
    //     gridContainer.id = 'matrix-grid-container';
    //     
    //     // Insert grid container before the static image
    //     artContainer.insertBefore(gridContainer, staticImage);
    //     
    //     // Hide static image (or remove it)
    //     staticImage.style.display = 'none';

    //     // Initialize and render the grid with 5x4 dimensions
    //     const matrix = new MatrixGrid('matrix-grid-container', 5, 4);
    //     matrix.render();
    //     
    //     // Optional: Regenerate matrix every 10 seconds
    //     // setInterval(() => {
    //     //     matrix.regenerate();
    //     // }, 10000);
    // }
});
