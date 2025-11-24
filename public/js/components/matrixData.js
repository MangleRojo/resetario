// Random matrix generator with nested subdivisions
// Generates a hierarchical matrix with random subdivisions

export function generateRandomMatrix(rows = 12, cols = 12) {
    const matrix = [];
    
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push(generateRandomCell(0)); // 0 = top level
        }
        matrix.push(row);
    }
    
    return matrix;
}

function generateRandomCell(depth = 0) {
    // Randomly decide cell type
    const rand = Math.random();
    
    if (rand < 0.05) {
        // 5% chance: Simple cell (0 or 1)
        return Math.random() < 0.5 ? 0 : 1;
    } else if (rand < 0.30) {
        // 25% chance: 2x2 subdivision (can contain nested blocks)
        return {
            type: '2x2',
            data: Array.from({length: 4}, () => generate2x2Content(depth))
        };
    } else if (rand < 0.70) {
        // 40% chance: 4x4 subdivision
        return {
            type: '4x4',
            data: Array.from({length: 16}, () => generate4x4Content(depth))
        };
    } else {
        // 30% chance: 8x8 subdivision
        return {
            type: '8x8',
            data: Array.from({length: 64}, () => Math.random() < 0.6 ? 1 : 0)
        };
    }
}

function generate2x2Content(depth) {
    // Content for 2x2 blocks can be nested
    // Limit nesting to avoid too much recursion
    if (depth > 1) {
        // Too deep, just return simple cell
        return Math.random() < 0.6 ? 1 : 0;
    }
    
    const rand = Math.random();
    
    if (rand < 0.70) {
        // 70% chance: Simple cell (0 or 1)
        return Math.random() < 0.6 ? 1 : 0;
    } else {
        // 30% chance: Nested 4x4 block inside 2x2
        return {
            type: '4x4',
            data: Array.from({length: 16}, () => Math.random() < 0.6 ? 1 : 0)
        };
    }
}

function generate4x4Content(depth) {
    // Content for 4x4 blocks - no more nesting
    // Just return simple cells
    return Math.random() < 0.6 ? 1 : 0;
}

function generate8x8Content(depth) {
    // Content for 8x8 blocks - no more nesting
    // Just return simple cells
    return Math.random() < 0.6 ? 1 : 0;
}

// Generate initial random matrix
export const matrixData = generateRandomMatrix(12, 12);
