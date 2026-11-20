export class StateHandler {
  private condition: boolean = false;
  private rejectCondition: ((reason?: Error) => void) | null = null;
  private resolveCondition: (() => void) | null = null;

  isConditionTrue(): boolean {
    return this.condition;
  }

  reset() {
    this.condition = false;
    this.clearPromises();
  }

  // Reject when condition triggers false
  setConditionFalse() {
    this.condition = false;
    if (this.rejectCondition) {
      this.rejectCondition(new Error('Condition was set to false'));
      this.clearPromises();
    }
  }

  // Resolve when condition triggers true
  setConditionTrue() {
    this.condition = true;
    if (this.resolveCondition) {
      this.resolveCondition();
      this.clearPromises();
    }
  }

  // Return Promise awaiting condition to become true
  waitForCondition(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.condition) {
        resolve(); // Resolve immediately if already true
      } else {
        this.resolveCondition = resolve;
        this.rejectCondition = reject;
      }
    });
  }

  // Clean up resolve/reject functions
  private clearPromises() {
    this.resolveCondition = null;
    this.rejectCondition = null;
  }
}
