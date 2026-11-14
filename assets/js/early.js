(()=>{
  try{const preference=localStorage.getItem('capitalo-theme');document.documentElement.dataset.theme=preference&&preference!=='system'?preference:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}
  window.addEventListener('error',event=>console.error('Capitalo window error',event.error||event.message));
  window.addEventListener('unhandledrejection',event=>console.error('Capitalo unhandled rejection',event.reason));
  const reloadOnce=()=>{try{const marker='capitalo.sw-cleanup-reloaded';if(sessionStorage.getItem(marker))return;sessionStorage.setItem(marker,'1');location.reload()}catch{}};
  if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='capitalo-cleanup-complete')reloadOnce()});navigator.serviceWorker.getRegistrations().then(registrations=>{if(registrations.length)Promise.all(registrations.map(registration=>registration.unregister())).then(reloadOnce)}).catch(()=>{})}
})();
