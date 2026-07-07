import { useLocalSearchParams } from 'expo-router'
import type { ComponentType } from 'react'
import ProgressScene from './scenes/ProgressScene'

/**
 * Routes /devTest/mockup?scene=X&mode=Y to a mockup scene.
 * Add a scene = drop it in ./scenes, register it here, add a DevHub GROUPS entry.
 */
const SCENES: Record<string, ComponentType<{ initialLift: boolean }>> = {
    progress: ProgressScene,
}

export default function MockupHost() {
    const { scene, mode } = useLocalSearchParams<{ scene?: string; mode?: string }>()
    const sceneStr = typeof scene === 'string' ? scene : scene?.[0]
    const modeStr = typeof mode === 'string' ? mode : mode?.[0]
    const Scene = SCENES[sceneStr ?? ''] ?? SCENES.progress
    return <Scene initialLift={modeStr !== 'nutrition'} />
}
