(function ($) {
  "use strict"; // Start of use strict

  // Smooth scrolling using jQuery easing
  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function () {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: (target.offset().top - 48)
        }, 1000, "easeInOutExpo");
        return false;
      }
    }
  });

  var incrementNode = $('.beer-plus');
  var decrementNode = $('.beer-minus');
  var inputNode = $('.beer-counter');

  incrementNode.on('click', function (event) {
    event.preventDefault();
    var currentValue = inputNode.text();
    inputNode.html(parseInt(currentValue, 0) + 1);
  });

  decrementNode.on('click', function (event) {
    event.preventDefault();
    var currentValue = inputNode.text();
    if (currentValue > 1) {
      inputNode.html(parseInt(currentValue, 0) - 1);
    }
  });

  $(window).on('load', function () {
    $('#major-modal').modal({backdrop: 'static', keyboard: false});
  });

  $('#minor-button').on('click', function () {
    window.location.href = 'https://google.com'
  })

  // Closes responsive menu when a scroll trigger link is clicked
  $('.js-scroll-trigger').click(function () {
    $('.navbar-collapse').collapse('hide');
  });

  // Activate scrollspy to add active class to navbar items on scroll
  $('body').scrollspy({
    target: '#mainNav',
    offset: 54
  });

  // Collapse Navbar
  var navbarCollapse = function () {
    if ($("#mainNav").offset().top > 100) {
      $("#mainNav").addClass("navbar-shrink");
    } else {
      $("#mainNav").removeClass("navbar-shrink");
    }
  };
  // Collapse now if page is not at top
  navbarCollapse();
  // Collapse the navbar when page is scrolled
  $(window).scroll(navbarCollapse);

})(jQuery); // End of use strict
