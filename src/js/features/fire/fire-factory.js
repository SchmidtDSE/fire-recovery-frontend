import { FireModel } from './fire-model.js';
import { FireView } from './fire-view.js';
import { FirePresenter } from './fire-presenter.js';

/**
 * Factory for creating Fire MVP components
 */
export class FireFactory {
  /**
   * Create a complete Fire MVP setup
   * @returns {Object} The created components
   */
  static create() {
    const model = new FireModel();
    const view = new FireView(null); // Temporarily null
    const presenter = new FirePresenter(view, model);
    
    // Set the presenter reference in the view
    view.presenter = presenter;
    
    return { model, view, presenter };
  }
}