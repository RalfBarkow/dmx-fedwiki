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
const TAG = '[dmx-fedwiki]';

export default {
  name: 'FedWikiBrowser',

  inject: {
    dmx:  'dmx',
    http: 'axios',
    Vue:  'Vue'
  },

  props: {
    topic: { type: Object, required: true }
  },

  data() {
    return {
      _epoch: 0,
      _refreshTimer: null
    };
  },

  computed: {
    slugs() {
      const comp = (this.topic && this.topic.composite) || [];
      return comp
        .filter(t => t.typeUri === 'fedwiki.slug')
        .map(t => (t.value || '').trim())
        .filter(Boolean);
    },

    isLoading() { return this.$store.getters['fedwiki/isLoading']; },
    error()     { return this.$store.getters['fedwiki/getError']; },
    items()     { return this.$store.state.fedwiki.sitemap || []; },
    siteBase()  { return this.$store.state.fedwiki.siteBase || ''; }
  },

  methods: {
    log(what, payload = {}) {
      console.debug(TAG, what, payload);
    },

    scheduleRefresh(reason = 'change') {
      if (this._refreshTimer) clearTimeout(this._refreshTimer);
      this._refreshTimer = setTimeout(() => this.refreshFromSlugs(), 120);
      this.log('scheduleRefresh', { reason });
    },

    async refreshFromSlugs() {
      const epoch = ++this._epoch;
      let slugs = this.slugs.slice(0);
      
      this.log('refresh:start', {
        topicId: this.topic?.id,
        slugs: slugs.length,
        siteBase: this.siteBase
      });

      // Validate siteBase URL format
      if (this.siteBase) {
        try {
          new URL(this.siteBase);
        } catch (_) {
          this.$store.dispatch('fedwiki/setError', `Invalid siteBase URL: ${this.siteBase}`);
          this.$store.dispatch('fedwiki/setSitemap', []);
          this.log('refresh:end(bad-siteBase)');
          return;
        }
      }

      // Bootstrap from /system/sitemap.json if no slugs
      if (!slugs.length && this.siteBase) {
        const base = this.siteBase.replace(/\/+$/, '');
        const url = `${base}/system/sitemap.json`;
        this.log('bootstrap:try', { url });

        try {
          const res = await this.http.get(url, { withCredentials: false });
          const raw = res?.data;
          const arr = Array.isArray(raw) ? raw : (raw?.data) || [];
          slugs = arr
            .map(it => (typeof it === 'string' ? it : (it?.slug) || ''))
            .map(s => String(s).trim())
            .filter(Boolean);
          this.log('bootstrap:ok', { count: slugs.length });
        } catch (e) {
          console.warn(TAG, 'bootstrap:fail', e);
          this.$store.dispatch('fedwiki/setSitemap', []);
          this.$store.dispatch('fedwiki/setError', 
            `Bootstrap failed: ${e?.message ? e.message : String(e)}`);
          this.log('refresh:end(bootstrap-failed)');
          return;
        }
      }

      // Deduplicate slugs
      slugs = [...new Set(slugs)];

      // Empty after processing → show nothing
      if (!slugs.length) {
        this.$store.dispatch('fedwiki/setSitemap', []);
        this.$store.dispatch('fedwiki/setError', null);
        this.log('refresh:end(empty)');
        return;
      }

      // No hydration without siteBase → show minimal
      if (!this.siteBase) {
        const minimal = slugs.map(slug => ({ slug, title: undefined }));
        this.$store.dispatch('fedwiki/setSitemap', minimal);
        this.$store.dispatch('fedwiki/setError', null);
        this.log('refresh:end(minimal)', { items: minimal.length });
        return;
      }

      // Hydrate titles with batching and cancellation
      this.$store.dispatch('fedwiki/setLoading', true);
      this.$store.dispatch('fedwiki/setError', null);

      try {
        const base = this.siteBase.replace(/\/+$/, '');
        const BATCH_SIZE = 5;
        const SLEEP = ms => new Promise(r => setTimeout(r, ms));
        const results = [];

        this.log('hydrate:start', { total: slugs.length, batchSize: BATCH_SIZE });

        for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
          if (epoch !== this._epoch) {
            this.log('hydrate:abort(stale)');
            return;
          }

          const batch = slugs.slice(i, i + BATCH_SIZE);
          this.log('hydrate:batch', { from: i, to: i + batch.length - 1 });

          const chunk = await Promise.all(batch.map(async (slug) => {
            try {
              const res = await this.http.get(
                `${base}/${encodeURIComponent(slug)}.json`, 
                { withCredentials: false }
              );
              const title = res?.data?.title ? String(res.data.title) : undefined;
              return { slug, title };
            } catch (_) {
              return { slug, title: undefined };
            }
          }));

          results.push(...chunk);
          if (i + BATCH_SIZE < slugs.length) await SLEEP(100);
        }

        if (epoch !== this._epoch) {
          this.log('hydrate:drop(stale)');
          return;
        }

        this.$store.dispatch('fedwiki/setSitemap', results);
        this.log('hydrate:done', { hydrated: results.length });
      } catch (e) {
        console.warn(TAG, 'hydrate:error', e);
        const minimal = slugs.map(slug => ({ slug, title: undefined }));
        this.$store.dispatch('fedwiki/setSitemap', minimal);
        this.$store.dispatch('fedwiki/setError', e?.message ? e.message : String(e));
      } finally {
        this.$store.dispatch('fedwiki/setLoading', false);
        this.log('refresh:end');
      }
    }
  },

  created() {
    this.log('component:created', { vue: this.Vue?.version });
  },

  mounted() {
    this.log('component:mounted');
    this.scheduleRefresh('mounted');
  },

  watch: {
    topic()    { this.scheduleRefresh('topic'); },
    slugs()    { this.scheduleRefresh('slugs'); },
    siteBase() { this.scheduleRefresh('siteBase'); }
  },

  beforeDestroy() {
    this.log('component:destroy');
    this._epoch++;
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
  }
};
</script>