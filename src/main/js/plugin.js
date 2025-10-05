// dmx-fedwiki-plugin.js
// FedWiki client‑side plugin to fetch the sitemap and send it to DMX

// 1) Import your own wiki adapter, not the npm wiki-client
import wiki from 'wiki-client/lib/wiki.js';
window.wiki = wiki;

// 2) Define origin explicitly — point to the correct FedWiki server
wiki.origin = 'http://localhost:3000/';

// 3) Add a Promise‑based .sitemap() helper using fetch
wiki.sitemap = () => {
  const url = `${wiki.origin}system/sitemap.json`;
  return fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.status}`);
      return response.json();
    })
    .then(page => page.data || page);
};

// 4) Export the DMX plugin factory
export default function FedWikiPlugin({ store, dmx, axios, Vue }) {
  // 4a) Register a Vuex store module under 'greeting'
  store.registerModule('greeting', require('./greeting').default);

  // 4b) Initialize the sitemap in store
  store.dispatch('greeting/setSitemap', []);
  wiki.sitemap()
    .then(slugs => store.dispatch('greeting/setSitemap', slugs))
    .catch(err => console.error('sitemap() error', err));

  // 4c) Provide components
  return {
    storeModule: {
      name: 'greeting',
      module: require('./greeting').default
    },
    components: [
      {
        comp: require('./components/Greeting').default,
        mount: 'toolbar-left'
      }
    ]
  };
}
