// import PostcssModulesPlugin from 'postcss-modules'
import easyZ from 'postcss-easy-z'
import myPlugin from './plugin.js'

export default {
  plugins: [
    easyZ(),
    myPlugin({}),
  ],
}
