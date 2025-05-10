import { FireModel } from './FireModel.js';
import { FireView } from './FireView.js';
import { FirePresenter } from './FirePresenter.js';

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