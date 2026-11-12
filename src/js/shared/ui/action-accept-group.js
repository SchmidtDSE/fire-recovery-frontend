import { ButtonStateManager } from './button-state-manager.js';

/**
 * ActionAcceptGroup - Manages a paired Action → Accept workflow
 *
 * This implements the Strategy Pattern for workflows that follow:
 * 1. Action button (can be repeated) - shows spinner while processing, resets on completion
 * 2. Accept button (finalizes) - both buttons turn green when accepted
 *
 * @example
 * const group = new ActionAcceptGroup({
 *   actionButton: document.getElementById('refine-button'),
 *   acceptButton: document.getElementById('accept-button'),
 *   actionConfig: { loadingText: 'Refining...', successText: 'Refined' },
 *   acceptConfig: { loadingText: 'Processing...', successText: 'Accepted' },
 *   onAction: async () => { ... },
 *   onAccept: async () => { ... }
 * });
 * group.initialize();
 */
export class ActionAcceptGroup {
  /**
   * @param {Object} config - Configuration object
   * @param {HTMLButtonElement} config.actionButton - The repeatable action button
   * @param {HTMLButtonElement} config.acceptButton - The finalize/accept button
   * @param {Object} config.actionConfig - ButtonStateManager options for action button
   * @param {Object} config.acceptConfig - ButtonStateManager options for accept button
   * @param {Function} config.onAction - Async function called when action button clicked
   * @param {Function} config.onAccept - Async function called when accept button clicked
   * @param {Function} [config.canAction] - Optional function returning boolean if action is allowed
   * @param {string} [config.actionDisabledMessage] - Message shown when action is disabled
   * @param {boolean} [config.enableAcceptAfterAction=true] - Whether to enable accept button after action succeeds
   */
  constructor(config) {
    this.actionButton = config.actionButton;
    this.acceptButton = config.acceptButton;
    this.actionConfig = {
      loadingText: 'Processing...',
      successText: 'Complete',
      resetAfterSuccess: true,
      resetDelay: 0,
      ...config.actionConfig
    };
    this.acceptConfig = {
      loadingText: 'Processing...',
      successText: 'Accepted',
      ...config.acceptConfig
    };
    this.onAction = config.onAction;
    this.onAccept = config.onAccept;
    this.canAction = config.canAction || (() => true);
    this.actionDisabledMessage = config.actionDisabledMessage || 'Action not available';
    this.enableAcceptAfterAction = config.enableAcceptAfterAction !== false;

    this.isFinalized = false;
    this.hasCompletedAction = false;
  }

  /**
   * Initialize event listeners on both buttons
   */
  initialize() {
    if (this.actionButton) {
      this.actionButton.addEventListener('click', () => this.handleAction());
    }
    if (this.acceptButton) {
      this.acceptButton.addEventListener('click', () => this.handleAccept());
    }
  }

  /**
   * Handle action button click
   */
  async handleAction() {
    if (this.isFinalized) return;

    if (!this.canAction()) {
      alert(this.actionDisabledMessage);
      return;
    }

    const manager = new ButtonStateManager(this.actionButton, this.actionConfig);

    try {
      await manager.execute(this.onAction);
      this.hasCompletedAction = true;

      // Enable accept button after successful action
      if (this.enableAcceptAfterAction && this.acceptButton) {
        this.acceptButton.disabled = false;
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  }

  /**
   * Handle accept button click - finalizes the workflow
   */
  async handleAccept() {
    if (this.isFinalized) return;

    // Disable action button while accepting
    if (this.actionButton) {
      this.actionButton.disabled = true;
    }

    const manager = new ButtonStateManager(this.acceptButton, this.acceptConfig);

    try {
      await manager.execute(this.onAccept);
      // On success, finalize both buttons
      this.finalize();
    } catch (error) {
      // Re-enable action button on error
      if (this.actionButton) {
        this.actionButton.disabled = false;
      }
      console.error('Accept failed:', error);
    }
  }

  /**
   * Finalize the workflow - both buttons turn green
   */
  finalize() {
    this.isFinalized = true;

    // Apply success state to action button
    if (this.actionButton) {
      ButtonStateManager.applySuccessState(
        this.actionButton,
        this.actionConfig.successText
      );
    }

    // Accept button already has success state from ButtonStateManager.execute()
  }

  /**
   * Reset the group to initial state
   */
  reset() {
    this.isFinalized = false;

    // Reset would need to restore original button states
    // This is typically handled by a full UI reset
  }

  /**
   * Check if the workflow has been finalized
   * @returns {boolean}
   */
  isComplete() {
    return this.isFinalized;
  }
}
