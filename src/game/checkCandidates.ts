import type { CompleteGrid } from '../../packages/engine/grid'
import type { GameCell } from '../state/gameStore'

export function candidatesContainSolutions(
  cells: ReadonlyArray<ReadonlyArray<GameCell>>,
  solution: CompleteGrid,
): boolean {
  let emptyEditableCells = 0

  for (let r = 0; r < cells.length; r += 1) {
    for (let c = 0; c < cells[r].length; c += 1) {
      const cell = cells[r][c]
      if (cell.given || cell.value != null) continue
      emptyEditableCells += 1
      if (!cell.notes.includes(solution[r][c])) return false
    }
  }

  return emptyEditableCells > 0
}
