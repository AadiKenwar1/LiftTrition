import HaloScreen, { type HaloStar } from './HaloScreen'

/**
 * Dev-only Rating ask · Logo halo (ring) — five stars evenly around the mark, tight enough that they read as
 * one object with it rather than as a border drawn at a distance. Per-star radius and size variation keeps
 * the pentagon from looking geometric. Everything else is HaloScreen.
 */
const RADII = [88, 84, 92, 86, 90]
const SIZES = [46, 34, 52, 38, 42]
const OPACITIES = [1, 0.6, 0.9, 0.55, 0.8]

const STARS: HaloStar[] = RADII.map((radius, i) => {
    const angle = (i / RADII.length) * Math.PI * 2 - Math.PI / 2
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, size: SIZES[i], opacity: OPACITIES[i] }
})

export default function RatingLogoHalo() {
    return <HaloScreen stars={STARS} field={264} />
}
