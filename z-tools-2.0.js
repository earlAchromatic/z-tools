
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
  const contextProperties = {};
  let isContext = false;
  const isRoot = element === document.documentElement;

  if (isRoot) {
    contextProperties['root-element'] = true;
  }

  const normalize = val => val === '' ? 'none' : val;

  const valueMap = {
    position: style.position,
    zIndex: style.zIndex,
    containerType: style.containerType,
    opacity: style.opacity,
    mixBlendMode: normalize(style.mixBlendMode),
    transform: normalize(style.transform),
    scale: normalize(style.scale),
    rotate: normalize(style.rotate),
    translate: normalize(style.translate),
    filter: normalize(style.filter),
    backdropFilter: normalize(style.backdropFilter),
    perspective: normalize(style.perspective),
    clipPath: normalize(style.clipPath),
    mask: normalize(style.mask),
    maskImage: normalize(style.maskImage),
    maskBorder: normalize(style.maskBorder),
    isolation: style.isolation,
    contain: style.contain,
    willChange: style.willChange
  };

  const isZIndexValid = normalize(valueMap.zIndex) !== 'auto';

  const stackingConditions = [
    {
      name: "position/z-index",
      condition: ['absolute', 'relative'].includes(valueMap.position) && isZIndexValid,
      property: { position: valueMap.position, 'z-index': Number(valueMap.zIndex) }
    },
    {
      name: "position",
      condition: ['fixed', 'sticky'].includes(valueMap.position),
      property: { position: valueMap.position }
    },
    {
      name: "container-type",
      condition: ['size', 'inline-size'].includes(valueMap.containerType),
      property: { 'container-type': valueMap.containerType }
    },
    {
      name: "opacity",
      condition: parseFloat(valueMap.opacity) < 1,
      property: { opacity: valueMap.opacity }
    },
    {
      name: "mix-blend-mode",
      condition: valueMap.mixBlendMode !== 'normal',
      property: { 'mix-blend-mode': valueMap.mixBlendMode }
    },
    {
      name: "transform",
      condition: valueMap.transform !== 'none',
      property: { transform: valueMap.transform }
    },
    {
      name: "scale",
      condition: valueMap.scale !== 'none',
      property: { scale: valueMap.scale }
    },
    {
      name: "rotate",
      condition: valueMap.rotate !== 'none',
      property: { rotate: valueMap.rotate }
    },
    {
      name: "translate",
      condition: valueMap.translate !== 'none',
      property: { translate: valueMap.translate }
    },
    {
      name: "filter",
      condition: valueMap.filter !== 'none',
      property: { filter: valueMap.filter }
    },
    {
      name: "backdrop-filter",
      condition: valueMap.backdropFilter !== 'none',
      property: { 'backdrop-filter': valueMap.backdropFilter }
    },
    {
      name: "perspective",
      condition: valueMap.perspective !== 'none',
      property: { perspective: valueMap.perspective }
    },
    {
      name: "clip-path",
      condition: valueMap.clipPath !== 'none',
      property: { 'clip-path': valueMap.clipPath }
    },
    {
      name: "mask",
      condition:
        valueMap.mask !== 'none' ||
        valueMap.maskImage !== 'none' ||
        (valueMap.maskBorder !== 'none' && valueMap.maskBorder !== undefined),
      property: {
        mask: valueMap.mask,
        'mask-image': valueMap.maskImage,
        'mask-border': valueMap.maskBorder
      }
    },
    {
      name: "isolation",
      condition: valueMap.isolation === 'isolate',
      property: { isolation: valueMap.isolation }
    },
    {
      name: "contain",
      condition: /paint|layout|strict|content/.test(valueMap.contain),
      property: { contain: valueMap.contain }
    },
    {
      name: "flex-or-grid-child",
      condition: isZIndexValid && isChildOfDisplayTypeGridOrFlex(element),
      property: {
        ...isChildOfDisplayTypeGridOrFlex(element),
        'z-index': Number(valueMap.zIndex)
      }
    }
  ];

  const knownProps = new Set(
    stackingConditions.flatMap(({ name }) => name.split('/').map(p => p.trim()))
  );

  // Add will-change check
  if (valueMap.willChange) {
    const willChangeProps = valueMap.willChange.split(',').map(p => p.trim());
    if (willChangeProps.some(p => knownProps.has(p))) {
      stackingConditions.push({
        name: "will-change",
        condition: true,
        property: { 'will-change': valueMap.willChange }
      });
    }
  }

  for (const { condition, property } of stackingConditions) {
    if (condition) {
      isContext = true;
      Object.assign(contextProperties, property);
    }
  }

  return {
    isContext: isRoot || (isContext && hasChildWithZIndex(element)),
    properties: contextProperties
  };
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
