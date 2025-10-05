// dmx-fedwiki-plugin.js
// Refactored FedWiki integration for DMX

// FedWiki API helper using native fetch
const fedwiki = {
  origin: 'http://localhost:3000/',
  
  sitemap() {
    const url = `${this.origin}system/sitemap.json`;
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.status}`);
        return response.json();
      })
      .then(data => data.data || data);
  },
  
  page(slug) {
    const url = `${this.origin}${slug}.json`;
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);
        return response.json();
      });
  }
};

export default function FedWikiPlugin({ store, dmx, axios, Vue }) {
  // Register Vuex store module
  store.registerModule('fedwiki', require('./fedwiki-store').default);
  
  // Initialize with empty sitemap
  store.dispatch('fedwiki/setSitemap', []);
  
  // Fetch sitemap and update store
  fedwiki.sitemap()
    .then(slugs => store.dispatch('fedwiki/setSitemap', slugs))
    .catch(err => console.error('Failed to fetch sitemap:', err));
  
  return {
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
  };
}