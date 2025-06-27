const stackingContextTracker = {
  contexts: {},

  addContext(element) {
    const result = createsStackingContext(element);
    if (!result.isContext) return;

    element.setAttribute('z-tools-stacking-detected', '');
    const existingContext = this.getContext(element)
    if (existingContext) {
      existingContext.stacked = getChildrenZIndexes(element)
      return
    };

    const contextKey = `${element.tagName}.${element.classList.toString().replace(/\s+/g, '.')}`;
    const parent = this.findParentContext(element);

    const newContext = {
      element,
      details: result.properties,
      contexts: {},
      stacked: getChildrenZIndexes(element)
    };

    Object.defineProperties(newContext, {
      'parent': {
        value: parent,
        enumerable: false
      },
      'printPath': {
        value: function () {
          let currentContext = this;
          while (currentContext) {
            console.log(' -> ', currentContext.element, '\n');
            currentContext = currentContext.parent;
          }
        },
        enumerable: false
      }
    })

    if (parent) {
      parent.contexts[contextKey] = newContext;
    } else {
      this.contexts[contextKey] = newContext;
    }
  },

  getContext(element) {
    const findElement = (contexts) => {
      for (let key in contexts) {
        const context = contexts[key];
        if (context.element === element) {
          return context;
        }
        const found = findElement(context.contexts);
        if (found) return found;
      }
      return null;
    };
    return findElement(this.contexts);
  },

  findParentContext(childElement) {
    const findInContexts = (contexts) => {
      for (let key in contexts) {
        const context = contexts[key];
        if (context.element.contains(childElement) && context.element !== childElement) {
          const deeperContext = findInContexts(context.contexts);
          return deeperContext || context;
        }
      }
      return null;
    };
    return findInContexts(this.contexts);
  },

  removeContext(element) {
    const remove = (contexts) => {
      for (let key in contexts) {
        const context = contexts[key];
        if (context.element === element) {
          delete contexts[key];
          return true;
        }
        if (remove(context.contexts)) {
          return true;
        }
      }
      return false;
    };

    remove(this.contexts);
  },

  listContexts() {
    const logContexts = (contexts, prefix = '') => {
      for (let key in contexts) {
        console.log(`${prefix}${key}`);
        logContexts(contexts[key].contexts, prefix + '  ');
      }
    };

    logContexts(this.contexts);
  },

  recalculateChildrenZIndexes() {
    const recalculateForContext = (context) => {
      if (!context) return;
      context.stacked = getChildrenZIndexes(context.element);
      for (let key in context.contexts) {
        recalculateForContext(context.contexts[key]);
      }
    };

    // Start recalculation from the root contexts
    for (let key in this.contexts) {
      recalculateForContext(this.contexts[key]);
    }
  }
};

function cleanStyles(element) {
  const cleanElementStyles = (el) => {
    el.style.borderStyle = '';
    el.style.borderWidth = '';
    el.style.borderColor = '';
    el.classList.remove('context-child');
    el.removeAttribute('data-z-index');
    el.removeAttribute('z-tools-stacking-detected');
  }
  cleanElementStyles(element)
  Array.from(element.children).forEach(child => cleanElementStyles(child));
}

function createsStackingContext(element) {
  const style = window.getComputedStyle(element);
  let contextProperties = {};
  let isContext = false;
  const isRoot = element === document.documentElement;

  if (isRoot) {
    contextProperties['root-element'] = true;
  }

  const normalizeStyleValue = (value) => value === '' ? 'none' : value;

  const stackingConditions = [
    {
      name: "position/z-index",
      condition: ['absolute', 'relative'].includes(style.position) && normalizeStyleValue(style.zIndex) !== 'auto',
      property: style => ({ position: style.position, 'z-index': Number(style.zIndex) })
    },
    {
      name: "position",
      condition: ['fixed', 'sticky'].includes(style.position),
      property: style => ({ position: style.position })
    },
    {
      name: "container-type",
      condition: ['size', 'inline-size'].includes(style.containerType),
      property: style => ({ "container-type": style.containerType })
    },
    {
      name: "opacity",
      condition: parseFloat(style.opacity) < 1,
      property: style => ({ opacity: style.opacity })
    },
    {
      name: "mix-blend-mode",
      condition: normalizeStyleValue(style.mixBlendMode) !== 'normal',
      property: style => ({ 'mix-blend-mode': style.mixBlendMode })
    },
    {
      name: "transform",
      condition: normalizeStyleValue(style.transform) !== 'none',
      property: style => ({ transform: style.transform })
    },
    {
      name: "scale",
      condition: normalizeStyleValue(style.scale) !== 'none',
      property: style => ({ scale: style.scale })
    },
    {
      name: "rotate",
      condition: normalizeStyleValue(style.rotate) !== 'none',
      property: style => ({ rotate: style.rotate })
    },
    {
      name: "translate",
      condition: normalizeStyleValue(style.translate) !== 'none',
      property: style => ({ translate: style.translate })
    },
    {
      name: "filter",
      condition: normalizeStyleValue(style.filter) !== 'none',
      property: style => ({ filter: style.filter })
    },
    {
      name: "backdrop-filter",
      condition: normalizeStyleValue(style.backdropFilter) !== 'none',
      property: style => ({ 'backdrop-filter': style.backdropFilter })
    },
    // TODO: Backface-visibility
    {
      name: "perspective",
      condition: normalizeStyleValue(style.perspective) !== 'none',
      property: style => ({ perspective: style.perspective })
    },
    {
      name: "clip-path",
      condition: normalizeStyleValue(style.clipPath) !== 'none',
      property: style => ({ 'clip-path': style.clipPath })
    },
    {
      name: "mask/mask-image/mask-border",
      condition: normalizeStyleValue(style.mask) !== 'none' || normalizeStyleValue(style.maskImage) !== 'none' || (normalizeStyleValue(style.maskBorder) !== 'none' && normalizeStyleValue(style.maskBorder) !== undefined),
      property: style => ({ mask: style.mask, 'mask-image': style.maskImage, 'mask-border': style.maskBorder })
    },
    {
      name: "isolation",
      condition: style.isolation === 'isolate',
      property: style => ({ isolation: style.isolation })
    },
    {
      name: "contain",
      condition: style.contain.match(/paint|layout|strict|content/),
      property: style => ({ contain: style.contain })
    },
    {
      name: "flex-or-grid-child",
      condition: isChildOfDisplayTypeGridOrFlex(element) && normalizeStyleValue(style.zIndex) !== 'auto',
      property: style => ({ ...isChildOfDisplayTypeGridOrFlex(element), 'z-index': Number(style.zIndex) })
    }
  ];

  const willChangeProperties = stackingConditions.flatMap(cond => cond.name.split('/').map(prop => prop.trim()));

  stackingConditions.push({
    name: "will-change",
    condition: style.willChange.split(', ').some(prop => willChangeProperties.includes(prop.trim())),
    property: style => ({ 'will-change': style.willChange })
  });

  stackingConditions.forEach(({ condition, property }) => {
    if (condition) {
      isContext = true;
      Object.assign(contextProperties, property(style));
    }
  });

  return { isContext: isRoot || (isContext && hasChildWithZIndex(element)), properties: contextProperties };
}


