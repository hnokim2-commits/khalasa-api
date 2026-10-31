// Scheduling only. The injected refresh callback performs GETs; no mutation retry.
window.createFoodAutoRefresh=function({refresh,canRun,onBlocked,onSuccess,onError,intervalMs=20000}){
 let timer=null,running=false,stopped=false,failures=0,lastStart=-Infinity;
 const schedule=delay=>{clearTimeout(timer);if(!stopped)timer=setTimeout(tick,delay)};
 async function tick(){
  if(stopped)return;
  if(running){schedule(intervalMs);return}
  if(!canRun()){onBlocked();schedule(intervalMs);return}
  const elapsed=Date.now()-lastStart;if(elapsed<2000){schedule(2000-elapsed);return}
  running=true;lastStart=Date.now();
  try{const applied=await refresh({background:true});if(applied){failures=0;onSuccess()}else onBlocked()}catch(error){failures=Math.min(3,failures+1);onError(error)}finally{running=false;schedule(Math.min(120000,intervalMs*2**failures))}
 }
 function wake(){if(!stopped&&document.visibilityState==='visible'&&navigator.onLine)schedule(0)}
 document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);window.addEventListener('online',wake);
 window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer)},{once:true});
 schedule(intervalMs);
 return {wake};
};
