import fs from 'fs';

const processed = Symbol('processed');

export default (opts = {}) => {
  const zCollection = Object.create(null);
  const outputPath = opts.outputPath || './zIndices.js';

  return {
    postcssPlugin: 'postcss-z-index-exporter',

    Declaration(decl) {
      if (decl.prop.startsWith('--z-') && !decl[processed]) {
        zCollection[decl.prop] = decl.value.trim();
        decl[processed] = true;
      }
    },

    OnceExit() {
      const entries = Object.entries(zCollection)
        .map(([key, value]) => {
          const numericValue = Number(value);
          const safeValue = Number.isFinite(numericValue) && value === String(numericValue)
            ? numericValue
            : JSON.stringify(value);
          return `  "${key}": ${safeValue}`;
        });

      const outputString = `export default {\n${entries.join(',\n')}\n};\n`;
      fs.writeFileSync(outputPath, outputString);
    }
  };
}
