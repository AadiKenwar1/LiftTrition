export type GraphChartNoteKind = 'strength' | 'macro' | 'sets' | 'bodyweight'

export interface GraphChartNote {
    lines: string[]
}

export function getGraphChartNote(kind: GraphChartNoteKind, range: 7 | 14 | 21): GraphChartNote | undefined {
    if (range === 7) return undefined

    const windowDays = range / 7

    if (kind === 'strength') {
        return {
            lines: ['End-points: oldest & latest estimated 1RM', 'Middle-points: group lifts, best 1RM per group'],
        }
    }

    if (kind === 'macro') {
        return { lines: [windowDays === 2 ? 'Average for every 2 days' : 'Average for every 3 days'] }
    }

    if (kind === 'sets') {
        return { lines: [windowDays === 2 ? 'Sum of sets for every 2 days' : 'Sum of sets for every 3 days'] }
    }

    return { lines: [windowDays === 2 ? 'Average weight for every 2 days' : 'Average weight for every 3 days'] }
}
