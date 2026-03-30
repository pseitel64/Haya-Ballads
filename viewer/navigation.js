/* navigation.js — shared nav logic for library, essay, and intro pages */

(function () {
  'use strict';

  // Toggle hamburger dropdown
  document.querySelectorAll('.nav-hamburger').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var target = document.getElementById(btn.getAttribute('data-target'));
      if (target) {
        target.classList.toggle('open');
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function () {
    document.querySelectorAll('.nav-dropdown.open').forEach(function (el) {
      el.classList.remove('open');
    });
  });

})();
