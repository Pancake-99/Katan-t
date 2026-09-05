/**
 * The decorative band along the bottom of the main menu: a fanned hand of
 * cards, a pair of dice, and a corner of a board. Annotated "cartas",
 * "tablero" in the mockup. Purely ornamental — hidden from assistive tech.
 */

const CARD_FAN = [
  { x: 0, y: 34, rotate: -17 },
  { x: 52, y: 13, rotate: -9 },
  { x: 105, y: 0, rotate: 0 },
  { x: 158, y: 13, rotate: 9 },
  { x: 210, y: 34, rotate: 17 },
]

/* Each card rotates about a pivot below itself, which throws the outer two
   past a tight box — hence the negative origin and the extra height. */
export function CardFan() {
  return (
    <svg className="mm-decor mm-decor--cards" viewBox="-28 0 328 134" aria-hidden="true">
      {CARD_FAN.map((card) => (
        <g key={card.x} transform={`rotate(${card.rotate} ${card.x + 30} ${card.y + 90})`}>
          <rect
            x={card.x}
            y={card.y}
            width="60"
            height="86"
            rx="6"
            className="mm-decor__card"
          />
          <rect
            x={card.x + 8}
            y={card.y + 8}
            width="44"
            height="70"
            rx="3"
            className="mm-decor__card-inner"
          />
        </g>
      ))}
    </svg>
  )
}

/* Pip positions on a 46x46 face, in thirds. */
const PIPS = {
  2: [
    [0.3, 0.3],
    [0.7, 0.7],
  ],
  3: [
    [0.72, 0.28],
    [0.5, 0.5],
    [0.28, 0.72],
  ],
}

function Die({ x, y, rotate, value }) {
  return (
    <g transform={`rotate(${rotate} ${x + 23} ${y + 23})`}>
      <rect x={x} y={y} width="46" height="46" rx="9" className="mm-decor__die" />
      {PIPS[value].map(([px, py]) => (
        <circle key={`${px}-${py}`} cx={x + 46 * px} cy={y + 46 * py} r="4" className="mm-decor__pip" />
      ))}
    </g>
  )
}

export function Dice() {
  return (
    <svg className="mm-decor mm-decor--dice" viewBox="0 0 130 100" aria-hidden="true">
      <Die x={64} y={4} rotate={12} value={2} />
      <Die x={6} y={38} rotate={-8} value={3} />
    </svg>
  )
}

const R = 36
const HEX_W = Math.sqrt(3) * R
const ROWS = [3, 4, 3]
const WIDEST = Math.max(...ROWS)

/* Pointy-top hex, so tiles meet along vertical edges the way the board does. */
function hexPoints(cx, cy) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90)
    return `${(cx + R * Math.cos(angle)).toFixed(1)},${(cy + R * Math.sin(angle)).toFixed(1)}`
  }).join(' ')
}

const TERRAIN = [
  'var(--terrain-forest)',
  'var(--terrain-pasture)',
  'var(--terrain-fields)',
  'var(--terrain-hills)',
  'var(--terrain-mountains)',
  'var(--terrain-desert)',
]

const TILES = ROWS.flatMap((count, row) =>
  Array.from({ length: count }, (_, col) => ({
    key: `${row}-${col}`,
    cx: ((WIDEST - count) * HEX_W) / 2 + HEX_W * (col + 0.5),
    cy: R + row * 1.5 * R,
    fill: TERRAIN[(row * WIDEST + col) % TERRAIN.length],
  })),
)

export function BoardCorner() {
  return (
    <svg
      className="mm-decor mm-decor--board"
      viewBox={`0 0 ${WIDEST * HEX_W} ${5 * R}`}
      aria-hidden="true"
    >
      {TILES.map((tile) => (
        <polygon
          key={tile.key}
          points={hexPoints(tile.cx, tile.cy)}
          fill={tile.fill}
          className="mm-decor__hex"
        />
      ))}
    </svg>
  )
}
