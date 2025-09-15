# MVP Pattern Refactoring Plan

## Understanding MVP Violations and Solutions

### 🎯 **Core MVP Principle**
> "The View should be a passive rendering layer, the Model should manage data and business rules, and the Presenter should coordinate between them while containing application logic."

---

## **1. Views Performing Business Logic** 

### 🚨 **Why This is Problematic**
- **Violates Single Responsibility**: Views should only handle UI rendering and user input capture
- **Reduces Testability**: Business logic in views is harder to unit test
- **Tight Coupling**: Views become dependent on data sources and business rules
- **Code Duplication**: Business logic may be repeated across multiple views

### ✅ **Correct Responsibility Distribution**
- **View**: Render UI, capture events, display data provided by presenter
- **Presenter**: Contain business logic, coordinate data flow, make decisions
- **Model**: Manage data state, handle persistence, enforce business rules

### 📋 **Specific Violations and Solutions**

#### **Violation 1: Data Fetching in Views**
```javascript
// ❌ WRONG: VegetationView doing data fetching (veg-view.js:84-101)
async showVegetationImpact() {
  const vegetationCommunities = stateManager.getVegetationCommunities();
  if (vegetationCommunities && vegetationCommunities.length > 0) {
    this.displayStructuredVegetationTable(vegetationCommunities);
  }
}
```

**Problem**: View is making business decisions about data retrieval and validation.

**Solution**: Move data fetching responsibility to Presenter
```javascript
// ✅ CORRECT: Presenter handles business logic
// In VegetationPresenter:
async showVegetationImpact() {
  const communities = this.model.getVegetationCommunities();
  if (this.validateCommunityData(communities)) {
    this.view.displayVegetationTable(communities);
  } else {
    this.view.showError('No vegetation data available');
  }
}

// In VegetationView:
displayVegetationTable(communities) {
  // Only UI rendering logic here
}
```

#### **Violation 2: Business Logic in View Methods**
```javascript
// ❌ WRONG: FireView containing validation logic (fire-view.js:542-548)
loadCOGLayer() {
  const parkUnit = state.parkUnit;
  if (!parkUnit || !parkUnit.veg_cog_url) {
    this.showErrorState('No vegetation data available for this park unit');
    return;
  }
}
```

**Problem**: View is making business decisions about data validity.

**Solution**: Presenter validates, View only renders
```javascript
// ✅ CORRECT: In FirePresenter
handleLoadVegetationMap() {
  if (!this.model.hasValidParkUnit()) {
    this.view.showError('No vegetation data available for this park unit');
    return;
  }
  const vegUrl = this.model.getVegetationMapUrl();
  this.view.displayVegetationLayer(vegUrl);
}
```

#### **Violation 3: State Management in Views**
```javascript
// ❌ WRONG: View directly accessing state manager (veg-view.js:340-351)
downloadCsv() {
  const csvUrl = stateManager.getVegetationCsvUrl();
  if (csvUrl) {
    // download logic
  }
}
```

**Problem**: View bypasses MVP hierarchy, creates tight coupling.

**Solution**: Presenter mediates all state access
```javascript
// ✅ CORRECT: In VegetationPresenter
handleCsvDownload() {
  const csvUrl = this.model.getCsvDownloadUrl();
  if (csvUrl) {
    this.view.triggerDownload(csvUrl, 'vegetation_impact_analysis.csv');
  } else {
    this.view.showError('CSV download not available');
  }
}
```

---

## **2. Presenters Manipulating DOM Directly**

### 🚨 **Why This is Problematic**
- **Violates MVP Boundaries**: Presenter should not know about DOM structure
- **Reduces View Flexibility**: Hard-coded DOM manipulation prevents UI changes
- **Testing Complexity**: DOM-dependent presenters are harder to unit test
- **Coupling**: Presenter becomes dependent on specific HTML structure

### ✅ **Correct Responsibility Distribution**
- **Presenter**: Make decisions about WHAT to display, WHEN to display it
- **View**: Handle HOW to display it, WHERE in the DOM it goes

### 📋 **Specific Violations and Solutions**

#### **Violation 1: Direct DOM Manipulation in Presenter**
```javascript
// ❌ WRONG: FirePresenter manipulating DOM (fire-presenter.js:271-299)
addVegetationButton() {
  const buttonGroup = document.querySelector('#refinement-container .button-group');
  const resolveButton = document.createElement('button');
  resolveButton.id = 'resolve-button';
  resolveButton.className = 'action-button';
  // ... more DOM manipulation
  buttonGroup.appendChild(resolveButton);
}
```

