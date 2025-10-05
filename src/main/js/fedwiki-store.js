// modules-external/dmx-fedwiki/src/main/js/fedwiki-store.js
export default {
  namespaced: true,
  state: {
    sitemap: [],
    loading: false,
    error: null
  },
  mutations: {
    SET_SITEMAP(state, slugs) { state.sitemap = slugs; },
    SET_LOADING(state, v)     { state.loading = v; },
    SET_ERROR(state, e)       { state.error = e; }
  },
  actions: {
    setSitemap({ commit }, slugs) { commit('SET_SITEMAP', slugs); },
    setLoading({ commit }, v)     { commit('SET_LOADING', v); },
    setError({ commit }, e)       { commit('SET_ERROR', e); }
  },
  getters: {
    getSitemap: state => state.sitemap,
    isLoading:  state => state.loading,
    getError:   state => state.error
  }
};
