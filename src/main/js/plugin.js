// dmx-fedwiki-plugin.js
export default ({ store, dmx, axios, Vue }) => ({
  // Let the plugin manager register the module (no manual registerModule!)
  storeModule: {
    name: 'fedwiki',
    module: require('./fedwiki-store').default
  },
  components: [
    {
      comp: require('./components/FedWikiBrowser').default,
      mount: 'toolbar-left'
    }
  ]
});
