interface TimerData {
  startTime: number;
  stops: number[];
  total: number;
  count: number;
}

export class TimeTracker {
  private timers: Map<string, TimerData> = new Map();
  private readonly enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  start(key: string): void {
    if (!this.enabled) return;

    const timer = this.timers.get(key) || {
      startTime: 0,
      stops: [],
      total: 0,
      count: 0,
    };

    timer.startTime = performance.now();
    this.timers.set(key, timer);
  }

  stop(key: string): number {
    if (!this.enabled) return 0;

    const timer = this.timers.get(key);
    if (!timer) {
      console.warn(`Timer '${key}' was never started`);
      return 0;
    }

    const duration = performance.now() - timer.startTime;
    timer.stops.push(duration);
    timer.total += duration;
    timer.count++;

    return duration;
  }

  getStats(key: string): {
    min: number;
    max: number;
    avg: number;
    total: number;
    count: number;
    last: number;
  } | null {
    const timer = this.timers.get(key);
    if (!timer || timer.stops.length === 0) return null;

    return {
      min: Math.min(...timer.stops),
      max: Math.max(...timer.stops),
      avg: timer.total / timer.count,
      total: timer.total,
      count: timer.count,
      last: timer.stops[timer.stops.length - 1],
    };
  }

  printStats(key?: string): void {
    if (!this.enabled) return;

    const keys = key ? [key] : Array.from(this.timers.keys());

    keys.forEach((k) => {
      const stats = this.getStats(k);
      if (stats) {
        console.log(`Timer '${k}' stats:
  Count: ${stats.count}
  Last: ${stats.last.toFixed(2)}ms
  Min: ${stats.min.toFixed(2)}ms
  Max: ${stats.max.toFixed(2)}ms
  Avg: ${stats.avg.toFixed(2)}ms
  Total: ${stats.total.toFixed(2)}ms`);
      }
    });
  }

  reset(key?: string): void {
    if (key) {
      this.timers.delete(key);
    } else {
      this.timers.clear();
    }
  }
}
