import { FireFactory } from './fire/FireFactory.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create MVP components
  const { model, view, presenter } = FireFactory.create();
  
  // Initialize the application
  presenter.initialize();
});