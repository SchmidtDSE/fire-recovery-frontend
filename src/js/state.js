import { dispatch } from 'd3-dispatch';

// Create state store with dispatch
const FireStore = (() => {
  // Initial state
  const state = {
    // User inputs
    fireEventName: null,
    parkUnit: null,
    fireSeverityMetric: 'RBR',  // Default

    // URLs for assets
    intermediateAssets: {
      cogUrl: null,
      geojsonUrl: null,
    },
    
    finalAssets: {
      cogUrl: null,
      geojsonUrl: null,
    },
    
    // Processing state
    processingStatus: 'idle',  // 'idle', 'processing', 'success', 'error'
    currentStep: 'upload',     // 'upload', 'analyze', 'refine', 'resolve'
  };

  // Create dispatcher with our event types
  const dispatcher = dispatch(
    'stateChanged',
    'fireEventNameChanged',
    'parkUnitChanged', 
    'fireSeverityMetricChanged',
    'processingStatusChanged',
    'assetsChanged',
    'currentStepChanged',
    'reset'
  );

  // Store API
  return {
    // Get current state (returns copy to prevent direct modification)
    getState: () => ({...state}),
    
    // Register event listeners
    on: (event, callback) => {
      dispatcher.on(event, callback);
      return FireStore; // Enable chaining
    },
    
    // State update methods
    setFireEventName: (name) => {
      state.fireEventName = name;
      dispatcher.call('fireEventNameChanged', null, name);
      dispatcher.call('stateChanged', null, state);
      return FireStore;
    },
    
    setParkUnit: (unit) => {
      state.parkUnit = unit;
      dispatcher.call('parkUnitChanged', null, unit);
      dispatcher.call('stateChanged', null, state);
      return FireStore;
    },
    
    setFireSeverityMetric: (metric) => {
      state.fireSeverityMetric = metric;
      dispatcher.call('fireSeverityMetricChanged', null, metric);
      dispatcher.call('stateChanged', null, state);
      return FireStore;
    },
    
    setProcessingStatus: (status) => {
      state.processingStatus = status;
      dispatcher.call('processingStatusChanged', null, status);
      dispatcher.call('stateChanged', null, state);
      return FireStore;
    },
    
    setIntermediateAssets: (assets) => {
      state.intermediateAssets = {...state.intermediateAssets, ...assets};
      dispatcher.call('assetsChanged', null, {
        type: 'intermediate', 
        assets: state.intermediateAssets
      });
      dispatcher.call('stateChanged', null, state);
      return FireStore;
    },
    
    setFinalAssets: (assets) => {
      state.finalAssets = {...state.finalAssets, ...assets};
      dispatcher.call('assetsChanged', null, {
        type: 'final', 
        assets: state.finalAssets
      });
      dispatcher.call('stateChanged', null, state);
      return FireStore;
    },
    
    setCurrentStep: (step) => {
      state.currentStep = step;
      dispatcher.call('currentStepChanged', null, step);
      dispatcher.call('stateChanged', null, state);
      return FireStore;
    },
    
    resetState: () => {
      // Only reset certain parts of the state
      state.intermediateAssets = { cogUrl: null, geojsonUrl: null };
      state.finalAssets = { cogUrl: null, geojsonUrl: null };
      state.processingStatus = 'idle';
      state.currentStep = 'upload';
      dispatcher.call('reset', null);
      dispatcher.call('stateChanged', null, state);
      return FireStore;
    }
  };
})();

export default FireStore;