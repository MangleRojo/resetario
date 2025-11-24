import { generateRandomMatrix } from './matrixData.js';

export class MatrixGrid {
    constructor(containerId, rows = 12, cols = 12) {
        this.container = document.getElementById(containerId);
        this.rows = rows;
        this.cols = cols;
        this.grid = generateRandomMatrix(rows, cols);
    }

    regenerate() {
        // Generate a new random matrix and re-render
        this.grid = generateRandomMatrix(this.rows, this.cols);
        this.render();
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';
        this.container.classList.add('matrix-grid');

        const rows = this.grid.length;
        const cols = this.grid[0].length;
        
        this.container.style.display = 'grid';
        this.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        this.container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        this.container.style.width = '100%';
        this.container.style.height = 'auto';
        this.container.style.aspectRatio = `${cols}/${rows}`;

        this.grid.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = this.createCell(cell);
                // Random animation delay
                cellElement.style.animationDelay = `${Math.random() * 1.2}s`;
                this.container.appendChild(cellElement);
            });
        });
    }

    createCell(cell) {
        // Handle different cell types
        if (typeof cell === 'object' && cell.type) {
            // Subdivided block
            return this.createSubdividedBlock(cell);
        } else if (Array.isArray(cell)) {
            // Legacy format: simple 2x2 array
            return this.createSubdividedBlock({type: '2x2', data: cell});
        } else {
            // Simple cell (0 or 1)
            return this.createSimpleCell(cell);
        }
    }

    createSimpleCell(value) {
        const cellDiv = document.createElement('div');
        cellDiv.classList.add('matrix-cell');
        
        if (value === 1) {
            cellDiv.classList.add('cell-black');
        } else {
            cellDiv.classList.add('cell-empty');
        }

        return cellDiv;
    }

    createSubdividedBlock(blockConfig) {
        const { type, data } = blockConfig;
        const container = document.createElement('div');
        container.classList.add('matrix-cell', 'subdivided-block');
        
        let gridSize;
        if (type === '2x2') {
            gridSize = 2;
            container.classList.add('subdivision-2x2');
        } else if (type === '4x4') {
            gridSize = 4;
            container.classList.add('subdivision-4x4');
        } else if (type === '8x8') {
            gridSize = 8;
            container.classList.add('subdivision-8x8');
        }
        
        // Create grid inside this cell
        container.style.display = 'grid';
        container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        container.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
        
        // Adjust gap based on subdivision level
        if (type === '8x8') {
            container.style.gap = '1px';
        } else if (type === '4x4') {
            container.style.gap = '2px';
        } else {
            container.style.gap = '3px';
        }
        
        // Create sub-cells
        data.forEach((subCell, index) => {
            // Support nested subdivisions
            const subCellElement = typeof subCell === 'object' || Array.isArray(subCell)
                ? this.createCell(subCell)
                : this.createSimpleCell(subCell);
            
            subCellElement.classList.add('sub-cell');
            // Random sub-cell animations
            subCellElement.style.animationDelay = `${Math.random() * 0.8}s`;
            container.appendChild(subCellElement);
        });
        
        return container;
    }
}
