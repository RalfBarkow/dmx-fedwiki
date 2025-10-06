// modules-external/dmx-fedwiki/src/main/js/plugin.js
export default ({ store, axios: http, dmx, Vue }) => {
  const TYPE = 'fedwiki.sitemap';
  const isSitemap = t => !!t && t.typeUri === TYPE;

  // Declarative bits we keep (no detailTabs here to avoid duplication)
  const contributions = {
    storeModule: {
      name: 'fedwiki',
      module: require('./fedwiki-store').default
    },

    // Context menu example: “Materialize as FedWiki Page topics” (optional)
    contextCommands: {
      topic: topic => {
        if (!isSitemap(topic)) return;

        return [{
          label: 'Materialize FedWiki Pages',
          handler: async (id) => {
            const comp = (topic.composite || []).filter(t => t.typeUri === 'fedwiki.slug');
            const slugs = comp.map(t => (t.value || '').trim()).filter(Boolean);

            for (const slug of slugs) {
              await dmx.rpc.createTopic({
                typeUri: 'fedwiki.page',
                children: {
                  'fedwiki.slug': slug,
                  'fedwiki.title': slug,          // placeholder; can hydrate later
                  'fedwiki.page.json': ''         // optional placeholder
                }
              });
            }
            // Optionally: reveal the created topics
            // store.dispatch('reloadTopic', { id }); // or any reveal helper you already have
          }
        }];
      }
    }
  };

  // Imperative detail-tab registration (works across DMX variants)
  try {
    const Comp = require('./components/FedWikiBrowser').default;
    const mountVue = (el, topic) =>
      new Vue({
        store,
        data: { currentTopic: topic },        // reactive in Vue 2
        render(h) { return h(Comp, { props: { topic: this.currentTopic } }); }
      }).$mount(el);

    const register = () => {
      if (dmx && dmx.ui && typeof dmx.ui.registerDetailTab === 'function') {
        dmx.ui.registerDetailTab({
          id: 'fedwiki-browser',
          label: 'FedWiki',
          weight: 50,
          when: ({ topic }) => isSitemap(topic),
          mount(el, { topic }) { this._vm = mountVue(el, topic); },
          update(el, { topic }) { if (this._vm) this._vm.currentTopic = topic; },
          unmount() { if (this._vm) { this._vm.$destroy(); this._vm = null; } }
        });
      } else if (dmx && dmx.panel && typeof dmx.panel.register === 'function') {
        dmx.panel.register({
          id: 'fedwiki-browser',
          place: 'detail',
          label: 'FedWiki',
          weight: 50,
          when: topic => isSitemap(topic),
          render(el, topic) { this._vm = mountVue(el, topic); },
          update(el, topic) { if (this._vm) this._vm.currentTopic = topic; },
          destroy() { if (this._vm) { this._vm.$destroy(); this._vm = null; } }
        });
      }
    };

    if (dmx && typeof dmx.onReady === 'function') dmx.onReady(register);
    else register();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[dmx-fedwiki] detail-tab registration skipped:', e);
  }

  return contributions;
};
