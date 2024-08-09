const stackingContexts = {
  contexts: {}, // Stores elements and their details

  addContext(name, element) {
    if (!this.contexts[name]) {
      this.contexts[name] = element;
      console.log(`Added new stacking context: ${name}`);
    } else {
      console.log(`Stacking context ${name} already exists.`);
    }
  },

  removeContext(name) {
    if (this.contexts[name]) {
      delete this.contexts[name];
      console.log(`Removed stacking context: ${name}`);
    } else {
      console.log(`Stacking context ${name} not found.`);
    }
  },

  getContext(name) {
    return this.contexts[name];
  }
};



// Later, to stop observing
// stopObserving();


