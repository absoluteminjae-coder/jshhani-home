
(function(){
  const C=window.JSH_CONFIG||{};
  const FUNCTION_URL='https://cegqsbsxtrvwmlqnilsz.supabase.co/functions/v1/kakao-review-auth';
  const TOKEN_KEY='jsh_review_session_v1';
  let token=localStorage.getItem(TOKEN_KEY)||'';
  let reviewRows=[];

  const $=id=>document.getElementById(id);

  function esc(s=''){
    return String(s).replace(/[&<>"']/g,m=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[m]));
  }

  function captureToken(){
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    const fresh=hash.get('review_token');
    if(fresh){
      token=fresh;
      localStorage.setItem(TOKEN_KEY,token);
      history.replaceState(null,'',location.pathname+location.search);
    }
  }

  function authErrorMessage(){
    const code=new URLSearchParams(location.search).get('auth_error');
    if(!code)return '';

    const map={
      invalid_state:'로그인 확인정보가 만료되었습니다. 다시 로그인해주세요.',
      token_exchange:'카카오 로그인 처리 중 오류가 발생했습니다.',
      user_lookup:'카카오 사용자 정보를 확인하지 못했습니다.',
      email_required:'카카오 계정 이메일 제공 동의가 필요합니다.'
    };
    return map[code]||'로그인을 완료하지 못했습니다.';
  }

  async function api(action,extra={}){
    const r=await fetch(FUNCTION_URL,{
      method:'POST',
      cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action,token,...extra})
    });

    let data={};
    try{data=await r.json()}catch(e){}

    if(r.status===401){
      localStorage.removeItem(TOKEN_KEY);
      token='';
      throw new Error('login_required');
    }

    if(!r.ok)throw new Error(data.error||'request_failed');
    return data;
  }

  function showLogin(message=''){
    $('loginGate').style.display='';
    $('reviewsContent').style.display='none';
    const error=$('reviewLoginError');
    if(error){
      error.textContent=message||authErrorMessage();
      error.style.display=error.textContent?'block':'none';
    }
  }

  function showContent(email){
    $('loginGate').style.display='none';
    $('reviewsContent').style.display='';
    $('reviewUserName').textContent=email||'로그인 사용자';
  }

  function loginWithKakao(){
    const returnTo=location.origin+location.pathname;
    location.href=FUNCTION_URL+'?start=1&return_to='+encodeURIComponent(returnTo);
  }

  function logout(){
    localStorage.removeItem(TOKEN_KEY);
    token='';
    location.reload();
  }

  async function loadReviews(){
    const data=await api('list');
    reviewRows=data.reviews||[];
    showContent(data.email);

    $('reviewCount').textContent='총 '+reviewRows.length+'개의 진료후기';

    $('reviewList').innerHTML=reviewRows.length
      ?reviewRows.map(r=>`
        <article class="review-row" onclick="Reviews.openReview('${r.id}')">
          <div>
            ${r.treatment_category?`<span class="review-category">${esc(r.treatment_category)}</span>`:''}
            <h2>${esc(r.title||'')}</h2>
            <p>${esc(r.summary||'')}</p>
          </div>
          <div class="review-thumb">
            ${r.image_url?`<img src="${esc(r.image_url)}" alt="">`:'진료후기'}
          </div>
        </article>
      `).join('')
      :'<div class="reviews-loading">등록된 진료후기가 없습니다.</div>';
  }

  async function openReview(id){
    try{
      const data=await api('get',{id});
      const r=data.review;

      $('reviewListView').classList.add('hidden');
      $('reviewDetail').classList.add('active');
      $('reviewDetailTitle').textContent=r.title||'';
      $('reviewDetailCategory').textContent=r.treatment_category||'';
      $('reviewDetailImage').innerHTML=r.image_url?`<img src="${esc(r.image_url)}" alt="">`:'';
      $('reviewDetailImage').style.display=r.image_url?'':'none';
      $('reviewDetailBody').innerHTML=r.content_html||'<p>내용이 없습니다.</p>';
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(e){
      if(e.message==='login_required')showLogin('로그인 시간이 만료되었습니다. 다시 로그인해주세요.');
      else alert('후기를 불러오지 못했습니다.');
    }
  }

  function backToList(){
    $('reviewDetail').classList.remove('active');
    $('reviewListView').classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function init(){
    captureToken();

    if(!token){
      showLogin();
      return;
    }

    try{
      await loadReviews();
    }catch(e){
      if(e.message==='login_required')showLogin('로그인이 필요합니다.');
      else showLogin('후기 게시판을 불러오지 못했습니다.');
    }
  }

  window.Reviews={loginWithKakao,logout,openReview,backToList};

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
