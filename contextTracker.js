const stackingContexts = {
  contexts: new Map(), // Map to store name-element pairs

  addContext(name, element) {
    if (!this.contexts.has(name)) {
      this.contexts.set(name, element);
      console.log(`Added new stacking context: ${name}`);
    } else {
      console.log(`Stacking context ${name} already exists.`);
    }
  },

  removeContext(name) {
    if (this.contexts.has(name)) {
      this.contexts.delete(name);
      console.log(`Removed stacking context: ${name}`);
    } else {
      console.log(`Stacking context ${name} not found.`);
    }
  },

  getContext(name) {
    return this.contexts.get(name);
  }
};
