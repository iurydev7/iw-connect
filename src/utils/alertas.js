
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export const alertaIW = Swal.mixin({
  background: "rgba(7, 19, 37, 0.96)",
  color: "#F5F9FF",
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
