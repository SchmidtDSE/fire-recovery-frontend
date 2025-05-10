import { VegetationModel } from './veg-model.js';
import { VegetationPresenter } from './veg-presenter.js';

/**
 * Factory for creating Vegetation Impact MVP components
 */
export class VegetationFactory {
  /**
   * Create a complete Vegetation Impact MVP setup
   * @param {Object} view - Optional view implementation
   * @returns {Object} The created components
   */
  static create(view = null) {
    const model = new VegetationModel();
    const presenter = new VegetationPresenter(view, model);
    
    // If we have a view, set its presenter
    if (view && typeof view.setPresenter === 'function') {
      view.setPresenter(presenter);
    }
    
    return { model, view, presenter };
  }
}