**Problem**: Presenter knows about DOM structure and creation.

**Solution**: Presenter delegates to View with semantic instructions
```javascript
// ✅ CORRECT: In FirePresenter
enableVegetationAnalysis() {
  this.view.addActionButton({
    id: 'vegetation-analysis',
    label: 'Analyze Vegetation Impact',
    icon: 'fas fa-leaf',
    handler: () => this.handleVegetationAnalysis(),
    location: 'refinement-actions'
  });
}

// In FireView
addActionButton(config) {
  // View handles all DOM specifics
  const button = this.createButton(config);
  this.getButtonContainer(config.location).appendChild(button);
}
```

#### **Violation 2: Cross-Component DOM Access**
```javascript
// ❌ WRONG: Presenter accessing other components directly (fire-presenter.js:291-294)
resolveButton.addEventListener('click', () => {
  const vegPresenter = window.app.components.vegetation.presenter;
  if (vegPresenter) {
    vegPresenter.handleVegMapResolution();
  }
});
```

**Problem**: Direct coupling between components, global state dependency.

**Solution**: Implement Component Communication Pattern
```javascript
// ✅ CORRECT: Use event system or mediator
// In FirePresenter
enableVegetationAnalysis() {
  this.view.addActionButton({
    id: 'vegetation-analysis',
    handler: () => this.requestVegetationAnalysis()
  });
}

requestVegetationAnalysis() {
  // Use event bus or mediator
  this.eventBus.emit('vegetation:analysis:requested', {
    fireData: this.model.getAnalysisData()
  });
}

// In VegetationPresenter
constructor() {
  this.eventBus.on('vegetation:analysis:requested', (data) => {
    this.handleAnalysisRequest(data);
  });
}
```

---

## **3. Models with Mixed Responsibilities**

### 🚨 **Why This is Problematic**
- **God Object Antipattern**: Models become too large and complex
- **Violation of SRP**: Models handle both data and presentation concerns
- **Difficult Maintenance**: Changes in one area affect unrelated functionality
- **Testing Complexity**: Hard to isolate specific behaviors for testing

### ✅ **Correct Responsibility Distribution**
- **Model**: Pure data management, business rules, API communication
- **Service Layer**: Complex business operations that span multiple models
- **Presenter**: Application flow logic, UI state management

### 📋 **Specific Violations and Solutions**

#### **Violation 1: Complex Event Orchestration in Models**
```javascript
// ❌ WRONG: FireModel with complex notification logic (fire-model.js:112-124)
notify(event, data) {
  if (this.listeners[event]) {
    this.listeners[event].forEach(callback => callback(data));
  }
  // Always notify of state changed
  if (event !== 'stateChanged') {
    console.log("State Change - Event: ", event, "Data: ", data);
    console.log("Current State: ", stateManager.getSharedState());
    this.notify('stateChanged', this.getState());
  }
}
```

**Problem**: Model handling presentation-layer concerns (logging, complex event chains).

**Solution**: Extract to separate Event Management Service
```javascript
// ✅ CORRECT: Create dedicated event service
class ModelEventManager {
  constructor(model) {
    this.model = model;
    this.listeners = {};
  }
  
  notify(event, data) {
    this.notifyListeners(event, data);
    this.handleEventSideEffects(event, data);
  }
  
  handleEventSideEffects(event, data) {
    if (event !== 'stateChanged') {
      this.logStateChange(event, data);
      this.notify('stateChanged', this.model.getState());
    }
  }
}

// Model becomes simpler
class FireModel {
  constructor() {
    this.eventManager = new ModelEventManager(this);
    this.data = {};
  }
  
  setFireEventName(name) {
    this.data.fireEventName = name;
    this.eventManager.notify('fireEventNameChanged', name);
  }
}
```

#### **Violation 2: State Structure Knowledge in Models**
```javascript
// ❌ WRONG: Model knowing about complex state structure (fire-model.js:257)
const severityCogUrls = {
  ...stateManager.getSharedState().assets.refined.severityCogUrls,
  [metric]: assets.cogUrl
};
```

**Problem**: Model is coupled to specific state manager implementation.

