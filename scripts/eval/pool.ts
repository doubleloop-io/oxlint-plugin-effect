// `work` on every item, at most `concurrency` at a time; results in the order of the items.
export const runPool = async <A, B>(
    items: readonly A[],
    concurrency: number,
    work: (item: A) => Promise<B>,
) => {
    const results: B[] = []
    let next = 0
    const worker = async () => {
        while (next < items.length) {
            const index = next++
            const item = items[index]
            if (item !== undefined) results[index] = await work(item)
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
    return results
}
