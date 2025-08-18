// Menu mobile
document.getElementById('menuToggle').addEventListener('click', function() {
  document.getElementById('navMenu').classList.toggle('show');
});

// Form demo
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Grazie per il messaggio! Ti risponderemo presto.');
  this.reset();
});
