// dmx-fedwiki-plugin.js
// FedWiki client-side plugin to fetch the sitemap and send it to DMX

// Import the wiki-client NPM module
import WikiClient, { collaborators } from 'wiki-client/client/client.js';

var wiki = new WikiClient({ baseUrl: window.location.origin });

// sanity check:
console.log('wiki-client loaded:', { WikiClient, collaborators });
console.log('wiki.baseUrl() =', wiki.baseUrl());
wiki.sitemap().then(slugs => console.log('sitemap() →', slugs))
               .catch(err => console.error('sitemap() error', err));