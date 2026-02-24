export const GRID_SIZE = 20;

export function generateGrid() {
  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      let isShelf = false;
      // Shelves logic: y between 2 and 17, x in chunks of 2, leaving aisles
      if (y >= 2 && y <= 16 && y !== 9) { // y=9 is a middle horizontal aisle
        if (x >= 2 && x <= 17) {
          if (x % 4 === 2 || x % 4 === 3) {
            isShelf = true;
          }
        }
      }
      row.push({ x, y, isShelf });
    }
    grid.push(row);
  }
  return grid;
}

export const START_POS = { x: 0, y: GRID_SIZE - 1 };

export function getRandomValidAisle(grid) {
  const emptyCells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!grid[y][x].isShelf && !(x === START_POS.x && y === START_POS.y)) {
        // Also ensure it's adjacent to a shelf to count as a "pickable" location
        const isNextToShelf = 
          (x > 0 && grid[y][x-1].isShelf) || 
          (x < GRID_SIZE-1 && grid[y][x+1].isShelf) ||
          (y > 0 && grid[y-1][x].isShelf) ||
          (y < GRID_SIZE-1 && grid[y+1][x].isShelf);
          
        if (isNextToShelf) {
          emptyCells.push({x, y});
        }
      }
    }
  }
  const randomTarget = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  return randomTarget;
}
