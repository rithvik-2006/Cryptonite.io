export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute: number;
  private requestTimes: number[] = [];

  constructor(requestsPerMinute: number) {
    this.requestsPerMinute = requestsPerMinute;
  }

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const now = Date.now();
    
    // Remove timestamps older than 1 minute
    this.requestTimes = this.requestTimes.filter(time => now - time < 60000);

    if (this.requestTimes.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const delay = 60000 - (now - oldestRequest);
      await this.sleep(delay);
    }

    const task = this.queue.shift();
    if (task) {
      this.requestTimes.push(Date.now());
      try {
        await task();
      } catch (err) {
        // Silently catch here to prevent blocking queue, handled in throttle promise
      }
    }

    this.processQueue();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
