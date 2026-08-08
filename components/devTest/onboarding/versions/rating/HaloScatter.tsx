import HaloScreen, { type HaloStar } from './HaloScreen'

/**
 * Dev-only Rating ask · Logo halo (scattered) — hand-placed rather than computed, so nothing lands on a
 * shared radius or a shared axis. Two stars tuck close enough to overlap the mark's corners, which is what
 * keeps it from reading as a diagram; the other three fall away at mixed distances.
 */
const STARS: HaloStar[] = [
    { x: -74, y: -62, size: 50, opacity: 1 },
    { x: 66, y: -78, size: 36, opacity: 0.7 },
    { x: 88, y: 6, size: 44, opacity: 0.9 },
    { x: -88, y: 40, size: 32, opacity: 0.55 },
    { x: 16, y: 82, size: 40, opacity: 0.8 },
]

export default function RatingHaloScatter() {
    return <HaloScreen stars={STARS} field={252} />
}