**Solution**: Create State Abstraction Layer
```javascript
// ✅ CORRECT: Abstract state operations
class FireStateAdapter {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }
  
  updateSeverityUrl(type, metric, url) {
    const path = `assets.${type}.severityCogUrls.${metric}`;
    this.stateManager.setNestedValue(path, url);
  }
  
  getSeverityUrl(type, metric) {
    return this.stateManager.getNestedValue(`assets.${type}.severityCogUrls.${metric}`);
  }
}

// Model uses abstraction
class FireModel {
  setFinalAssets(assets) {
    if (assets.cogUrl) {
      this.stateAdapter.updateSeverityUrl('refined', this.currentMetric, assets.cogUrl);
    }
  }
}
```

---

## **4. Tight Coupling Through Shared Dependencies**

### 🚨 **Why This is Problematic**
- **Global State Issues**: Changes in state manager affect all components
- **Testing Difficulty**: Hard to isolate components for testing
- **Dependency Hell**: Components become impossible to use independently
- **Inflexibility**: Can't easily swap implementations or add new features

### ✅ **Correct Responsibility Distribution**
- **Dependency Injection**: Components receive their dependencies
- **Interface Segregation**: Components depend on abstractions, not concretions
- **Loose Coupling**: Components communicate through well-defined interfaces

### 📋 **Specific Violations and Solutions**

#### **Violation 1: Direct State Manager Usage**
```javascript
// ❌ WRONG: All components directly importing stateManager
import stateManager from '../../core/state-manager.js';

class FireModel {
  getState() {
    const sharedState = stateManager.getSharedState();
    // ...
  }
}
```

**Problem**: Tight coupling to specific state implementation.

**Solution**: Dependency Injection with Interfaces
```javascript
// ✅ CORRECT: Define state interface
interface IStateProvider {
  getSharedState(): AppState;
  updateSharedState(key: string, value: any, source: string): void;
}

// Inject dependency
class FireModel {
  constructor(stateProvider: IStateProvider) {
    this.stateProvider = stateProvider;
  }
  
  getState() {
    const sharedState = this.stateProvider.getSharedState();
    // ...
  }
}

// In application setup
const stateProvider = new StateManagerAdapter(stateManager);
const fireModel = new FireModel(stateProvider);
```

#### **Violation 2: Cross-Component Direct Access**
```javascript
// ❌ WRONG: Direct access to other components
const vegPresenter = window.app.components.vegetation.presenter;
```

**Problem**: Components know about application structure.

**Solution**: Event Bus or Mediator Pattern
```javascript
// ✅ CORRECT: Event-driven communication
class ComponentMediator {
  constructor() {
    this.components = new Map();
    this.eventBus = new EventBus();
  }
  
  register(name, component) {
    this.components.set(name, component);
    component.setEventBus(this.eventBus);
  }
  
  requestAction(sourceComponent, targetComponent, action, data) {
    this.eventBus.emit(`${targetComponent}:${action}`, {
      source: sourceComponent,
      data
    });
  }
}

// Components use mediator
class FirePresenter {
  requestVegetationAnalysis() {
    this.eventBus.emit('vegetation:analyze', {
      fireData: this.model.getCurrentFireData()
    });
  }
}
```

---

## **Implementation Priority**

### **Phase 1: Foundation (High Impact, Low Risk)**
1. **Extract View Business Logic** - Move data fetching and validation to presenters
2. **Create View Abstraction Methods** - Replace direct DOM manipulation with semantic methods
3. **Implement Basic Event Bus** - Reduce direct component coupling

### **Phase 2: Architecture (Medium Impact, Medium Risk)**  
1. **Create State Abstractions** - Wrap state manager with interfaces
2. **Extract Service Layer** - Move complex business operations out of models
3. **Implement Dependency Injection** - Make components more testable

### **Phase 3: Optimization (Lower Impact, Higher Risk)**
1. **Refactor State Management** - Consider more sophisticated state patterns
2. **Advanced Component Communication** - Implement full mediator pattern
3. **Performance Optimizations** - Add caching, lazy loading, etc.

---

## **Expected Benefits**

- ✅ **Improved Testability**: Each layer can be tested in isolation
- ✅ **Better Maintainability**: Changes in one layer don't cascade
- ✅ **Enhanced Flexibility**: Easier to swap implementations
- ✅ **Clearer Responsibilities**: Each class has a single, clear purpose
- ✅ **Reduced Coupling**: Components depend on abstractions, not implementations

This refactoring plan provides a roadmap for transforming the current codebase from a "good" MVP implementation to an "excellent" one that fully adheres to the pattern's principles.