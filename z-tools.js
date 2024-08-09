const stackingContextTracker = {
  contexts: {},

  addContext(element) {
    const result = createsStackingContext(element);
    if (!result.isContext) return;
    element.setAttribute('z-tools-stacking-detected', '');
    if (this.getContext(element)) return;

    const contextKey = `${element.tagName}.${element.classList.toString().replace(/\s+/g, '.')}`;
    const parent = this.findParentContext(element);

    const newContext = {
      element,
      details: result.properties,
      contexts: {},
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
          console.log(`Removed stacking context: ${key}`);
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
  }
};

// function createsStackingContext(element) {
//   const style = window.getComputedStyle(element);
//   return (
//     element === document.documentElement ||
//     ((['absolute', 'relative', 'fixed', 'sticky'].includes(style.position) && style.zIndex !== 'auto') ||
//       parseFloat(style.opacity) < 1 ||
//       style.transform !== 'none' ||
//       style.filter !== 'none' ||
//       style.perspective !== 'none' ||
//       style.clipPath !== 'none' ||
//       (style.mask !== 'none' || style.maskImage !== 'none' || style.maskBorder !== 'none') ||
//       style.mixBlendMode !== 'normal' ||
//       style.isolation === 'isolate' ||
//       style.contain.match(/paint|layout/)) && hasChildWithZIndex(element)
//   );
// }

// TODO handle the ' ;' case where it is not none but isnt defined. 
function createsStackingContext(element) {
  const style = window.getComputedStyle(element);
  // TODO: change this to object
  let contextProperties = [];
  let isContext;
  let isRoot = element === document.documentElement;

  if (isRoot) {
    contextProperties.push("root element");
  }
  if (['absolute', 'relative', 'fixed', 'sticky'].includes(style.position) && style.zIndex !== 'auto') {
    isContext = true;
    contextProperties.push(`position/zIndex: ${style.position}/${style.zIndex}`);
  }
  if (parseFloat(style.opacity) < 1) {
    isContext = true;
    contextProperties.push(`opacity: ${style.opacity}`);
  }
  if (style.transform !== 'none') {
    isContext = true;
    contextProperties.push(`transform: ${style.transform}`);
  }
  if (style.filter !== 'none') {
    isContext = true;
    contextProperties.push(`filter: ${style.filter}`);
  }
  if (style.perspective !== 'none') {
    isContext = true;
    contextProperties.push(`perspective: ${style.perspective}`);
  }
  if (style.clipPath !== 'none') {
    isContext = true;
    contextProperties.push(`clip-path: ${style.clipPath}`);
  }
  if (style.mask !== 'none' || style.maskImage !== 'none' || (style.maskBorder !== 'none' && style.maskBorder !== undefined)) {
    isContext = true;
    contextProperties.push(`mask/maskImage/maskBorder: ${style.mask}/${style.maskImage}/${style.maskBorder}`);
  }
  if (style.mixBlendMode !== 'normal') {
    isContext = true;
    contextProperties.push(`mix-blend-mode: ${style.mixBlendMode}`);
  }
  if (style.isolation === 'isolate') {
    isContext = true;
    contextProperties.push(`isolation: ${style.isolation}`);
  }
  if (style.willChange.split(', ').some(prop => ['transform', 'opacity', 'filter', 'perspective', 'clip-path', 'mask', 'maskImage', 'maskBorder', 'position', 'zIndex'].includes(prop.trim()))) {
    isContext = true;
    contextProperties.push(`will-change: ${style.willChange}`);
  }
  if (style.contain.match(/paint|layout/)) {
    isContext = true;
    contextProperties.push(`contain: ${style.contain}`);
  }

  // Check if the element is a child of a flex or grid container that affects stacking context
  if (isChildOfDisplayType(element, 'flex') || isChildOfDisplayType(element, 'grid')) {
    isContext = true;
    contextProperties.push(`child of ${style.display} container with non-auto zIndex`);
  }

  return { isContext: isRoot || isContext && hasChildWithZIndex(element), properties: contextProperties };
}

function isChildOfDisplayType(element, displayType) {
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (((displayType === 'flex' && (parentStyle.display === 'flex' || parentStyle.display === 'inline-flex')) ||
      (displayType === 'grid' && (parentStyle.display === 'grid' || parentStyle.display === 'inline-grid'))) &&
      parentStyle.zIndex !== 'auto') {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

function hasChildWithZIndex(element) {
  return Array.from(element.children).some(child => window.getComputedStyle(child).zIndex !== 'auto');
}

function checkAndManageContext(node) {
  if (node.nodeType === Node.ELEMENT_NODE && createsStackingContext(node)) {
    stackingContextTracker.addContext(node);
  }
}

function checkForStackingContexts(node) {
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node) {
        if (createsStackingContext(node)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    },
    false
  );
  while (walker.nextNode()) {
    stackingContextTracker.addContext(walker.currentNode);
  }
}

function setupGlobalObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          checkAndManageContext(node);
          checkForStackingContexts(node);
        }
      }); if (mutation.type === 'attributes') {
        checkAndManageContext(mutation.target);
      }
      mutation.removedNodes.forEach(node => stackingContextTracker.removeContext(node));
    });
  });

  const config = {
    childList: true,
    attributes: true,
    subtree: true,
    attributeOldValue: true,
    attributeFilter: ['style', 'class', 'id']
  };

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
