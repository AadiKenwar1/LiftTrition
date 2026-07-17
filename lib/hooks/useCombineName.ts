import { joinItemNames } from '@/context/NutritionContext/functions/entryBuilders'
import { useEffect, useRef, useState } from 'react'

// Pre-fills the combined meal name from the staged items until the user edits
// it; toggling combine off resets both. Callers must useMemo `stagedNames`.
// Interaction behavior is verified on the Combine Dev Hub page (visual gate);
// the join/fallback logic itself is Jest-covered in entryBuilders.
export function useCombineName(combineItems: boolean, stagedNames: { name: string; quantity?: number }[]) {
    const [name, setName] = useState('')
    const edited = useRef(false)

    useEffect(() => {
        if (!combineItems) {
            setName('')
            edited.current = false
            return
        }
        if (!edited.current) setName(joinItemNames(stagedNames))
    }, [combineItems, stagedNames])

    const onChange = (text: string) => {
        edited.current = true
        setName(text)
    }

    return [name, onChange] as const
}
