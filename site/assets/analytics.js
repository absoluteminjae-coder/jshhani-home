
(function(){
  const C=window.JSH_CONFIG||{};
  const BASE=(C.supabaseUrl||'').replace(/\/$/,'');
  const KEY=C.supabaseAnonKey||'';

  function uuid(){
    if(window.crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);
      return v.toString(16);
    });
  }

  function getPersistentId(){
    const k='jsh_visitor_id_v1';
    let v=localStorage.getItem(k);
    if(!v){v=uuid();localStorage.setItem(k,v)}
    return v;
  }

  function getSessionId(){
    const k='jsh_session_id_v1';
    let v=sessionStorage.getItem(k);
    if(!v){v=uuid();sessionStorage.setItem(k,v)}
    return v;
  }

  async function track(){
    if(!BASE || !KEY) return;
    if(location.pathname.toLowerCase().includes('admin')) return;

    const params=new URLSearchParams(location.search);
    let pageSlug='home';
    let postId=null;

    if(location.pathname.endsWith('/detail.html') || location.pathname.endsWith('detail.html')){
      pageSlug=params.get('slug')||'detail';
    }
    if(location.pathname.endsWith('/article.html') || location.pathname.endsWith('article.html')){
      pageSlug='article';
      postId=params.get('id')||null;
    }

    try{
      await fetch(BASE+'/rest/v1/rpc/cms_track_view',{
        method:'POST',
        keepalive:true,
        cache:'no-store',
        headers:{
          apikey:KEY,
          Authorization:'Bearer '+KEY,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          p_path:location.pathname+location.search,
          p_page_slug:pageSlug,
          p_post_id:postId,
          p_visitor_id:getPersistentId(),
          p_session_id:getSessionId()
        })
      });
    }catch(e){
      console.warn('analytics unavailable');
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',track,{once:true});
  }else{
    track();
  }
})();
