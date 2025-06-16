// dmx-fedwiki-plugin.js
// FedWiki client‑side plugin to fetch the sitemap and send it to DMX

// 1) Import your own wiki adapter, not wiki-client
import wiki from 'wiki-client/lib/wiki.js';
window.wiki = wiki;

// 2) Define origin explicitly — point to the correct FedWiki server
wiki.origin = 'http://localhost:3000/';

// 3) Add a Promise‑based .sitemap() helper on your legacy wiki
wiki.sitemap = () => new Promise((resolve, reject) => {
  wiki.origin.get('system/sitemap.json', (err, page) => {
    if (err) return reject(err);
    // page may be { data: [...], lastModified: … }
    resolve(page.data || page);
  });
});

// 4) Export the DMX plugin configuration object or a function which returns such an object.
// The function receives a "dependencies" object with 4 properties: 'store', 'dm5', 'axios', and 'Vue'.
// 'store' is the DMX Webclient's Vuex store object.
export default ({store, dmx, axios, Vue}) => ({

  // A DMX plugin can provide its own Vuex store module.
  // This plugin's state is accessible as 'store.state.greeting' (according to the 'name' property).
  storeModule: {
    name: 'greeting',
    module: require('./greeting').default
  },

  // A DMX plugin can statically add Vue components to the DMX Webclient.
  // 3 mount points are supported: 'webclient', 'toolbar-left', and 'toolbar-right'
  components: [{
    comp: require('./components/Greeting').default,
    mount: 'toolbar-left'
  }]

  // A DMX plugin can do more things at the client-side (not demonstrated here):
  // - declare Vuex store watchers
  // - provide type-specific detail renderers
  // - provide additional topicmap types and renderers
  // - add special items to the Webclient's Create menu

  // Learn more about DMX plugin development with the DMX Developer Guide:
  // https://dmx.readthedocs.io/en/latest/devel.html
})
