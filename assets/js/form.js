/**
 * Brief forms — reserved for Stripe checkout (phase 3). Buttons stay disabled until then.
 */
(function () {
  document.querySelectorAll("#brief-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  });
})();
