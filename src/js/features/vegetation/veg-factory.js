import { VegetationModel } from './veg-model.js';
import { VegetationView } from './veg-view.js';
import { VegetationPresenter } from './veg-presenter.js';

/**
 * Factory for creating Vegetation Impact MVP components
 */
export class VegetationFactory {
  /**
   * Create a complete Vegetation Impact MVP setup
   * @param {Object} customView - Optional custom view implementation
   * @returns {Object} The created components
   */
  static create(customView = null) {
    const model = new VegetationModel();
    // Use the custom view if provided, otherwise create a new VegetationView
    const view = customView || new VegetationView(null);
    const presenter = new VegetationPresenter(view, model);
    
    // Set presenter reference in view
    if (typeof view.setPresenter === 'function') {
      view.setPresenter(presenter);
    }
    
    return { model, view, presenter };
  }
}