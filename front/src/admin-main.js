import { createApp } from "vue";
import AdminApp from "./AdminApp.vue";
import { redirectToLocalhost } from "./shared/canonical-host";
import "./styles.css";
import "./styles/design-system.css";

redirectToLocalhost();

createApp(AdminApp).mount("#app");
