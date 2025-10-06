// modules-external/dmx-fedwiki/src/main/js/plugin.js
export default ({ store, axios: http, dmx, Vue }) => {
  const TAG = '[dmx-fedwiki]';
  const TYPE = 'fedwiki.sitemap';
  const isSitemap = t => !!t && t.typeUri === TYPE;

  const contributions = {
    storeModule: {
      name: 'fedwiki',
      module: require('./fedwiki-store').default
    },

    contextCommands: {
      topic: topic => {
        if (!isSitemap(topic)) return;

        const comp = topic.composite || [];
        const slugs = comp
          .filter(t => t.typeUri === 'fedwiki.slug')
          .map(t => (t.value || '').trim())
          .filter(Boolean);

        return [
          {
            label: 'Use localhost:3000 as FedWiki site',
            handler: () => {
              console.debug(TAG, 'ctx:setSiteBase', { url: 'http://localhost:3000' });
              store.dispatch('fedwiki/setSiteBase', 'http://localhost:3000');
            }
          },
          {
            label: 'Materialize FedWiki Pages',
            handler: async () => {
              if (!slugs.length) return;
              console.debug(TAG, 'materialize:start', { count: slugs.length });

              const CHUNK_SIZE = 10;
              let ok = 0, fail = 0;

              for (let i = 0; i < slugs.length; i += CHUNK_SIZE) {
                const batch = slugs.slice(i, i + CHUNK_SIZE);
                const promises = batch.map(slug =>
                  dmx.rpc.createTopic({
                    typeUri: 'fedwiki.page',
                    children: {
                      'fedwiki.slug': slug,
                      'fedwiki.title': slug,
                      'fedwiki.page.json': ''
                    }
                  })
                  .then(() => { ok++; })
                  .catch(err => {
                    fail++;
                    console.warn(TAG, 'materialize:item-fail', slug, err);
                  })
                );

                await Promise.all(promises);
                if (i + CHUNK_SIZE < slugs.length) {
                  await new Promise(r => setTimeout(r, 100));
                }
              }

              console.debug(TAG, 'materialize:done', { ok, fail });
              if (dmx?.notify?.info) {
                dmx.notify.info(`FedWiki: created ${ok} pages${fail ? `, ${fail} failed` : ''}`);
              }
            }
          }
        ];
      }
    }
  };

  // Imperative detail-tab registration
  try {
    const Comp = require('./components/FedWikiBrowser').default;

    const mountVue = (el, topic) =>
      new Vue({
        store,
        data: { currentTopic: topic },
        render(h) {
          return h(Comp, { props: { topic: this.currentTopic } });
        }
      }).$mount(el);

    const register = () => {
      if (dmx?.ui?.registerDetailTab) {
        dmx.ui.registerDetailTab({
          id: 'fedwiki-browser',
          label: 'FedWiki',
          weight: 50,
          when: ({ topic }) => isSitemap(topic),
          mount(el, { topic }) { this._vm = mountVue(el, topic); },
          update(el, { topic }) { 
            if (this._vm) this._vm.currentTopic = topic; 
          },
          unmount() { 
            if (this._vm) { 
              this._vm.$destroy(); 
              this._vm = null; 
            } 
          }
        });
      } else if (dmx?.panel?.register) {
        dmx.panel.register({
          id: 'fedwiki-browser',
          place: 'detail',
          label: 'FedWiki',
          weight: 50,
          when: topic => isSitemap(topic),
          render(el, topic) { this._vm = mountVue(el, topic); },
          update(el, topic) { 
            if (this._vm) this._vm.currentTopic = topic; 
          },
          destroy() { 
            if (this._vm) { 
              this._vm.$destroy(); 
              this._vm = null; 
            } 
          }
        });
      } else {
        console.warn(TAG, 'No detail-panel registration API found.');
      }
    };

    if (dmx?.onReady) {
      dmx.onReady(register);
    } else {
      register();
    }
  } catch (e) {
    console.warn(TAG, 'detail-tab registration skipped:', e);
  }

  return contributions;
};