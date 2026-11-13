import { SeverityModel } from './severity-model.js';
import { SeverityView } from './severity-view.js';
import { SeverityPresenter } from './severity-presenter.js';

/**
 * Wires the fire severity model, view and presenter together.
 */
export class SeverityFactory {
  /** @returns {{model: SeverityModel, view: SeverityView, presenter: SeverityPresenter}} */
  static create() {
    const model = new SeverityModel();
    const view = new SeverityView();
    const presenter = new SeverityPresenter(view, model);
    view.presenter = presenter;
    return { model, view, presenter };
  }
}
