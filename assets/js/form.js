/**
 * Legacy guard: non-checkout brief forms only (checkout uses checkout.js).
 */
(function () {
  document.querySelectorAll("form#brief-form").forEach(function (form) {
    if (form.classList.contains("checkout-form")) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  });
})();
