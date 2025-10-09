<!-- modules-external/dmx-fedwiki/src/main/js/components/FedWikiBrowser.vue -->
<template>
  <div class="fedwiki-browser">
    <h3>FedWiki Pages</h3>

    <p v-if="isLoading">Loading sitemap…</p>
    <p v-else-if="error" style="color:#c00">Failed to load: {{ error }}</p>

    <ul v-else>
      <li v-for="item in normalizedSitemap" :key="item.slug">
        {{ item.title || item.slug }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'FedWikiBrowser',
  computed: {
    sitemap()   { return this.$store.state.fedwiki.sitemap || []; },
    isLoading() { return this.$store.getters['fedwiki/isLoading']; },
    error()     { return this.$store.getters['fedwiki/getError']; },
    // Normalize to [{slug, title?}, …]
    normalizedSitemap() {
      console.log('Raw sitemap data:', this.sitemap);
      return this.sitemap.map(it => {
        if (typeof it === 'string') return { slug: it };
        // common fedwiki sitemap shapes: {slug, title?, …}
        return { slug: it.slug || String(it), title: it.title };
      });
    }
  },
  async mounted() {
    // Prefer a backend proxy to avoid CORS; direct fetch will need CORS headers from FedWiki.
    // const url = '/fedwiki/proxy?url=system/sitemap.json'  // if you add a DMX proxy
    const origin = 'http://localhost:3000/';
    const url = `${origin}system/sitemap.json`;

    this.$store.dispatch('fedwiki/setLoading', true);
    this.$store.dispatch('fedwiki/setError', null);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const arr = raw?.data || raw || [];
      const slugs = arr.map(item => (typeof item === 'string' ? item : (item.slug || String(item))));
      this.$store.dispatch('fedwiki/setSitemap', slugs);
    } catch (e) {
      this.$store.dispatch('fedwiki/setError', e.message || String(e));
      this.$store.dispatch('fedwiki/setSitemap', []);
      // Keep console noise for dev visibility
      // eslint-disable-next-line no-console
      console.error('FedWiki sitemap fetch failed:', e);
    } finally {
      this.$store.dispatch('fedwiki/setLoading', false);
    }
  }
};
</script>
