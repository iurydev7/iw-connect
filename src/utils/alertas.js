
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export const alertaIW = Swal.mixin({
  background: "#FFFFFF",
  color: "#0B1F4B",
  buttonsStyling: false,
  customClass: {
    popup: "iw-alert-popup",
    title: "iw-alert-title",
    htmlContainer: "iw-alert-text",
    confirmButton: "iw-alert-confirm",
    cancelButton: "iw-alert-cancel",
    actions: "iw-alert-actions",
  },
});
