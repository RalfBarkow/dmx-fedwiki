<!-- modules-external/dmx-fedwiki/src/main/js/components/FedWikiBrowser.vue -->
<template>
  <div class="fedwiki-browser" style="height:100%;overflow:auto;padding:0.5rem">
    <h3 style="margin:0 0 .5rem">FedWiki Pages</h3>

    <p v-if="isLoading">Loading…</p>
    <p v-else-if="error" style="color:#c00">Failed: {{ error }}</p>

    <ul v-else>
      <li v-for="item in items" :key="item.slug">
        {{ item.title || item.slug }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'FedWikiBrowser',

  inject: {
    dmx:  'dmx',
    http: 'axios',
    Vue:  'Vue'
  },

  props: {
    topic: { type: Object, required: true }   // expecting fedwiki.sitemap
  },

  computed: {
    // Slugs directly from the sitemap topic's composite
    slugs () {
      const comp = (this.topic && this.topic.composite) || [];
      return comp
        .filter(t => t.typeUri === 'fedwiki.slug')
        .map(t => (t.value || '').trim())
        .filter(Boolean);
    },

    // Vuex wiring
    isLoading () { return this.$store.getters['fedwiki/isLoading']; },
    error     () { return this.$store.getters['fedwiki/getError']; },
    items     () { return this.$store.state.fedwiki.sitemap || []; },

    // Optional site base (if you keep one in your store for hydration)
    siteBase () { return this.$store.state.fedwiki.siteBase || ''; }
  },

  methods: {
    async refreshFromSlugs () {
      const slugs = this.slugs;

      // Empty sitemap
      if (!slugs.length) {
        this.$store.dispatch('fedwiki/setSitemap', []);
        this.$store.dispatch('fedwiki/setError', null);
        return;
      }

      // If no siteBase configured, just show slugs (no network)
      if (!this.siteBase) {
        const minimal = slugs.map(slug => ({ slug, title: undefined }));
        this.$store.dispatch('fedwiki/setSitemap', minimal);
        this.$store.dispatch('fedwiki/setError', null);
        return;
      }

      // Hydrate titles from the wiki (<slug>.json), best-effort
      this.$store.dispatch('fedwiki/setLoading', true);
      this.$store.dispatch('fedwiki/setError', null);
      try {
        const base = this.siteBase.replace(/\/+$/, '');
        const results = await Promise.all(slugs.map(async (slug) => {
          try {
            const res = await this.http.get(`${base}/${encodeURIComponent(slug)}.json`, { withCredentials: false });
            const data = res && res.data || {};
            const title = (data && data.title) ? String(data.title) : undefined;
            return { slug, title: title || undefined };
          } catch (_) {
            // On per-page failure, fall back to slug
            return { slug, title: undefined };
          }
        }));
        this.$store.dispatch('fedwiki/setSitemap', results);
      } catch (e) {
        this.$store.dispatch('fedwiki/setError', e && e.message ? e.message : String(e));
        const minimal = slugs.map(slug => ({ slug, title: undefined }));
        this.$store.dispatch('fedwiki/setSitemap', minimal);
      } finally {
        this.$store.dispatch('fedwiki/setLoading', false);
      }
    }
  },

  created () {
    // eslint-disable-next-line no-console
    console.debug('[dmx-fedwiki] FedWikiBrowser created (sitemap)', {
      vue: this.Vue && this.Vue.version,
      slugs: this.slugs.length
    });
  },

  mounted () {
    this.refreshFromSlugs();
  },

  watch: {
    // React when user selects another sitemap topic, or when its slugs change
    topic () { this.refreshFromSlugs(); },
    slugs () { this.refreshFromSlugs(); },
    siteBase () { this.refreshFromSlugs(); }
  }
};
</script>
