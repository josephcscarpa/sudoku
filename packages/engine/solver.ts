import { createEmptyGrid, gridSize } from './grid'
import type { BoxSize, Digit, ValueGrid } from './grid'

type Candidate = Readonly<{ r: number; c: number; digit: Digit }>

class DataNode {
  left: DataNode = this
  right: DataNode = this
  up: DataNode = this
  down: DataNode = this
  column!: ColumnNode

  constructor(readonly candidate: Candidate | null) {}
}

class ColumnNode extends DataNode {
  size = 0

  constructor(readonly index: number) {
    super(null)
    this.column = this
  }
}

type SearchResult = Readonly<{
  count: number
  first: Candidate[] | null
}>

function appendColumn(root: ColumnNode, column: ColumnNode): void {
  column.left = root.left
  column.right = root
  root.left.right = column
  root.left = column
}

function appendToColumn(column: ColumnNode, node: DataNode): void {
  node.column = column
  node.up = column.up
  node.down = column
  column.up.down = node
  column.up = node
  column.size += 1
}

function linkRow(nodes: DataNode[]): void {
  nodes.forEach((node, index) => {
    node.left = nodes[(index + nodes.length - 1) % nodes.length]
    node.right = nodes[(index + 1) % nodes.length]
  })
}

function candidateConstraints(
  boxSize: BoxSize,
  candidate: Candidate,
): number[] {
  const size = gridSize(boxSize)
  const square = size * size
  const digitIndex = candidate.digit - 1
  const box =
    Math.floor(candidate.r / boxSize) * boxSize +
    Math.floor(candidate.c / boxSize)

  return [
    candidate.r * size + candidate.c,
    square + candidate.r * size + digitIndex,
    2 * square + candidate.c * size + digitIndex,
    3 * square + box * size + digitIndex,
  ]
}

function isWellFormed(boxSize: BoxSize, grid: ValueGrid): boolean {
  const size = gridSize(boxSize)
  return (
    grid.length === size &&
    grid.every(
      (row) =>
        row.length === size &&
        row.every(
          (value) =>
            value == null ||
            (Number.isInteger(value) && value >= 1 && value <= size),
        ),
    )
  )
}

function buildMatrix(boxSize: BoxSize, grid: ValueGrid): ColumnNode {
  const size = gridSize(boxSize)
  const root = new ColumnNode(-1)
  const columns = Array.from(
    { length: 4 * size * size },
    (_, index) => new ColumnNode(index),
  )
  columns.forEach((column) => appendColumn(root, column))

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const given = grid[r][c]
      const digits = given == null
        ? Array.from({ length: size }, (_, index) => index + 1)
        : [given]

      for (const digit of digits) {
        const candidate = { r, c, digit }
        const nodes = candidateConstraints(boxSize, candidate).map(
          (columnIndex) => {
            const node = new DataNode(candidate)
            appendToColumn(columns[columnIndex], node)
            return node
          },
        )
        linkRow(nodes)
      }
    }
  }

  return root
}

function cover(column: ColumnNode): void {
  column.right.left = column.left
  column.left.right = column.right

  for (let row = column.down; row !== column; row = row.down) {
    for (let node = row.right; node !== row; node = node.right) {
      node.down.up = node.up
      node.up.down = node.down
      node.column.size -= 1
    }
  }
}

function uncover(column: ColumnNode): void {
  for (let row = column.up; row !== column; row = row.up) {
    for (let node = row.left; node !== row; node = node.left) {
      node.column.size += 1
      node.down.up = node
      node.up.down = node
    }
  }

  column.right.left = column
  column.left.right = column
}

function chooseColumn(root: ColumnNode): ColumnNode {
  let best = root.right as ColumnNode
  for (
    let column = best.right as ColumnNode;
    column !== root;
    column = column.right as ColumnNode
  ) {
    if (column.size < best.size) {
      best = column
    }
  }
  return best
}

function runSearch(root: ColumnNode, limit: number): SearchResult {
  let count = 0
  let first: Candidate[] | null = null
  const selected: Candidate[] = []

  const visit = (): void => {
    if (count >= limit) return
    if (root.right === root) {
      count += 1
      first ??= [...selected]
      return
    }

    const column = chooseColumn(root)
    if (column.size === 0) return

    cover(column)
    for (let row = column.down; row !== column && count < limit; row = row.down) {
      selected.push(row.candidate as Candidate)
      for (let node = row.right; node !== row; node = node.right) {
        cover(node.column)
      }

      visit()

      for (let node = row.left; node !== row; node = node.left) {
        uncover(node.column)
      }
      selected.pop()
    }
    uncover(column)
  }

  visit()
  return { count, first }
}

function search(boxSize: BoxSize, grid: ValueGrid, limit: number): SearchResult {
  if (!isWellFormed(boxSize, grid) || limit <= 0) {
    return { count: 0, first: null }
  }
  return runSearch(buildMatrix(boxSize, grid), limit)
}

export function solve(boxSize: BoxSize, grid: ValueGrid): ValueGrid | null {
  const result = search(boxSize, grid, 1)
  if (result.first == null) return null

  const solved = createEmptyGrid(boxSize)
  for (const { r, c, digit } of result.first) {
    solved[r][c] = digit
  }
  return solved
}

export function countSolutions(
  boxSize: BoxSize,
  grid: ValueGrid,
  limit = 2,
): number {
  return search(boxSize, grid, limit).count
}
