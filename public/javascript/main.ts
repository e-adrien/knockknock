import * as bootstrap from "bootstrap";

import { useThemes } from "./theme";

import "../images/favicon.ico";
import "../stylesheets/main.scss";

useThemes();

window.addEventListener(
  "load",
  () => {
    document.body.addEventListener("click", (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (!target.hasAttribute("data-wakeup-device") || !target.dataset.wakeupDevice?.match(/[0-9]+/)) {
        return;
      }

      const httpRequest = new XMLHttpRequest();
      httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState !== XMLHttpRequest.DONE) {
          return;
        }

        const toast = new bootstrap.Toast(
          httpRequest.status === 200
            ? document.getElementById("js-wakeup-success-toast")!
            : document.getElementById("js-wakeup-danger-toast")!
        );
        toast.show();
      };
      httpRequest.open("POST", `/knockknock/${target.dataset.wakeupDevice}`);
      httpRequest.send();
    });
  },
  { once: true }
);
