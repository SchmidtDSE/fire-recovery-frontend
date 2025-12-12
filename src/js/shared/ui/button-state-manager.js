/**
 * ButtonStateManager - Manages button loading/success/error states
 *
 * Provides consistent visual feedback for async button actions:
 * - Loading: Shows spinner with custom text
 * - Success: Shows checkmark with green background
 * - Error: Restores original button state
 *
 * @example
 * const manager = new ButtonStateManager(button, {
 *   loadingText: 'Processing...',
 *   successText: 'Complete'
 * });
 * await manager.execute(() => someAsyncOperation());
 */
export class ButtonStateManager {
  /**
   * @param {HTMLButtonElement} button - The button element to manage
   * @param {Object} options - Configuration options
   * @param {string} [options.loadingText='Processing...'] - Text shown during loading
   * @param {string} [options.successText='Complete'] - Text shown on success
   * @param {string} [options.successColor='#28a745'] - Background color on success
   * @param {boolean} [options.showCheckmark=true] - Whether to show checkmark icon on success
   * @param {boolean} [options.resetAfterSuccess=false] - Whether to reset button after success
   * @param {number} [options.resetDelay=2000] - Delay in ms before reset (if resetAfterSuccess is true)
   */
  constructor(button, options = {}) {
    this.button = button;
    this.originalContent = button.innerHTML;
    this.originalBgColor = button.style.backgroundColor;
    this.originalDisabled = button.disabled;

    this.options = {
      loadingText: 'Processing...',
      successText: 'Complete',
      successColor: '#4a7c59',
      showCheckmark: true,
      resetAfterSuccess: false,
      resetDelay: 2000,
      ...options
    };
  }

  /**
   * Show loading state with spinner
   */
  showLoading() {
    this.button.disabled = true;
    this.button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.options.loadingText}`;
  }

  /**
   * Show success state with checkmark and green background
   */
  showSuccess() {
    this.button.disabled = true;
    if (this.options.showCheckmark) {
      this.button.innerHTML = `<i class="fas fa-check"></i> ${this.options.successText}`;
    }
    this.button.style.backgroundColor = this.options.successColor;

    if (this.options.resetAfterSuccess) {
      setTimeout(() => this.reset(), this.options.resetDelay);
    }
  }

  /**
   * Show error state - restores original button appearance
   */
  showError() {
    this.button.disabled = false;
    this.button.innerHTML = this.originalContent;
    this.button.style.backgroundColor = this.originalBgColor;
  }

  /**
   * Reset button to original state
   */
  reset() {
    this.button.disabled = this.originalDisabled;
    this.button.innerHTML = this.originalContent;
    this.button.style.backgroundColor = this.originalBgColor;
  }

  /**
   * Apply success state to a button (static helper for one-off use)
   * @param {HTMLButtonElement} button - The button element
   * @param {string} successText - Text to display
   * @param {string} [successColor='#4a7c59'] - Background color
   */
  static applySuccessState(button, successText, successColor = '#4a7c59') {
    if (button) {
      button.disabled = true;
      button.innerHTML = `<i class="fas fa-check"></i> ${successText}`;
      button.style.backgroundColor = successColor;
    }
  }

  /**
   * Execute an async function with automatic state management
   * Shows loading → success/error states automatically
   *
   * @param {Function} asyncFn - Async function to execute
   * @returns {Promise<*>} - Result of asyncFn
   * @throws {Error} - Re-throws any error from asyncFn after showing error state
   */
  async execute(asyncFn) {
    this.showLoading();
    try {
      const result = await asyncFn();
      this.showSuccess();
      return result;
    } catch (error) {
      this.showError();
      throw error;
    }
  }
}