function isChildOfDisplayTypeGridOrFlex(element) {
  let parent = element.parentElement;
  if (!parent) return;
  const parentStyle = window.getComputedStyle(parent);
  if (parentStyle.display === 'flex' || parentStyle.display === 'inline-flex' ||
    parentStyle.display === 'grid' || parentStyle.display === 'inline-grid') {
    return { 'parent-display': parentStyle.display };
  }
  return false;
}

function hasChildWithZIndex(element) {
  return Array.from(element.children).some(child => window.getComputedStyle(child).zIndex !== 'auto');
}

function getChildrenZIndexes(element) {
  // TODO: This is wrong assumption - stacking layers children are all relative to the nearest ancestor stacking layer, not immediate children.
  const children = Array.from(element.children);
  const zIndexes = children.map(child => parseInt(window.getComputedStyle(child).zIndex) || 0);
  const maxZIndex = Math.max(...zIndexes, 0); // Ensure we don't have negative values for scaling
  let previousHue = null;

  return children.map((child, index) => {
    const zIndex = zIndexes[index];
    // Scale the hue from 120 (green) to 25 (orange) based on z-index
    let hue = 240 - ((zIndex / (maxZIndex || 1)) * 210);
    // Ensure no two hues are within 5 degrees
    if (previousHue !== null && Math.abs(hue - previousHue) < 5) {
      hue += 5; // Adjust the hue to make it more distinct
      if (hue > 240) hue = 240; // Cap the hue if it exceeds the maximum
      if (hue < 30) hue = 30;   // Ensure it doesn't go below the minimum
    }
    previousHue = hue;
    const borderColor = `hsl(${hue}, 100%, 50%)`;

    child.classList.add('context-child');
    child.style.borderColor = borderColor;
    child.setAttribute('data-z-index', `Z-Index: ${zIndex}`); // Set for hover display

    return {
      element: child,
      zIndex,
    };
  });
};

function checkForStackingContexts(node) {
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node) {
        // Update this to if it has a z index at all.
        if (createsStackingContext(node)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  while (walker.nextNode()) {
    // if it is a context, add it to the tree
    stackingContextTracker.addContext(walker.currentNode);
    // otherwise, add the node to the current context's list of competitors
    
  }
}

function setupGlobalObserver() {
  const config = {
    childList: true,
    attributes: true,
    subtree: true,
    attributeOldValue: true,
    attributeFilter: ['style', 'class', 'id']
  };

  const handleMutations = mutations => {
    observer.disconnect();
    mutations.forEach(mutation => {
      mutation.removedNodes.forEach(node => { stacking.removeContext(node); });
    });
    checkForStackingContexts(document.body)
    stacking.recalculateChildrenZIndexes();
    observer.observe(document.body, config);
  }

  let timer

  const debouncedHandleMutations = mutations => {
    clearTimeout(timer);
    timer = setTimeout(() => handleMutations(mutations), 100);
  }

  const observer = new MutationObserver(debouncedHandleMutations);
  observer.observe(document.body, config);
}

function initStackingContextTracker() {
  window.stacking = Object.create(stackingContextTracker);
  window.stacking.addContext(document.documentElement);
  if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', setupGlobalObserver);
  } else {
    setupGlobalObserver();
  }
}

window.initStackingContextTracker = initStackingContextTracker;


// TODO: support pseudo elements :(


// snapshots os primary mode on access using proxy
// mutation watcher for live mode (with perf warning)
// grab all z's properties, then filter by those that create stacking ocntext, then put the tree together.
// Now we know what elements compete.