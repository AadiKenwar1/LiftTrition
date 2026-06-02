export type DownsampleAggregation = 'avg' | 'max' | 'sum'

function bucketValue(values: number[], precision: number, aggregation: DownsampleAggregation): number {
    if (values.length === 0) return 0

    const factor = Math.pow(10, precision)
    const round = (n: number) => (precision === 0 ? Math.round(n) : Math.round(n * factor) / factor)

    if (aggregation === 'max') {
        return round(Math.max(...values))
    }

    if (aggregation === 'sum') {
        return round(values.reduce((a, v) => a + v, 0))
    }

    return round(values.reduce((a, v) => a + v, 0) / values.length)
}

function bucketFromPoints(
    bucket: Array<{ day: string; value: number }>,
    precision: number,
    aggregation: DownsampleAggregation,
): { day: string; value: number } {
    const firstDate = bucket[0].day
    const lastDate = bucket[bucket.length - 1].day
    const values = bucket.map((point) => point.value)
    const dateLabel = bucket.length === 1 ? firstDate : `${firstDate}-${lastDate}`

    return {
        day: dateLabel,
        value: bucketValue(values, precision, aggregation),
    }
}

/** Keeps oldest and newest raw; compresses the middle into (targetCount - 2) buckets. */
export function downsampleDataPreserveEndpoints(
    data: Array<{ day: string; value: number }>,
    targetCount = 7,
    precision = 0,
    aggregation: DownsampleAggregation = 'max',
): Array<{ day: string; value: number }> {
    if (targetCount < 3) {
        throw new Error('targetCount must be at least 3 to preserve endpoints and bucket the middle')
    }

    if (data.length <= targetCount) return data

    const first = data[0]
    const last = data[data.length - 1]
    const middle = data.slice(1, -1)
    const middleBucketCount = targetCount - 2

    const middleBuckets: Array<{ day: string; value: number }> = []
    const n = middle.length

    for (let i = 0; i < middleBucketCount; i++) {
        const start = Math.floor((i * n) / middleBucketCount)
        const end = Math.floor(((i + 1) * n) / middleBucketCount)
        const slice = middle.slice(start, end)
        if (slice.length === 0) continue
        middleBuckets.push(bucketFromPoints(slice, precision, aggregation))
    }

    return [first, ...middleBuckets, last]
}

export function downsampleData(
    data: Array<{ day: string; value: number }>,
    bucketSize: number,
    precision = 0,
    aggregation: DownsampleAggregation = 'avg',
): Array<{ day: string; value: number }> {
    if (bucketSize === 1) return data

    if (data.length < bucketSize) return data

    const result: Array<{ day: string; value: number }> = []

    for (let i = 0; i < data.length; i += bucketSize) {
        const bucket = data.slice(i, i + bucketSize)
        if (bucket.length === 0) continue

        result.push(bucketFromPoints(bucket, precision, aggregation))
    }

    return result
}
