// modules-external/dmx-fedwiki/src/main/js/fedwiki-store.js
const TAG = '[dmx-fedwiki]';

export default {
  namespaced: true,
  
  state: {
    siteBase: 'http://localhost:3000',
    sitemap: [],
    loading: false,
    error: null
  },

  getters: {
    isLoading: state => state.loading,
    getError: state => state.error
  },

  mutations: {
    SET_SITE_BASE(state, url) { state.siteBase = url; },
    SET_SITEMAP(state, items) { state.sitemap = items; },
    SET_LOADING(state, v) { state.loading = v; },
    SET_ERROR(state, e) { state.error = e; }
  },

  actions: {
    'fedwiki/setSiteBase'({ commit }, url) {
      console.debug(TAG, 'store:setSiteBase', { url });
      commit('SET_SITE_BASE', url);
    },
    
    'fedwiki/setSitemap'({ commit }, items) {
      console.debug(TAG, 'store:setSitemap', { items: items?.length || 0 });
      commit('SET_SITEMAP', items);
    },
    
    'fedwiki/setLoading'({ commit }, v) {
      console.debug(TAG, 'store:setLoading', { v });
      commit('SET_LOADING', v);
    },
    
    'fedwiki/setError'({ commit }, e) {
      if (e) console.warn(TAG, 'store:setError', e);
      commit('SET_ERROR', e);
    }
  }
};