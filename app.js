// Basit init + service worker kaydı
document.addEventListener('DOMContentLoaded', () => {
  console.log('Ajanda yüklendi');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(() => {
      console.log('SW kayıt OK');
    }).catch(err => console.warn('SW kayıt HATA', err));
  });
}
