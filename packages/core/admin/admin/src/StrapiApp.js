import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ThemeProvider } from 'styled-components';
import { LibraryProvider, StrapiProvider } from '@strapi/helper-plugin';
import configureStore from './core/store/configureStore';
import { Library, Middlewares, Plugin, Reducers } from './core/apis';
import basename from './utils/basename';
import App from './pages/App';
import LanguageProvider from './components/LanguageProvider';
import AutoReloadOverlayBlocker from './components/AutoReloadOverlayBlocker';
import Fonts from './components/Fonts';
import OverlayBlocker from './components/OverlayBlocker';
import GlobalStyle from './components/GlobalStyle';
import Notifications from './components/Notifications';
import themes from './themes';

import reducers from './reducers';

// TODO
import translations from './translations';

window.strapi = {
  backendURL: process.env.STRAPI_ADMIN_BACKEND_URL,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const appLocales = Object.keys(translations);

class StrapiApp {
  constructor({ appPlugins }) {
    this.appPlugins = appPlugins || {};
    this.library = Library();
    this.middlewares = Middlewares();
    this.plugins = {};
    this.reducers = Reducers({ appReducers: reducers });
    this.translations = translations;
  }

  addComponent = component => {
    this.library.components.add(component);
  };

  addComponents = components => {
    components.map(compo => this.library.components.add(compo));
  };

  addField = field => {
    this.library.fields.add(field);
  };

  addFields = fields => {
    fields.map(field => this.library.fields.add(field));
  };

  addMiddleware = middleware => {
    this.middlewares.add(middleware);
  };

  addMiddlewares = middlewares => {
    middlewares.forEach(middleware => {
      this.middlewares.add(middleware);
    });
  };

  addReducer = reducer => {
    this.reducers.add(reducer);
  };

  addReducers = reducers => {
    Object.keys(reducers).forEach(reducerName => {
      this.reducers.add(reducerName, reducers[reducerName]);
    });
  };

  async initialize() {
    Object.keys(this.appPlugins).forEach(plugin => {
      this.appPlugins[plugin].register({
        addComponent: this.addComponent,
        addComponents: this.addComponents,
        addField: this.addField,
        addFields: this.addFields,
        addMiddleware: this.addMiddleware,
        addMiddlewares: this.addMiddlewares,
        addReducer: this.addReducer,
        addReducers: this.addReducers,
        registerPlugin: this.registerPlugin,
      });
    });
  }

  async boot() {
    Object.keys(this.appPlugins).forEach(plugin => {
      const boot = this.appPlugins[plugin].boot;

      if (boot) {
        boot({ getPlugin: this.getPlugin });
      }
    });
  }

  getPlugin = pluginId => {
    return this.plugins[pluginId] || null;
  };

  // FIXME
  registerPluginTranslations(pluginId, trads) {
    const pluginTranslations = appLocales.reduce((acc, currentLanguage) => {
      const currentLocale = trads[currentLanguage];

      if (currentLocale) {
        const localeprefixedWithPluginId = Object.keys(currentLocale).reduce((acc2, current) => {
          acc2[`${pluginId}.${current}`] = currentLocale[current];

          return acc2;
        }, {});

        acc[currentLanguage] = localeprefixedWithPluginId;
      }

      return acc;
    }, {});

    this.translations = Object.keys(this.translations).reduce((acc, current) => {
      acc[current] = {
        ...this.translations[current],
        ...(pluginTranslations[current] || {}),
      };

      return acc;
    }, {});
  }

  registerPlugin = pluginConf => {
    // FIXME
    // Translations should be loaded differently
    // This is a temporary fix
    this.registerPluginTranslations(pluginConf.id, pluginConf.trads);

    const plugin = Plugin(pluginConf);

    this.plugins[plugin.pluginId] = plugin;
  };

  render() {
    const store = configureStore(this.middlewares.middlewares, this.reducers.reducers);
    const {
      components: { components },
      fields: { fields },
    } = this.library;

    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={themes}>
          <GlobalStyle />
          <Fonts />
          <Provider store={store}>
            <LibraryProvider components={components} fields={fields}>
              {/* TODO remove this */}
              <StrapiProvider strapi={this}>
                <LanguageProvider messages={this.translations}>
                  <>
                    <AutoReloadOverlayBlocker />
                    <OverlayBlocker />
                    <Notifications />
                    <BrowserRouter basename={basename}>
                      <App store={store} />
                    </BrowserRouter>
                  </>
                </LanguageProvider>
              </StrapiProvider>
            </LibraryProvider>
          </Provider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }
}

export default ({ appPlugins }) => new StrapiApp({ appPlugins });