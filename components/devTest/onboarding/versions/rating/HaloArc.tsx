import HaloScreen, { type HaloStar } from './HaloScreen'

/**
 * Dev-only Rating ask · Logo halo (arc) — the five stars sweep over the top of the mark like a crown, the
 * middle one largest and tapering to the ends. Leaves the space under the logo empty, so the composition
 * sits higher and reads as something placed on the app rather than something surrounding it.
 */
const SIZES = [32, 44, 54, 44, 32]
const OPACITIES = [0.6, 0.85, 1, 0.85, 0.6]
const START = -164
const END = -16
const RADIUS = 88

const STARS: HaloStar[] = SIZES.map((size, i) => {
    const deg = START + ((END - START) * i) / (SIZES.length - 1)
    const angle = (deg * Math.PI) / 180
    return { x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS, size, opacity: OPACITIES[i] }
})

export default function RatingHaloArc() {
    return <HaloScreen stars={STARS} field={252} />
}
