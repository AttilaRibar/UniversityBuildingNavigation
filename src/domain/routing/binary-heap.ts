/**
 * Array-backed binary min-heap. Items with equal priority pop in insertion
 * order, which keeps the router deterministic when several paths tie.
 */
export class BinaryHeap<T> {
  private readonly entries: { item: T; priority: number; seq: number }[] = [];
  private nextSeq = 0;

  get size(): number {
    return this.entries.length;
  }

  push(item: T, priority: number): void {
    this.entries.push({ item, priority, seq: this.nextSeq++ });
    this.siftUp(this.entries.length - 1);
  }

  pop(): T | undefined {
    const top = this.entries[0];
    const last = this.entries.pop();
    if (top === undefined || last === undefined) return undefined;
    if (this.entries.length > 0) {
      this.entries[0] = last;
      this.siftDown(0);
    }
    return top.item;
  }

  private less(i: number, j: number): boolean {
    const a = this.entries[i];
    const b = this.entries[j];
    return a.priority < b.priority || (a.priority === b.priority && a.seq < b.seq);
  }

  private swap(i: number, j: number): void {
    [this.entries[i], this.entries[j]] = [this.entries[j], this.entries[i]];
  }

  private siftUp(index: number): void {
    let i = index;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(i, parent)) return;
      this.swap(i, parent);
      i = parent;
    }
  }

  private siftDown(index: number): void {
    let i = index;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < this.entries.length && this.less(left, smallest)) smallest = left;
      if (right < this.entries.length && this.less(right, smallest)) smallest = right;
      if (smallest === i) return;
      this.swap(i, smallest);
      i = smallest;
    }
  }
}
