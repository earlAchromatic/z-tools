import fs from 'fs'

const processed = Symbol('processed')

export default (opts = {}) => {
  const zCollection = Object.create(null)
  return {
    postcssPlugin: 'PLUGIN NAME',
    Declaration: decl => {
      if (decl.prop.startsWith('--z-') && !decl[processed]) {
        zCollection[decl.prop] = decl.value
        decl[processed] = true
      }
    },
    OnceExit() {
      let outputString = `export default {\n`
      for (const [key, value] of Object.entries(zCollection)) {
        outputString += `"${key}": ${Number.isInteger(Number(value)) ? value : '"' + value.trim() + '"'},\n`
      }
      outputString += '\n};'
      fs.writeFileSync('./zIndices.js', outputString)
    }
  }
}
