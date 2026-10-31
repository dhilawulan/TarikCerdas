function applyGlobalTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (document.body) document.body.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (document.body) document.body.removeAttribute('data-theme');
  }
}

// Jalankan langsung saat dokumen dimuat
document.addEventListener('DOMContentLoaded', applyGlobalTheme);
applyGlobalTheme();