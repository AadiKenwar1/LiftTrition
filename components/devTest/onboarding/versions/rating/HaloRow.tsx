import HaloScreen, { type HaloStar } from './HaloScreen'

/**
 * Dev-only Rating ask · Logo halo (row beneath) — the mark above, five equal stars in a straight line under
 * it. The most literal of the layouts: it quotes the App Store's own icon-over-rating arrangement, so what
 * is being asked for is legible before a word is read. No size or opacity variation, on purpose — a real
 * five-star row is uniform, and staggering it would read as decoration instead of a rating.
 */
const SIZE = 40
const GAP = 12
const Y = 96

const STARS: HaloStar[] = Array.from({ length: 5 }, (_, i) => ({ x: (i - 2) * (SIZE + GAP), y: Y, size: SIZE }))

export default function RatingHaloRow() {
    return <HaloScreen stars={STARS} field={264} />
}
