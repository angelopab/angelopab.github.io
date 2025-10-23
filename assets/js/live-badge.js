(function(){
  const ENDPOINT = 'https://api.angelopab.com/live-status';
  const el = document.querySelector('.live-avatar');
  if (!el) return;

  async function check(){
    try{
      const r = await fetch(ENDPOINT, {cache:'no-store'});
      if(!r.ok) throw new Error('status '+r.status);
      const j = await r.json();
      const isLive = !!(j && j.live);
      el.setAttribute('data-live', isLive ? 'on' : 'off');
      if (j && j.platforms){
        const on = Object.entries(j.platforms).filter(([k,v])=>v).map(([k])=>k);
        el.title = isLive ? 'Live now on '+on.join(', ') : 'Currently offline';
      }
    }catch(e){
      el.setAttribute('data-live','off');
    }
  }

  check();
  setInterval(check, 60000);
})();