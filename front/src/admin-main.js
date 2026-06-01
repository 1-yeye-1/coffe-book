import { createApp } from "vue";
import AdminApp from "./AdminApp.vue";
import { redirectToLocalhost } from "./shared/canonical-host";
import "./styles.css";

redirectToLocalhost();

createApp(AdminApp).mount("#app");
