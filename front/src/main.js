import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { redirectToLocalhost } from "./shared/canonical-host";
import "./styles.css";

redirectToLocalhost();

createApp(App)
  .use(createPinia())
  .use(router)
  .mount("#app");
