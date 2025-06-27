
// Nodes that are stacking context boundaries
// Nodes that have z index set.

// The tree is structured such that every node is a stacking context boundary
// Holds a set of nodes that are competing within the parent stacking context
// that is, they 1) are not themselves a context and 2) do not have another context in between them and the current context

const stacking = {
  'root': {
    el: document.documentElement,
    properties: {},
    competitors: []
  }
}

function genId() {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  const hexString = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  const chunks = [];
  for (let i = 0; i < hexString.length; i += 4) {
    chunks.push(hexString.substring(i, i + 4));
  }
  return chunks.join('-');
}

function hasZIndex(element) {
  const style = window.getComputedStyle(element);
  return style.zIndex !== 'auto'
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

function checkForStackingContexts(node) {
  let currentStackingContext, currentStackingContextKey;
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node) {
        // Update this to if it has a z index at all.
        if (hasZIndex(node)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  while (walker.nextNode()) {
    console.log(walker.currentNode, currentStackingContext)
    // if it is a context, add it to the tree
    if (walker.currentNode.parent === document.documentElement) {
      currentStackingContextKey = 'root'
      currentStackingContext = stacking[currentStackingContextKey]
    }
    const { isContext, properties } = createsStackingContext(walker.currentNode)
    if (isContext) {
      currentStackingContextKey = genId()
      currentStackingContext[currentStackingContextKey] = { el: walker.currentNode, properties, competitors: [] }
    } else {
      currentStackingContext[competitors].push(walker.currentNode)
    }
  }
}
