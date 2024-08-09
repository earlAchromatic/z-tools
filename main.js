import zIndices from './zIndices.js'

function evaluateVar(expression, vars) {
  const lookup = expression.replace(/var\((--[\w-]+)\)/g, (match, varName) => varName)
  return vars[toCamelCase(lookup)];
}

function evaluateCalc(expression, vars) {
  const expr = expression.replace(/var\((--[\w-]+)\)/g, (match, varName) => vars[toCamelCase(varName)]);
  return Function('"use strict";return (' + expr + ')')();
}

function toCamelCase(str) {
  return str.replace(/^-+z?/, '')
    .split('-')
    .slice(1)
    .map((part, index) => {
      if (index === 0) {
        return part;
      } else {
        return part[0].toUpperCase() + part.slice(1);
      }
    }).join('');
}

function parse(styles) {
  const vars = {
    // getLargest, attache methods here?
    // getSmallest, 
  };
  for (const [variable, expression] of Object.entries(styles)) {
    const cameledVar = toCamelCase(variable)
    if (!Number.isInteger(expression) && expression.startsWith('calc(')) {
      const innerExpr = expression.slice(5, -1).trim();
      const value = evaluateCalc(innerExpr, vars);
      vars[cameledVar] = value;
    } else if (!Number.isInteger(expression) && expression.startsWith('var(')) {
      const value = evaluateVar(expression, vars);
      vars[cameledVar] = value;
    } else {
      vars[cameledVar] = expression;
    }
  }
  return vars
}

// const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;

// CSSStyleDeclaration.prototype.setProperty = function (property, value, priority) {
//   originalSetProperty.call(this, property, value, priority);
//   if (property.startsWith('--z')) {
//     document.dispatchEvent(new CustomEvent('cssVarChange', {
//       detail: { property, value }
//     }));
//   }
// };

const z = parse(zIndices)

console.log(z);

console.log(z.myBetterVar)
