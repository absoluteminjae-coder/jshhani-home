
(function(){
  const C=window.JSH_CONFIG||{};
  const BASE=(C.supabaseUrl||'').replace(/\/$/,'');
  const KEY=C.supabaseAnonKey||'';
  const TOKEN_KEY='jsh_admin_access_token';
  let token=localStorage.getItem(TOKEN_KEY)||'';
  let editMode=localStorage.getItem('jsh_front_edit_mode')==='1';
  let currentEdit=null;
  let pageCache=[];
  let mediaCache=[];

  const HOME_FIELDS={
    '.slide-1 h1':{key:'hero1_title',label:'메인 슬라이드 1 제목',type:'text'},
    '.slide-1 p':{key:'hero1_subtitle',label:'메인 슬라이드 1 설명',type:'textarea'},
    '.slide-2 h1':{key:'hero2_title',label:'메인 슬라이드 2 제목',type:'text'},
    '.slide-2 p':{key:'hero2_subtitle',label:'메인 슬라이드 2 설명',type:'textarea'},
    '.slide-3 h1':{key:'hero3_title',label:'메인 슬라이드 3 제목',type:'text'},
    '.slide-3 p':{key:'hero3_subtitle',label:'메인 슬라이드 3 설명',type:'textarea'},
    '#clinics .section-head h2':{key:'clinics_title',label:'주요 진료 제목',type:'text'},
    '#clinics .section-head p':{key:'clinics_subtitle',label:'주요 진료 설명',type:'textarea'},
    '#doctor .doctor-copy h2':{key:'doctor_title',label:'의료진 소개 제목',type:'text'},
    '#doctor .doctor-name':{key:'doctor_name',label:'원장명',type:'text'},
    '#doctor .doctor-copy p':{key:'doctor_body',label:'의료진 소개 문구',type:'textarea'},
    '[data-section="health-content"] .section-head h2':{key:'health_title',label:'건강정보 제목',type:'text'},
    '[data-section="health-content"] .section-head p':{key:'health_subtitle',label:'건강정보 설명',type:'textarea'},
    '#visit .section-head h2':{key:'visit_title',label:'오시는 길 제목',type:'text'},
    '#visit .section-head p':{key:'visit_subtitle',label:'오시는 길 설명',type:'textarea'}
  };

  function esc(s=''){
    return String(s).replace(/[&<>"']/g,m=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[m]));
  }

  function authHeaders(extra={}){
    return {apikey:KEY,Authorization:'Bearer '+token,...extra};
  }

  async function api(path,opt={}){
    const r=await fetch(BASE+'/rest/v1/'+path,{
      ...opt,
      headers:authHeaders({'Content-Type':'application/json',...(opt.headers||{})})
    });
    const text=await r.text();
    if(!r.ok)throw new Error(text||('HTTP '+r.status));
    return text?JSON.parse(text):null;
  }

  async function verifyAdmin(){
    if(!token)return false;
    try{
      const u=await fetch(BASE+'/auth/v1/user',{headers:authHeaders()});
      if(!u.ok)return false;
      const user=await u.json();
      if(!user?.id)return false;

      const rows=await api('admin_users?select=id&id=eq.'+encodeURIComponent(user.id)+'&limit=1');
      return !!rows?.length;
    }catch(e){return false}
  }

  function toast(msg){
    let t=document.querySelector('.jsh-editor-toast');
    if(!t){
      t=document.createElement('div');
      t.className='jsh-editor-toast';
      document.body.appendChild(t);
    }
    t.textContent=msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer=setTimeout(()=>t.classList.remove('show'),2200);
  }

  function ensureUI(){
    if(document.getElementById('jshEditorBar'))return;

    const bar=document.createElement('div');
    bar.id='jshEditorBar';
    bar.innerHTML=`
      <button id="jshEditToggle" type="button">✎ 편집 모드</button>
      <button id="jshHeroEditorBtn" type="button">▣ 대문 편집</button>
      <button id="jshBrandEditorBtn" type="button">◈ 홈페이지 아이콘</button>
      <button id="jshNewPostBtn" type="button">＋ 새 글</button>
      <a href="admin.html">관리자</a>`;
    document.body.appendChild(bar);

    const modal=document.createElement('div');
    modal.id='jshEditorModal';
    modal.innerHTML=`
      <div class="jsh-editor-dialog">
        <div class="jsh-editor-head">
          <h3 id="jshEditorTitle">수정</h3>
          <button class="jsh-editor-close" type="button">×</button>
        </div>
        <div class="jsh-editor-body" id="jshEditorBody"></div>
        <div class="jsh-editor-actions">
          <button type="button" id="jshEditorCancel">취소</button>
          <button type="button" class="primary" id="jshEditorSave">저장</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    bar.querySelector('#jshEditToggle').onclick=toggleMode;
    bar.querySelector('#jshHeroEditorBtn').onclick=()=>openHeroManager();
    bar.querySelector('#jshBrandEditorBtn').onclick=()=>openBrandManager();
    bar.querySelector('#jshNewPostBtn').onclick=()=>openPostEditor(null);
    modal.querySelector('.jsh-editor-close').onclick=closeModal;
    modal.querySelector('#jshEditorCancel').onclick=closeModal;
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
    updateMode();
  }



  async function openBrandManager(){
    const brand=await getSetting('brand_assets');

    openModal('홈페이지 아이콘 설정',`
      <div class="jsh-brand-manager">
        <div class="jsh-editor-field wide">
          <label>헤더 로고</label>
          <div class="jsh-brand-preview">
            ${brand.logo_url?`<img src="${esc(brand.logo_url)}" id="jshLogoPreview">`:'<span>등록된 로고 없음</span>'}
          </div>
          <input id="jshLogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
          <div class="jsh-small-note">권장: 투명 배경 PNG/WebP 또는 SVG. 래스터 이미지는 최대 1200px / 약 500KB 이하로 자동 최적화합니다.</div>
        </div>

        <div class="jsh-editor-field">
          <label>PC 로고 높이</label>
          <input id="jshLogoDesktopRange" type="range" min="20" max="80" step="1" value="${Number(brand.logo_desktop_height)||42}">
          <div class="jsh-position-number-row">
            <button type="button" class="jsh-logo-nudge" data-target="jshLogoDesktopNumber" data-delta="-1">−</button>
            <input id="jshLogoDesktopNumber" type="number" min="20" max="80" step="1" value="${Number(brand.logo_desktop_height)||42}">
            <span>px</span>
            <button type="button" class="jsh-logo-nudge" data-target="jshLogoDesktopNumber" data-delta="1">＋</button>
          </div>
        </div>

        <div class="jsh-editor-field">
          <label>모바일 로고 높이</label>
          <input id="jshLogoMobileRange" type="range" min="18" max="64" step="1" value="${Number(brand.logo_mobile_height)||34}">
          <div class="jsh-position-number-row">
            <button type="button" class="jsh-logo-nudge" data-target="jshLogoMobileNumber" data-delta="-1">−</button>
            <input id="jshLogoMobileNumber" type="number" min="18" max="64" step="1" value="${Number(brand.logo_mobile_height)||34}">
            <span>px</span>
            <button type="button" class="jsh-logo-nudge" data-target="jshLogoMobileNumber" data-delta="1">＋</button>
          </div>
        </div>

        <div class="jsh-editor-field wide">
          <label>브라우저 탭 아이콘 (favicon)</label>
          <div class="jsh-icon-preview">
            ${brand.favicon_url?`<img src="${esc(brand.favicon_url)}" id="jshFaviconPreview">`:'<span>아이콘 없음</span>'}
          </div>
          <input id="jshFaviconFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon">
          <div class="jsh-small-note">정사각형 권장. 업로드 시 512×512 이하 PNG로 최적화합니다.</div>
        </div>

        <div class="jsh-editor-field wide">
          <label>모바일 홈 화면 아이콘</label>
          <div class="jsh-icon-preview">
            ${brand.touch_icon_url?`<img src="${esc(brand.touch_icon_url)}" id="jshTouchPreview">`:'<span>아이콘 없음</span>'}
          </div>
          <input id="jshTouchFile" type="file" accept="image/png,image/jpeg,image/webp">
          <div class="jsh-small-note">권장 512×512 정사각형. 별도 등록하지 않으면 favicon을 같이 사용합니다.</div>
        </div>

        <div class="jsh-editor-field wide">
          <label>사이트 제목 (브라우저 탭)</label>
          <input id="jshSiteTitle" value="${esc(brand.site_title||'제세현한의원 | 청주 한의원')}">
        </div>
      </div>
    `,async()=>{
      const next={...brand};
      const logoFile=document.getElementById('jshLogoFile').files?.[0];
      const favFile=document.getElementById('jshFaviconFile').files?.[0];
      const touchFile=document.getElementById('jshTouchFile').files?.[0];

      if(logoFile){
        const optimized=await optimizeBrandImage(logoFile,'logo');
        next.logo_url=await uploadGenericImageBlob(optimized.blob,optimized.filename);
      }
      if(favFile){
        const optimized=await optimizeBrandImage(favFile,'icon');
        next.favicon_url=await uploadGenericImageBlob(optimized.blob,optimized.filename);
      }
      if(touchFile){
        const optimized=await optimizeBrandImage(touchFile,'icon');
        next.touch_icon_url=await uploadGenericImageBlob(optimized.blob,optimized.filename);
      }

      next.site_title=document.getElementById('jshSiteTitle').value.trim();
      next.logo_alt='제세현한의원';
      next.logo_desktop_height=Math.max(20,Math.min(80,Number(document.getElementById('jshLogoDesktopNumber').value)||42));
      next.logo_mobile_height=Math.max(18,Math.min(64,Number(document.getElementById('jshLogoMobileNumber').value)||34));

      await saveSetting('brand_assets',next);

      const verify=await getSetting('brand_assets');
      if(next.logo_url && verify.logo_url!==next.logo_url)throw new Error('로고 저장 확인 실패');
      if(next.favicon_url && verify.favicon_url!==next.favicon_url)throw new Error('아이콘 저장 확인 실패');

      closeModal();
      toast('로고와 홈페이지 아이콘을 저장했습니다.');
      setTimeout(()=>location.reload(),500);
    });

    bindBrandPreview('jshLogoFile','jshLogoPreview','.jsh-brand-preview');
    bindBrandPreview('jshFaviconFile','jshFaviconPreview','.jsh-icon-preview');
    bindBrandPreview('jshTouchFile','jshTouchPreview','.jsh-icon-preview');

    const syncLogoSize=(rangeId,numId,min,max)=>{
      const range=document.getElementById(rangeId);
      const num=document.getElementById(numId);
      const preview=document.getElementById('jshLogoPreview');
      if(!range||!num)return;

      range.oninput=()=>{
        num.value=range.value;
        if(preview)preview.style.height=range.value+'px';
      };
      num.oninput=()=>{
        const v=Math.max(min,Math.min(max,Number(num.value)||min));
        range.value=v;
        if(preview)preview.style.height=v+'px';
      };
    };

    syncLogoSize('jshLogoDesktopRange','jshLogoDesktopNumber',20,80);
    syncLogoSize('jshLogoMobileRange','jshLogoMobileNumber',18,64);

    document.querySelectorAll('.jsh-logo-nudge').forEach(btn=>{
      btn.onclick=()=>{
        const input=document.getElementById(btn.dataset.target);
        if(!input)return;
        const min=Number(input.min)||0,max=Number(input.max)||999;
        const next=Math.max(min,Math.min(max,(Number(input.value)||0)+Number(btn.dataset.delta||0)));
        input.value=next;
        input.dispatchEvent(new Event('input',{bubbles:true}));
      };
    });
  }

  function bindBrandPreview(inputId,imgId,wrapSelector){
    const input=document.getElementById(inputId);
    if(!input)return;
    input.onchange=()=>{
      const f=input.files?.[0];
      if(!f)return;
      const url=URL.createObjectURL(f);
      let img=document.getElementById(imgId);
      if(!img){
        const wrap=input.previousElementSibling;
        img=document.createElement('img');
        img.id=imgId;
        wrap.innerHTML='';
        wrap.appendChild(img);
      }
      img.src=url;
    };
  }

  async function optimizeBrandImage(file,type='logo'){
    // SVG logo is kept as-is.
    if(file.type==='image/svg+xml'){
      return {blob:file,filename:file.name||'logo.svg'};
    }

    if(!file.type.startsWith('image/'))throw new Error('이미지 파일만 업로드할 수 있습니다.');

    const bitmap=await createImageBitmap(file);
    let maxW=1200,maxH=600,targetType='image/webp',quality=.86,targetBytes=500*1024;

    if(type==='icon'){
      maxW=512;maxH=512;targetType='image/png';quality=1;targetBytes=700*1024;
    }

    const scale=Math.min(1,maxW/bitmap.width,maxH/bitmap.height);
    const w=Math.max(1,Math.round(bitmap.width*scale));
    const h=Math.max(1,Math.round(bitmap.height*scale));

    const canvas=document.createElement('canvas');
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:true});
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(bitmap,0,0,w,h);
    bitmap.close?.();

    let blob=await new Promise(res=>canvas.toBlob(res,targetType,quality));
    if(!blob)throw new Error('브랜드 이미지 최적화 실패');

    const base=(file.name||type).replace(/\.[^.]+$/,'').replace(/[^\w가-힣-]+/g,'-').slice(0,40)||type;
    return {blob,filename:base+(type==='icon'?'.png':'.webp')};
  }

  async function getSetting(key){
    const rows=await api('cms_settings?select=value&key=eq.'+encodeURIComponent(key)+'&limit=1');
    return rows?.[0]?.value||{};
  }


  async function saveAdminSettingRpc(key,value){
    const saved=await api('rpc/admin_set_cms_setting',{
      method:'POST',
      body:JSON.stringify({
        p_key:key,
        p_value:value
      })
    });
    return saved;
  }

  function normalizeDedicatedDoctorPosition(value){
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));

    const point=(obj={})=>{
      const x=clamp(obj.x,-30,30);
      const y=clamp(obj.y,-30,30);
      const requiredZoom=100+(2*Math.max(Math.abs(x),Math.abs(y)))+4;
      const zoom=clamp(Math.max(Number(obj.zoom)||100,requiredZoom),100,220);
      return {x,y,zoom};
    };

    return {
      desktop:point(value?.desktop),
      mobile:point(value?.mobile)
    };
  }

  async function getDedicatedDoctorPosition(){
    const value=await getSetting('doctor_image_position');
    return normalizeDedicatedDoctorPosition(
      Object.keys(value||{}).length
        ? value
        : {desktop:{x:0,y:0,zoom:100},mobile:{x:0,y:0,zoom:100}}
    );
  }

  async function saveDedicatedDoctorPosition(value){
    const normalized=normalizeDedicatedDoctorPosition(value);
    await saveAdminSettingRpc('doctor_image_position',normalized);

    const verify=await getDedicatedDoctorPosition();
    const same=(a,b)=>Number(a.x)===Number(b.x)
      && Number(a.y)===Number(b.y)
      && Number(a.zoom)===Number(b.zoom);

    if(!same(normalized.desktop,verify.desktop) || !same(normalized.mobile,verify.mobile)){
      throw new Error('저장값 확인 실패');
    }
    return verify;
  }

  function applyDedicatedDoctorPositionPreview(el,value){
    if(!el)return;
    const img=el.querySelector('img');
    if(!img)return;

    const normalized=normalizeDedicatedDoctorPosition(value);
    const mobile=window.matchMedia('(max-width:700px)').matches;
    const p=mobile?normalized.mobile:normalized.desktop;

    el.style.setProperty('position','relative','important');
    el.style.setProperty('overflow','hidden','important');

    [
      'position','left','top','right','bottom','width','height','max-width',
      'object-fit','object-position','transform','transform-origin','margin','inset'
    ].forEach(prop=>img.style.removeProperty(prop));

    img.style.setProperty('position','absolute','important');
    img.style.setProperty('left',`calc(50% + ${p.x}%)`,'important');
    img.style.setProperty('top',`calc(50% + ${p.y}%)`,'important');
    img.style.setProperty('width',p.zoom+'%','important');
    img.style.setProperty('height',p.zoom+'%','important');
    img.style.setProperty('max-width','none','important');
    img.style.setProperty('object-fit','cover','important');
    img.style.setProperty('object-position','50% 50%','important');
    img.style.setProperty('transform','translate(-50%,-50%)','important');
    img.style.setProperty('transform-origin','center center','important');
  }

  async function saveSetting(key,value){
    await api('cms_settings?on_conflict=key',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({key,value})
    });
  }

  function heroSelector(index){
    return '#hero .hero-slide.slide-'+index+' > .hero-bg';
  }

  async function openHeroManager(slideNo=1){
    if(!isHomePage()){
      toast('대문 편집은 메인페이지에서 사용할 수 있습니다.');
      return;
    }

    const media=await getSetting('home_media');
    const overrides=await loadHomeOverrides();

    const render=async(current)=>{
      const idx=Math.max(1,Math.min(3,Number(current)||1));
      const key='hero'+idx;
      const selector=heroSelector(idx);
      const data=overrides[selector]||{};
      const src=data.src||media[key]||'';
      const dx=Number.isFinite(Number(data.desktop_x))?Number(data.desktop_x):50;
      const dy=Number.isFinite(Number(data.desktop_y))?Number(data.desktop_y):50;
      const mx=Number.isFinite(Number(data.mobile_x))?Number(data.mobile_x):dx;
      const my=Number.isFinite(Number(data.mobile_y))?Number(data.mobile_y):dy;

      openModal('대문 이미지 편집',`
        <div class="jsh-hero-tabs">
          ${[1,2,3].map(n=>`
            <button type="button" class="${n===idx?'active':''}" data-hero-tab="${n}">
              슬라이드 ${n}
            </button>`).join('')}
        </div>

        <div class="jsh-hero-manager-grid">
          <div class="jsh-hero-manager-left">
            <div class="jsh-editor-field wide">
              <label>현재 이미지</label>
              <div class="jsh-hero-current-preview" id="jshHeroCurrentPreview"
                ${src?`style="background-image:url('${esc(src)}')"`:''}>
                ${src?'':'등록된 이미지가 없습니다.'}
              </div>
            </div>

            <div class="jsh-editor-field wide">
              <label>새 이미지 업로드</label>
              <input id="jshHeroFile" type="file" accept="image/*">
              <div id="jshHeroOptimizeInfo" class="jsh-small-note">
                업로드 시 자동으로 최대 1920×1080, WebP, 약 1.5MB 이하로 최적화합니다.
              </div>
            </div>

            <div class="jsh-editor-field wide">
              <label>이미지 URL</label>
              <input id="jshHeroUrl" value="${esc(src)}">
            </div>
          </div>

          <div class="jsh-hero-manager-right">
            <div class="jsh-editor-field wide">
              <label>PC 위치</label>
              <div class="jsh-position-grid">
                <div>
                  <span>좌↔우 <b id="jshHDxLabel">${dx}%</b></span>
                  <input id="jshHDx" type="range" min="0" max="100" step="0.5" value="${dx}">
                  <div class="jsh-position-number-row">
                    <button type="button" class="jsh-nudge" data-target="jshHDx" data-delta="-1">←</button>
                    <input id="jshHDxNum" type="number" min="0" max="100" step="0.5" value="${dx}">
                    <span>%</span>
                    <button type="button" class="jsh-nudge" data-target="jshHDx" data-delta="1">→</button>
                  </div>
                </div>
                <div>
                  <span>상↕하 <b id="jshHDyLabel">${dy}%</b></span>
                  <input id="jshHDy" type="range" min="0" max="100" step="0.5" value="${dy}">
                  <div class="jsh-position-number-row">
                    <button type="button" class="jsh-nudge" data-target="jshHDy" data-delta="-1">↑</button>
                    <input id="jshHDyNum" type="number" min="0" max="100" step="0.5" value="${dy}">
                    <span>%</span>
                    <button type="button" class="jsh-nudge" data-target="jshHDy" data-delta="1">↓</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="jsh-editor-field wide">
              <label>모바일 위치</label>
              <div class="jsh-position-grid">
                <div>
                  <span>좌↔우 <b id="jshHMxLabel">${mx}%</b></span>
                  <input id="jshHMx" type="range" min="0" max="100" step="0.5" value="${mx}">
                  <div class="jsh-position-number-row">
                    <button type="button" class="jsh-nudge" data-target="jshHMx" data-delta="-1">←</button>
                    <input id="jshHMxNum" type="number" min="0" max="100" step="0.5" value="${mx}">
                    <span>%</span>
                    <button type="button" class="jsh-nudge" data-target="jshHMx" data-delta="1">→</button>
                  </div>
                </div>
                <div>
                  <span>상↕하 <b id="jshHMyLabel">${my}%</b></span>
                  <input id="jshHMy" type="range" min="0" max="100" step="0.5" value="${my}">
                  <div class="jsh-position-number-row">
                    <button type="button" class="jsh-nudge" data-target="jshHMy" data-delta="-1">↑</button>
                    <input id="jshHMyNum" type="number" min="0" max="100" step="0.5" value="${my}">
                    <span>%</span>
                    <button type="button" class="jsh-nudge" data-target="jshHMy" data-delta="1">↓</button>
                  </div>
                </div>
              </div>

              <div class="jsh-position-presets" style="margin-top:10px">
                <button type="button" data-hero-pos="50,50">가운데</button>
                <button type="button" data-hero-pos="50,20">위쪽</button>
                <button type="button" data-hero-pos="50,80">아래쪽</button>
                <button type="button" data-hero-pos="20,50">왼쪽</button>
                <button type="button" data-hero-pos="80,50">오른쪽</button>
              </div>
              <div class="jsh-small-note" style="margin-top:8px">
                숫자는 0.5% 단위로 입력할 수 있고, 화살표는 한 번 누를 때 1%씩 이동합니다.
              </div>
            </div>

            <div class="jsh-editor-field wide">
              <label>모바일 미리보기</label>
              <div class="jsh-mobile-preview">
                <div class="jsh-mobile-phone">
                  <div id="jshHeroMobilePreview" class="jsh-position-preview"
                    ${src?`style="background-image:url('${esc(src)}');background-position:${mx}% ${my}%"`:''}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,async()=>{
        let url=document.getElementById('jshHeroUrl').value.trim();
        const file=document.getElementById('jshHeroFile').files?.[0];

        if(file){
          const optimized=await optimizeImage(file,true);
          url=await uploadGenericImageBlob(optimized.blob,optimized.filename);
        }
        if(!url){
          toast('대문 이미지를 선택해주세요.');
          return;
        }

        // Update home_media so the base hero image is also correct.
        media[key]=url;
        await saveSetting('home_media',media);

        // Save independent desktop/mobile focal positions.
        const all=await loadHomeOverrides();
        all[selector]={
          kind:'image',
          src:url,
          desktop_x:Number(document.getElementById('jshHDx').value),
          desktop_y:Number(document.getElementById('jshHDy').value),
          mobile_x:Number(document.getElementById('jshHMx').value),
          mobile_y:Number(document.getElementById('jshHMy').value)
        };
        await saveSetting('home_overrides',all);

        // Read back once to verify that Supabase actually persisted the change.
        const verify=await getSetting('home_overrides');
        const saved=verify[selector];
        if(!saved ||
           Number(saved.mobile_x)!==Number(all[selector].mobile_x) ||
           Number(saved.mobile_y)!==Number(all[selector].mobile_y)){
          throw new Error('위치값 저장 확인에 실패했습니다.');
        }

        closeModal();
        toast('대문 이미지와 위치를 저장했습니다.');
        setTimeout(()=>location.reload(),500);
      });

      document.querySelectorAll('[data-hero-tab]').forEach(btn=>{
        btn.onclick=()=>render(Number(btn.dataset.heroTab));
      });

      const preview=document.getElementById('jshHeroMobilePreview');
      const currentPreview=document.getElementById('jshHeroCurrentPreview');
      const fileInput=document.getElementById('jshHeroFile');

      if(fileInput){
        fileInput.onchange=()=>{
          const f=fileInput.files?.[0];
          if(!f)return;
          const u=URL.createObjectURL(f);
          preview.style.backgroundImage=`url("${u}")`;
          currentPreview.style.backgroundImage=`url("${u}")`;
          currentPreview.textContent='';
          const info=document.getElementById('jshHeroOptimizeInfo');
          info.textContent=`원본 ${(f.size/1024/1024).toFixed(2)}MB · 저장 시 자동 최적화`;
        };
      }

      const clamp=(v)=>Math.min(100,Math.max(0,Number(v)||0));

      const sync=(sourceId=null)=>{
        const pairs=[
          ['jshHDx','jshHDxNum','jshHDxLabel'],
          ['jshHDy','jshHDyNum','jshHDyLabel'],
          ['jshHMx','jshHMxNum','jshHMxLabel'],
          ['jshHMy','jshHMyNum','jshHMyLabel']
        ];

        pairs.forEach(([rangeId,numId,labelId])=>{
          const range=document.getElementById(rangeId);
          const num=document.getElementById(numId);
          const label=document.getElementById(labelId);

          if(sourceId===numId){
            const v=clamp(num.value);
            range.value=v;
            num.value=v;
          }else if(sourceId===rangeId){
            num.value=range.value;
          }

          if(label)label.textContent=range.value+'%';
        });

        const mx=document.getElementById('jshHMx').value;
        const my=document.getElementById('jshHMy').value;
        preview.style.backgroundPosition=mx+'% '+my+'%';
      };

      [
        ['jshHDx','jshHDxNum'],
        ['jshHDy','jshHDyNum'],
        ['jshHMx','jshHMxNum'],
        ['jshHMy','jshHMyNum']
      ].forEach(([rangeId,numId])=>{
        document.getElementById(rangeId).oninput=()=>sync(rangeId);
        document.getElementById(numId).oninput=()=>sync(numId);
        document.getElementById(numId).onchange=()=>sync(numId);
      });

      document.querySelectorAll('.jsh-nudge').forEach(btn=>{
        btn.onclick=()=>{
          const targetId=btn.dataset.target;
          const delta=Number(btn.dataset.delta)||0;
          const range=document.getElementById(targetId);
          const num=document.getElementById(targetId+'Num');
          const next=Math.round(clamp(Number(range.value)+delta)*10)/10;
          range.value=next;
          num.value=next;
          sync(targetId);
        };
      });

      sync();

      document.querySelectorAll('[data-hero-pos]').forEach(btn=>{
        btn.onclick=()=>{
          const [x,y]=btn.dataset.heroPos.split(',').map(Number);
          document.getElementById('jshHMx').value=x;
          document.getElementById('jshHMy').value=y;
          document.getElementById('jshHMxNum').value=x;
          document.getElementById('jshHMyNum').value=y;
          sync();
        };
      });
    };

    await render(slideNo);
  }

  function toggleMode(){
    editMode=!editMode;
    localStorage.setItem('jsh_front_edit_mode',editMode?'1':'0');
    updateMode();
  }

  function updateMode(){
    document.body.classList.toggle('jsh-edit-mode',editMode);
    const btn=document.getElementById('jshEditToggle');
    if(btn)btn.classList.toggle('active',editMode);
    attachPostButtons();
    markHomeFields();
    markGenericHomeElements();
    attachHeroImageButtons();
    attachDirectPositionDrags();
  }

  function closeModal(){
    const m=document.getElementById('jshEditorModal');
    if(m)m.classList.remove('open');
    currentEdit=null;
  }

  function openModal(title,html,onSave){
    document.getElementById('jshEditorTitle').textContent=title;
    document.getElementById('jshEditorBody').innerHTML=html;
    const save=document.getElementById('jshEditorSave');
    save.onclick=onSave;
    document.getElementById('jshEditorModal').classList.add('open');
  }

  async function loadPages(){
    if(pageCache.length)return pageCache;
    pageCache=await api('cms_pages?select=id,name,slug,is_visible&order=sort_order.asc,name.asc');
    return pageCache;
  }


  function isHomePage(){
    const p=location.pathname;
    return p.endsWith('/') || p.endsWith('/index.html') || p.endsWith('index.html');
  }

  function stableSelector(el){
    if(!el || !el.tagName)return '';

    if(el.id)return '#'+CSS.escape(el.id);

    // Prefer section id + local structural path
    let section=el.closest('section[id]');
    const parts=[];
    let node=el;

    while(node && node!==document.body && node!==section){
      let part=node.tagName.toLowerCase();

      if(node.classList.length){
        const usable=[...node.classList].filter(c=>
          !c.startsWith('jsh-') &&
          !['active','selected','hidden','show','visible'].includes(c)
        );
        if(usable.length){
          part += '.'+usable.slice(0,2).map(c=>CSS.escape(c)).join('.');
        }
      }

      const parent=node.parentElement;
      if(parent){
        const siblings=[...parent.children].filter(x=>x.tagName===node.tagName);
        if(siblings.length>1){
          part += `:nth-of-type(${siblings.indexOf(node)+1})`;
        }
      }
      parts.unshift(part);
      node=parent;
    }

    const prefix=section ? '#'+CSS.escape(section.id) : 'body';
    return prefix+' '+parts.join(' > ');
  }

  function isAllowedPublicImageTarget(el){
    return !!el && (
      el.classList?.contains('hero-bg') ||
      el.classList?.contains('clinic-image') ||
      el.classList?.contains('doctor-photo') ||
      el.classList?.contains('map-placeholder')
    );
  }

  function isExcludedElement(el){
    if(el?.closest?.('.hero-image-placeholder,.header .brand'))return true;
    if(!el || !el.closest)return true;
    if(el.closest('#jshEditorBar,#jshEditorModal,.jsh-editor-toast'))return true;
    if(el.closest('[data-post-id]'))return true; // posts use post editor
    if(el.closest('script,style,noscript,svg,canvas'))return true;
    if(el.closest('[data-dynamic-nav]'))return true; // menu is managed by page settings
    return false;
  }

  function hasOwnVisibleText(el){
    const own=[...el.childNodes]
      .filter(n=>n.nodeType===Node.TEXT_NODE)
      .map(n=>n.textContent.trim())
      .join(' ')
      .trim();
    if(own)return true;

    // leaf-ish text containers
    if(!el.querySelector('h1,h2,h3,h4,p,button,a,li,span,strong,em')) {
      return (el.textContent||'').trim().length>0;
    }
    return false;
  }


  function attachHeroImageButtons(){
    if(!isHomePage())return;

    document.querySelectorAll('#hero .hero-slide').forEach((slide,index)=>{
      const bg=slide.querySelector('.hero-bg');
      if(!bg)return;

      if(!bg.dataset.jshSelector){
        bg.dataset.jshSelector=stableSelector(bg);
        bg.dataset.jshKind='background';
      }

      if(slide.querySelector(':scope > .jsh-hero-image-edit'))return;

      const btn=document.createElement('button');
      btn.type='button';
      btn.className='jsh-hero-image-edit';
      btn.innerHTML='▣ 대문 이미지 · 위치';
      btn.title='PC와 모바일 이미지 위치를 각각 조절합니다.';
      btn.onclick=e=>{
        e.preventDefault();
        e.stopPropagation();
        openGenericElementEditor(bg);
      };
      slide.appendChild(btn);
    });
  }

  function markGenericHomeElements(){
    if(!isHomePage())return;

    const textSelectors=[
      'main h1','main h2','main h3','main h4',
      'main p','main li','main button','main a',
      'footer p','footer a','footer span',
      '.cta a','.cta button'
    ];

    document.querySelectorAll(textSelectors.join(',')).forEach(el=>{
      if(isExcludedElement(el))return;
      if(el.dataset.jshEditable)return;
      if(!hasOwnVisibleText(el) && !['A','BUTTON'].includes(el.tagName))return;

      const selector=stableSelector(el);
      if(!selector)return;

      el.dataset.jshEditable='generic';
      el.dataset.jshSelector=selector;
      el.dataset.jshKind=(el.tagName==='A')?'link':'text';

      if(!el.dataset.jshGenericBound){
        el.dataset.jshGenericBound='1';
        el.addEventListener('click',e=>{
          if(!editMode)return;
          e.preventDefault();
          e.stopPropagation();
          openGenericElementEditor(el);
        });
      }
    });

    // Direct IMG editing
    document.querySelectorAll('main img, footer img').forEach(el=>{
      if(isExcludedElement(el))return;
      if(el.dataset.jshEditable)return;

      const selector=stableSelector(el);
      if(!selector)return;

      el.dataset.jshEditable='generic-image';
      el.dataset.jshSelector=selector;
      el.dataset.jshKind='image';

      if(!el.dataset.jshGenericBound){
        el.dataset.jshGenericBound='1';
        el.addEventListener('click',e=>{
          if(!editMode)return;
          e.preventDefault();
          e.stopPropagation();
          openGenericElementEditor(el);
        });
      }
    });

    // Background-image placeholders / hero images / clinic cards
    document.querySelectorAll(
      '.hero-bg,.clinic-image,.doctor-photo,.map-placeholder'
    ).forEach(el=>{
      if(isExcludedElement(el))return;
      if(el.dataset.jshEditable)return;

      const selector=stableSelector(el);
      if(!selector)return;
      el.dataset.jshEditable='generic-image';
      el.dataset.jshSelector=selector;
      el.dataset.jshKind='background';

      if(!el.dataset.jshGenericBound){
        el.dataset.jshGenericBound='1';
        el.addEventListener('click',e=>{
          if(!editMode)return;
          if(el._jshDraggedRecently && Date.now()-el._jshDraggedRecently<500)return;
          if(e.target.closest('[data-jsh-editable="home-copy"]'))return;
          e.preventDefault();
          e.stopPropagation();
          openGenericElementEditor(el);
        });
      }
    });
  }


  const HOME_POSITION_KEYS=[
    'clinicDamjeok','clinicBopye','clinicVascular',
    'clinicDiet','clinicPain','clinicAutonomic'
  ];

  function homePositionKeyForElement(el){
    if(!el)return '';
    if(el.classList?.contains('doctor-photo'))return 'doctor';

    if(el.classList?.contains('clinic-image')){
      const cards=[...document.querySelectorAll('#clinics .clinic-card')];
      const card=el.closest('.clinic-card');
      const index=cards.indexOf(card);
      return index>=0 ? (HOME_POSITION_KEYS[index]||'') : '';
    }

    return '';
  }

  async function loadHomeImagePositions(){
    try{
      return await getSetting('home_image_positions');
    }catch(e){
      return {};
    }
  }

  async function saveFixedHomeImagePosition(key,data){
    if(!key)return;

    const all=await loadHomeImagePositions();
    all[key]={
      desktop_x:Number(data.desktop_x),
      desktop_y:Number(data.desktop_y),
      mobile_x:Number(data.mobile_x),
      mobile_y:Number(data.mobile_y)
    };

    await saveSetting('home_image_positions',all);

    // Read back to ensure the value really persisted.
    const verify=await getSetting('home_image_positions');
    const saved=verify?.[key];
    if(!saved ||
       Number(saved.desktop_x)!==Number(all[key].desktop_x) ||
       Number(saved.desktop_y)!==Number(all[key].desktop_y) ||
       Number(saved.mobile_x)!==Number(all[key].mobile_x) ||
       Number(saved.mobile_y)!==Number(all[key].mobile_y)){
      throw new Error('이미지 위치 저장 확인에 실패했습니다.');
    }
  }


  async function loadHomeOverrides(){
    try{
      const rows=await api('cms_settings?select=value&key=eq.home_overrides&limit=1');
      return rows?.[0]?.value||{};
    }catch(e){return {}}
  }



  const DOCTOR_OVERRIDE_KEY='#doctor .doctor-photo';

  function doctorOverrideKey(el,selector=''){
    if(el?.classList?.contains('doctor-photo'))return DOCTOR_OVERRIDE_KEY;
    return selector||'';
  }

  function latestLegacyDoctorOverride(overrides){
    const keys=Object.keys(overrides||{}).filter(k=>/doctor-photo/.test(k));
    for(let i=keys.length-1;i>=0;i--){
      const row=overrides[keys[i]];
      if(row)return row;
    }
    return {};
  }

  async function saveAllHomeOverrides(overrides){
    const updated=await api('cms_settings?key=eq.home_overrides',{
      method:'PATCH',
      headers:{Prefer:'return=minimal'},
      body:JSON.stringify({value:overrides})
    });

    const verify=await loadHomeOverrides();
    return verify;
  }

  async function saveCanonicalDoctorOverride(transform,src='',alt=''){
    const overrides=await loadHomeOverrides();
    const canonical=overrides[DOCTOR_OVERRIDE_KEY]||{};
    const legacy=latestLegacyDoctorOverride(overrides)||{};
    const current={...legacy,...canonical};
    const normalized=normalizeDoctorEditorTransform(transform);

    // Delete every stale doctor selector so only one source of truth remains.
    Object.keys(overrides).forEach(key=>{
      if(/doctor-photo/.test(key) && key!==DOCTOR_OVERRIDE_KEY){
        delete overrides[key];
      }
    });

    overrides[DOCTOR_OVERRIDE_KEY]={
      ...current,
      kind:'image',
      src:src || current.src || '',
      alt:alt || current.alt || '제세현한의원 대표원장',
      doctor_transform:normalized
    };

    const verify=await saveAllHomeOverrides(overrides);
    const saved=verify?.[DOCTOR_OVERRIDE_KEY]?.doctor_transform;

    if(!saved){
      throw new Error('의료진 위치값 저장 확인 실패');
    }

    return normalizeDoctorEditorTransform(saved);
  }

  async function loadDoctorTransformOverride(selector){
    const overrides=await loadHomeOverrides();

    const canonical=overrides[DOCTOR_OVERRIDE_KEY];
    if(canonical?.doctor_transform){
      return canonical.doctor_transform;
    }

    // One-time compatibility with previous versions.
    const keys=Object.keys(overrides).filter(k=>/doctor-photo/.test(k));
    for(let i=keys.length-1;i>=0;i--){
      const row=overrides[keys[i]];
      if(row?.doctor_transform)return row.doctor_transform;
    }

    return {
      desktop_offset_x:0,
      desktop_offset_y:0,
      mobile_offset_x:0,
      mobile_offset_y:0,
      desktop_zoom:102,
      mobile_zoom:102
    };
  }

  async function saveDoctorTransformOverride(selector,transform){
    const doctor=document.querySelector('#doctor .doctor-photo');
    const img=doctor?.querySelector('img');
    return saveCanonicalDoctorOverride(
      transform,
      img?.getAttribute('src')||'',
      img?.getAttribute('alt')||'제세현한의원 대표원장'
    );
  }

  async function saveHomeOverride(selector,data){
    const all=await loadHomeOverrides();
    all[selector]=data;

    // home_overrides already exists on this site in normal operation.
    // Updating it directly avoids PostgREST upsert/constraint failures.
    const updated=await api('cms_settings?key=eq.home_overrides',{
      method:'PATCH',
      headers:{Prefer:'return=representation'},
      body:JSON.stringify({value:all})
    });

    if(!updated?.length){
      await api('cms_settings',{
        method:'POST',
        headers:{Prefer:'return=representation'},
        body:JSON.stringify({key:'home_overrides',value:all})
      });
    }

    // Verify the exact value was persisted before reporting success.
    const verify=await loadHomeOverrides();
    if(!verify?.[selector]){
      throw new Error('home_overrides 저장 확인 실패');
    }
    return verify[selector];
  }

  async function removeHomeOverride(selector){
    const all=await loadHomeOverrides();
    delete all[selector];
    await api('cms_settings?on_conflict=key',{
      method:'POST',
      headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({key:'home_overrides',value:all})
    });
  }

  function computedBackgroundUrl(el){
    const bg=getComputedStyle(el).backgroundImage||'';
    const matches=[...bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
    return matches.length ? matches[matches.length-1][1] : '';
  }

  async function openGenericElementEditor(el){
    let selector=el.dataset.jshSelector||stableSelector(el);
    if(el.classList?.contains('doctor-photo'))selector=DOCTOR_OVERRIDE_KEY;
    const kind=el.dataset.jshKind||'text';
    currentEdit={type:'generic',selector,el};

    if(kind==='image' || kind==='background'){
      const current=kind==='image' ? (el.getAttribute('src')||'') : computedBackgroundUrl(el);
      const alt=kind==='image' ? (el.getAttribute('alt')||'') : '';
      const overrides=await loadHomeOverrides();
      const existing=el.classList?.contains('doctor-photo')
        ? (overrides[DOCTOR_OVERRIDE_KEY]||latestLegacyDoctorOverride(overrides)||{})
        : (overrides[selector]||{});
      const fixedKey=homePositionKeyForElement(el);
      const fixedPositions=fixedKey ? await loadHomeImagePositions() : {};
      const fixed=fixedKey ? (fixedPositions[fixedKey]||{}) : {};

      const dx=Number.isFinite(Number(fixed.desktop_x))?Number(fixed.desktop_x):
        (Number.isFinite(Number(existing.desktop_x))?Number(existing.desktop_x):50);
      const dy=Number.isFinite(Number(fixed.desktop_y))?Number(fixed.desktop_y):
        (Number.isFinite(Number(existing.desktop_y))?Number(existing.desktop_y):50);
      const mx=Number.isFinite(Number(fixed.mobile_x))?Number(fixed.mobile_x):
        (Number.isFinite(Number(existing.mobile_x))?Number(existing.mobile_x):dx);
      const my=Number.isFinite(Number(fixed.mobile_y))?Number(fixed.mobile_y):
        (Number.isFinite(Number(existing.mobile_y))?Number(existing.mobile_y):dy);

      const isHero=!!el.closest('#hero') || el.classList.contains('hero-bg');
      const isDoctor=el.classList.contains('doctor-photo');

      if(isDoctor){
        const doctorImg=el.querySelector('img');
        const currentDoctorSrc=doctorImg?.getAttribute('src')||existing.src||'';
        const saved=await getDedicatedDoctorPosition();

        openModal('의료진 사진 위치',`
          <div class="jsh-editor-grid">
            <div class="jsh-editor-field wide">
              <div class="jsh-drag-help">
                <strong>의료진 사진 위치는 별도 설정으로 저장됩니다.</strong>
                <span>과거 home_overrides 위치값은 더 이상 사용하지 않습니다. PC와 모바일을 각각 저장합니다.</span>
              </div>
            </div>

            <div class="jsh-editor-field wide">
              <label>PC 위치</label>
              <div class="jsh-doctor-transform-grid">
                <div>
                  <span>좌우</span>
                  <input id="jshDoctorX" type="number" min="-30" max="30" step="0.5" value="${saved.desktop.x}">
                  <small>%</small>
                </div>
                <div>
                  <span>상하</span>
                  <input id="jshDoctorY" type="number" min="-30" max="30" step="0.5" value="${saved.desktop.y}">
                  <small>%</small>
                </div>
                <div>
                  <span>확대</span>
                  <input id="jshDoctorZoom" type="number" min="100" max="220" step="1" value="${saved.desktop.zoom}">
                  <small>%</small>
                </div>
              </div>
            </div>

            <div class="jsh-editor-field wide">
              <label>모바일 위치</label>
              <div class="jsh-doctor-transform-grid">
                <div>
                  <span>좌우</span>
                  <input id="jshDoctorMobileX" type="number" min="-30" max="30" step="0.5" value="${saved.mobile.x}">
                  <small>%</small>
                </div>
                <div>
                  <span>상하</span>
                  <input id="jshDoctorMobileY" type="number" min="-30" max="30" step="0.5" value="${saved.mobile.y}">
                  <small>%</small>
                </div>
                <div>
                  <span>확대</span>
                  <input id="jshDoctorMobileZoom" type="number" min="100" max="220" step="1" value="${saved.mobile.zoom}">
                  <small>%</small>
                </div>
              </div>
            </div>

            <div class="jsh-editor-field wide">
              <div class="jsh-position-presets">
                <button type="button" id="jshDoctorCenter">가운데 초기화</button>
                <button type="button" id="jshDoctorUp">조금 위로</button>
                <button type="button" id="jshDoctorUpMore">더 위로</button>
              </div>
            </div>
          </div>
        `,async()=>{
          const next={
            desktop:{
              x:document.getElementById('jshDoctorX').value,
              y:document.getElementById('jshDoctorY').value,
              zoom:document.getElementById('jshDoctorZoom').value
            },
            mobile:{
              x:document.getElementById('jshDoctorMobileX').value,
              y:document.getElementById('jshDoctorMobileY').value,
              zoom:document.getElementById('jshDoctorMobileZoom').value
            }
          };

          const verified=await saveDedicatedDoctorPosition(next);
          applyDedicatedDoctorPositionPreview(el,verified);

          closeModal();
          toast('의료진 사진 위치를 저장했습니다.');
          setTimeout(()=>location.reload(),400);
        });

        const readForm=()=>({
          desktop:{
            x:document.getElementById('jshDoctorX')?.value,
            y:document.getElementById('jshDoctorY')?.value,
            zoom:document.getElementById('jshDoctorZoom')?.value
          },
          mobile:{
            x:document.getElementById('jshDoctorMobileX')?.value,
            y:document.getElementById('jshDoctorMobileY')?.value,
            zoom:document.getElementById('jshDoctorMobileZoom')?.value
          }
        });

        const preview=()=>{
          const normalized=normalizeDedicatedDoctorPosition(readForm());

          document.getElementById('jshDoctorZoom').value=normalized.desktop.zoom;
          document.getElementById('jshDoctorMobileZoom').value=normalized.mobile.zoom;

          applyDedicatedDoctorPositionPreview(el,normalized);
        };

        [
          'jshDoctorX','jshDoctorY','jshDoctorZoom',
          'jshDoctorMobileX','jshDoctorMobileY','jshDoctorMobileZoom'
        ].forEach(id=>{
          const input=document.getElementById(id);
          if(input)input.oninput=preview;
        });

        document.getElementById('jshDoctorCenter').onclick=()=>{
          document.getElementById('jshDoctorX').value=0;
          document.getElementById('jshDoctorY').value=0;
          document.getElementById('jshDoctorZoom').value=100;
          document.getElementById('jshDoctorMobileX').value=0;
          document.getElementById('jshDoctorMobileY').value=0;
          document.getElementById('jshDoctorMobileZoom').value=100;
          preview();
        };

        document.getElementById('jshDoctorUp').onclick=()=>{
          document.getElementById('jshDoctorY').value=-8;
          preview();
        };

        document.getElementById('jshDoctorUpMore').onclick=()=>{
          document.getElementById('jshDoctorY').value=-15;
          preview();
        };

        return;
      }

      openModal(isHero?'대문 이미지 / 위치 수정':'이미지 / 위치 수정',`
        <div class="jsh-editor-grid">
          <div class="jsh-editor-field wide">
            <label>이미지 URL</label>
            <input id="jshGenericImageUrl" value="${esc(existing.src||current)}">
          </div>

          ${kind==='image'?`
          <div class="jsh-editor-field wide">
            <label>대체 텍스트</label>
            <input id="jshGenericImageAlt" value="${esc(existing.alt||alt)}">
          </div>`:''}

          <div class="jsh-editor-field wide">
            <label>새 이미지 업로드 ${isHero?'(대문은 1920×1080 / 약 1.5MB 이하로 자동 최적화)':'(큰 이미지는 자동 최적화)'}</label>
            <input id="jshGenericImageFile" type="file" accept="image/*">
            <div id="jshImageOptimizeInfo" style="margin-top:7px;font-size:10px;color:#748177"></div>
          </div>

          <div class="jsh-editor-field wide">
            <label>PC 이미지 위치 · 숫자 입력 또는 화살표로 미세조정</label>
            <div class="jsh-position-grid">
              <div>
                <span>좌↔우 <b id="jshDxLabel">${dx}%</b></span>
                <input id="jshDesktopX" type="range" min="-100" max="200" step="0.1" value="${dx}">
                <div class="jsh-position-number-row">
                  <button type="button" class="jsh-generic-nudge" data-target="jshDesktopX" data-delta="-1" title="왼쪽">←</button>
                  <input id="jshDesktopXNum" type="number" min="-100" max="200" step="0.1" value="${dx}">
                  <span>%</span>
                  <button type="button" class="jsh-generic-nudge" data-target="jshDesktopX" data-delta="1" title="오른쪽">→</button>
                </div>
              </div>
              <div>
                <span>상↕하 <b id="jshDyLabel">${dy}%</b></span>
                <input id="jshDesktopY" type="range" min="-100" max="200" step="0.1" value="${dy}">
                <div class="jsh-position-number-row">
                  <button type="button" class="jsh-generic-nudge" data-target="jshDesktopY" data-delta="-1" title="위쪽">↑</button>
                  <input id="jshDesktopYNum" type="number" min="-100" max="200" step="0.1" value="${dy}">
                  <span>%</span>
                  <button type="button" class="jsh-generic-nudge" data-target="jshDesktopY" data-delta="1" title="아래쪽">↓</button>
                </div>
              </div>
            </div>
          </div>

          <div class="jsh-editor-field wide">
            <label>모바일 이미지 위치 · PC와 별도 저장</label>
            <div class="jsh-position-grid">
              <div>
                <span>좌↔우 <b id="jshMxLabel">${mx}%</b></span>
                <input id="jshMobileX" type="range" min="-100" max="200" step="0.1" value="${mx}">
                <div class="jsh-position-number-row">
                  <button type="button" class="jsh-generic-nudge" data-target="jshMobileX" data-delta="-1" title="왼쪽">←</button>
                  <input id="jshMobileXNum" type="number" min="-100" max="200" step="0.1" value="${mx}">
                  <span>%</span>
                  <button type="button" class="jsh-generic-nudge" data-target="jshMobileX" data-delta="1" title="오른쪽">→</button>
                </div>
              </div>
              <div>
                <span>상↕하 <b id="jshMyLabel">${my}%</b></span>
                <input id="jshMobileY" type="range" min="-100" max="200" step="0.1" value="${my}">
                <div class="jsh-position-number-row">
                  <button type="button" class="jsh-generic-nudge" data-target="jshMobileY" data-delta="-1" title="위쪽">↑</button>
                  <input id="jshMobileYNum" type="number" min="-100" max="200" step="0.1" value="${my}">
                  <span>%</span>
                  <button type="button" class="jsh-generic-nudge" data-target="jshMobileY" data-delta="1" title="아래쪽">↓</button>
                </div>
              </div>
            </div>
            <div class="jsh-position-presets">
              <button type="button" data-pos="50,50">가운데</button>
              <button type="button" data-pos="50,25">위쪽</button>
              <button type="button" data-pos="50,-20">더 위쪽(-20)</button>
              <button type="button" data-pos="50,75">아래쪽</button>
              <button type="button" data-pos="25,50">왼쪽</button>
              <button type="button" data-pos="75,50">오른쪽</button>
            </div>
          </div>

          <div class="jsh-editor-field wide">
            <div class="jsh-drag-help">
              <strong>페이지에서 직접 움직이기</strong>
              <span>편집 모드에서 의료진 사진 또는 주요진료 카드 사진을 마우스로 잡고 드래그하면 현재 화면(PC/모바일)의 위치가 바로 저장됩니다. 좌표는 -100%부터 200%까지 입력할 수 있어 0%보다 더 위/왼쪽으로도 미세조정할 수 있습니다.</span>
            </div>
          </div>

          <div class="jsh-editor-field wide">
            <div class="jsh-mobile-preview">
              <div class="jsh-mobile-phone">
                <div id="jshPositionPreview" class="jsh-position-preview"></div>
              </div>
              <div class="jsh-preview-note">모바일 미리보기 · 슬라이더를 움직이면 위치가 바로 바뀝니다.</div>
            </div>
          </div>

          <div class="jsh-editor-field wide">
            <button type="button" id="jshResetOverride" style="height:40px;border:1px solid #d8e1da;background:#fff;border-radius:8px">이 요소 사용자 수정값 초기화</button>
          </div>
        </div>`,async()=>{
          let url=document.getElementById('jshGenericImageUrl').value.trim();
          const file=document.getElementById('jshGenericImageFile').files?.[0];

          if(file){
            const optimized=await optimizeImage(file,isHero);
            url=await uploadGenericImageBlob(optimized.blob,optimized.filename);
          }
          if(!url){toast('이미지 URL 또는 파일을 선택해주세요.');return}

          const data={
            kind:'image',
            src:url,
            alt:kind==='image' ? document.getElementById('jshGenericImageAlt').value.trim() : '',
            desktop_x:Number(document.getElementById('jshDesktopX').value),
            desktop_y:Number(document.getElementById('jshDesktopY').value),
            mobile_x:Number(document.getElementById('jshMobileX').value),
            mobile_y:Number(document.getElementById('jshMobileY').value)
          };

          await saveHomeOverride(selector,data);

          const fixedKey=homePositionKeyForElement(el);
          if(fixedKey){
            await saveFixedHomeImagePosition(fixedKey,data);
          }

          applyImageOverrideToElement(el,data,kind);

          // Doctor wrapper contains the actual IMG; update it immediately too.
          if(el.classList?.contains('doctor-photo')){
            const img=el.querySelector('img');
            if(img){
              const useMobile=window.matchMedia('(max-width:700px)').matches;
              const x=useMobile?data.mobile_x:data.desktop_x;
              const y=useMobile?data.mobile_y:data.desktop_y;
              img.style.setProperty('object-position',x+'% '+y+'%','important');
            }
          }

          closeModal();
          toast('이미지와 PC/모바일 위치를 저장했습니다.');
          if(fixedKey)setTimeout(()=>location.reload(),350);
        });

      bindImagePositionPreview(el,kind,existing.src||current);

      const fileInput=document.getElementById('jshGenericImageFile');
      if(fileInput){
        fileInput.onchange=async()=>{
          const f=fileInput.files?.[0];
          if(!f)return;
          const info=document.getElementById('jshImageOptimizeInfo');
          const before=(f.size/1024/1024).toFixed(2);
          if(info)info.textContent=`원본 ${before}MB · 저장할 때 자동 최적화됩니다.`;
          const previewUrl=URL.createObjectURL(f);
          const pv=document.getElementById('jshPositionPreview');
          if(pv){
            pv.style.backgroundImage=`url("${previewUrl}")`;
          }
        };
      }

      document.getElementById('jshResetOverride').onclick=async()=>{
        await removeHomeOverride(selector);
        toast('사용자 수정값을 초기화했습니다. 새로고침합니다.');
        setTimeout(()=>location.reload(),450);
      };
      return;
    }

    if(kind==='link'){
      const text=el.textContent.trim();
      const href=el.getAttribute('href')||'';

      openModal('링크/버튼 수정',`
        <div class="jsh-editor-grid">
          <div class="jsh-editor-field wide">
            <label>표시 문구</label>
            <input id="jshGenericText" value="${esc(text)}">
          </div>
          <div class="jsh-editor-field wide">
            <label>연결 주소</label>
            <input id="jshGenericHref" value="${esc(href)}">
          </div>
          <div class="jsh-editor-field wide">
            <button type="button" id="jshResetOverride" style="height:40px;border:1px solid #d8e1da;background:#fff;border-radius:8px">이 요소 사용자 수정값 초기화</button>
          </div>
        </div>`,async()=>{
          const nextText=document.getElementById('jshGenericText').value;
          const nextHref=document.getElementById('jshGenericHref').value.trim();
          await saveHomeOverride(selector,{kind:'link',text:nextText,href:nextHref});
          el.textContent=nextText;
          el.setAttribute('href',nextHref);
          closeModal();
          toast('링크를 저장했습니다.');
        });

      document.getElementById('jshResetOverride').onclick=async()=>{
        await removeHomeOverride(selector);
        toast('사용자 수정값을 초기화했습니다. 새로고침합니다.');
        setTimeout(()=>location.reload(),450);
      };
      return;
    }

    const value=el.textContent.trim();
    openModal('문구 수정',`
      <div class="jsh-editor-field wide">
        <label>표시 문구</label>
        <textarea id="jshGenericText" style="min-height:180px">${esc(value)}</textarea>
      </div>
      <div class="jsh-editor-field wide" style="margin-top:12px">
        <button type="button" id="jshResetOverride" style="height:40px;border:1px solid #d8e1da;background:#fff;border-radius:8px">이 요소 사용자 수정값 초기화</button>
      </div>`,async()=>{
        const next=document.getElementById('jshGenericText').value;
        await saveHomeOverride(selector,{kind:'text',value:next});
        el.textContent=next;
        closeModal();
        toast('문구를 저장했습니다.');
      });

    document.getElementById('jshResetOverride').onclick=async()=>{
      await removeHomeOverride(selector);
      toast('사용자 수정값을 초기화했습니다. 새로고침합니다.');
      setTimeout(()=>location.reload(),450);
    };
  }


  function applyImageOverrideToElement(el,data,kind){
    if(kind==='image'){
      if(data.src)el.src=data.src;
      if(typeof data.alt==='string')el.alt=data.alt;
      el.style.objectFit='cover';
    }else if(data.src){
      const gradient=el.classList.contains('hero-bg')
        ? 'linear-gradient(90deg,rgba(8,24,15,.84) 0%,rgba(8,24,15,.58) 44%,rgba(8,24,15,.14) 80%), '
        : '';
      el.style.backgroundImage=gradient+'url("'+String(data.src).replace(/"/g,'%22')+'")';
      el.style.backgroundSize='cover';
    }

    el.dataset.jshPositioned='1';
    el.style.setProperty('--jsh-desktop-position',data.desktop_x+'% '+data.desktop_y+'%');
    el.style.setProperty('--jsh-mobile-position',data.mobile_x+'% '+data.mobile_y+'%');

    const useMobile=window.matchMedia('(max-width:700px)').matches;
    const x=useMobile?data.mobile_x:data.desktop_x;
    const y=useMobile?data.mobile_y:data.desktop_y;
    if(kind==='image'){
      el.style.setProperty('object-position',x+'% '+y+'%','important');
    }else if(el.classList?.contains('doctor-photo')){
      const img=el.querySelector('img');
      if(img){
        img.style.width='100%';
        img.style.height='100%';
        img.style.objectFit='cover';
        img.style.setProperty('object-position',x+'% '+y+'%','important');
        img.style.display='block';
      }
    }else{
      el.style.setProperty('background-position',x+'% '+y+'%','important');
    }
  }

  function bindImagePositionPreview(el,kind,url){
    const preview=document.getElementById('jshPositionPreview');
    if(!preview)return;

    const clamp=v=>Math.max(-100,Math.min(200,Math.round((Number(v)||0)*10)/10));
    const setPreviewImage=(src)=>{
      if(src)preview.style.backgroundImage='url("'+String(src).replace(/"/g,'%22')+'")';
    };
    setPreviewImage(url);

    const configs=[
      {range:'jshDesktopX',num:'jshDesktopXNum',label:'jshDxLabel'},
      {range:'jshDesktopY',num:'jshDesktopYNum',label:'jshDyLabel'},
      {range:'jshMobileX',num:'jshMobileXNum',label:'jshMxLabel'},
      {range:'jshMobileY',num:'jshMobileYNum',label:'jshMyLabel'}
    ];

    const syncOne=(cfg,source)=>{
      const range=document.getElementById(cfg.range);
      const num=document.getElementById(cfg.num);
      const label=document.getElementById(cfg.label);
      if(!range || !num)return;

      const raw=source==='num'?num.value:range.value;
      const next=clamp(raw);
      range.value=next;
      num.value=next;
      if(label)label.textContent=next+'%';

      const mx=document.getElementById('jshMobileX')?.value||50;
      const my=document.getElementById('jshMobileY')?.value||50;
      preview.style.backgroundPosition=mx+'% '+my+'%';
    };

    configs.forEach(cfg=>{
      const range=document.getElementById(cfg.range);
      const num=document.getElementById(cfg.num);
      if(range)range.oninput=()=>syncOne(cfg,'range');
      if(num){
        num.oninput=()=>syncOne(cfg,'num');
        num.onchange=()=>syncOne(cfg,'num');
      }
      syncOne(cfg,'range');
    });

    document.querySelectorAll('.jsh-generic-nudge').forEach(btn=>{
      btn.onclick=()=>{
        const target=btn.dataset.target;
        const delta=Number(btn.dataset.delta)||0;
        const cfg=configs.find(x=>x.range===target);
        if(!cfg)return;
        const range=document.getElementById(cfg.range);
        const num=document.getElementById(cfg.num);
        const next=clamp(Number(range.value)+delta);
        range.value=next;
        num.value=next;
        syncOne(cfg,'range');
      };
    });

    document.querySelectorAll('.jsh-position-presets [data-pos]').forEach(btn=>{
      btn.onclick=()=>{
        const [x,y]=btn.dataset.pos.split(',').map(Number);
        const xRange=document.getElementById('jshMobileX');
        const yRange=document.getElementById('jshMobileY');
        const xNum=document.getElementById('jshMobileXNum');
        const yNum=document.getElementById('jshMobileYNum');
        xRange.value=x;xNum.value=x;
        yRange.value=y;yNum.value=y;
        syncOne(configs[2],'range');
        syncOne(configs[3],'range');
      };
    });
  }


  function clampImagePosition(v){
    return Math.max(-100,Math.min(200,Math.round((Number(v)||0)*10)/10));
  }


  function clampDoctorOffset(v){
    return Math.max(-30,Math.min(30,Math.round((Number(v)||0)*10)/10));
  }

  function clampDoctorZoom(v){
    return Math.max(100,Math.min(220,Math.round((Number(v)||102)*10)/10));
  }

  function safeDoctorZoom(x,y,requested){
    const required=100+(2*Math.max(Math.abs(Number(x)||0),Math.abs(Number(y)||0)))+2;
    return clampDoctorZoom(Math.max(Number(requested)||102,required));
  }

  function normalizeDoctorEditorTransform(data){
    const desktop_offset_x=clampDoctorOffset(data?.desktop_offset_x??0);
    const desktop_offset_y=clampDoctorOffset(data?.desktop_offset_y??0);
    const mobile_offset_x=clampDoctorOffset(data?.mobile_offset_x??0);
    const mobile_offset_y=clampDoctorOffset(data?.mobile_offset_y??0);

    return {
      desktop_offset_x,
      desktop_offset_y,
      mobile_offset_x,
      mobile_offset_y,
      desktop_zoom:safeDoctorZoom(desktop_offset_x,desktop_offset_y,data?.desktop_zoom),
      mobile_zoom:safeDoctorZoom(mobile_offset_x,mobile_offset_y,data?.mobile_zoom)
    };
  }

  function applyDoctorEditorTransform(el,data,useMobile){
    if(!el)return;
    const img=el.querySelector('img');
    if(!img)return;

    const p=normalizeDoctorEditorTransform(data||{});
    const x=useMobile?p.mobile_offset_x:p.desktop_offset_x;
    const y=useMobile?p.mobile_offset_y:p.desktop_offset_y;
    const zoom=useMobile?p.mobile_zoom:p.desktop_zoom;

    el.style.setProperty('position','relative','important');
    el.style.setProperty('overflow','hidden','important');

    img.style.setProperty('position','absolute','important');
    img.style.setProperty('left',`calc(50% + ${x}%)`,'important');
    img.style.setProperty('top',`calc(50% + ${y}%)`,'important');
    img.style.setProperty('width',zoom+'%','important');
    img.style.setProperty('height',zoom+'%','important');
    img.style.setProperty('max-width','none','important');
    img.style.setProperty('object-fit','cover','important');
    img.style.setProperty('object-position','50% 50%','important');
    img.style.setProperty('transform-origin','center center','important');
    img.style.setProperty('transform','translate(-50%,-50%)','important');
  }

  function currentElementPosition(el){
    let raw='50% 50%';

    if(el.tagName==='IMG'){
      raw=getComputedStyle(el).objectPosition||raw;
    }else if(el.classList?.contains('doctor-photo')){
      const img=el.querySelector('img');
      if(img)raw=getComputedStyle(img).objectPosition||raw;
    }else{
      raw=getComputedStyle(el).backgroundPosition||raw;
    }

    const m=raw.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
    return m?[clampImagePosition(m[1]),clampImagePosition(m[2])]:[50,50];
  }

  function applyDirectPosition(el,kind,positions,useMobile){
    const dx=clampImagePosition(positions.desktop_x);
    const dy=clampImagePosition(positions.desktop_y);
    const mx=clampImagePosition(positions.mobile_x);
    const my=clampImagePosition(positions.mobile_y);

    el.dataset.jshPositioned='1';
    el.dataset.jshDesktopX=String(dx);
    el.dataset.jshDesktopY=String(dy);
    el.dataset.jshMobileX=String(mx);
    el.dataset.jshMobileY=String(my);
    el.style.setProperty('--jsh-desktop-position',dx+'% '+dy+'%');
    el.style.setProperty('--jsh-mobile-position',mx+'% '+my+'%');

    const x=useMobile?mx:dx;
    const y=useMobile?my:dy;

    if(kind==='image'){
      el.style.setProperty('object-position',x+'% '+y+'%','important');
    }else if(kind==='doctor-image'){
      const img=el.querySelector('img');
      if(img){
        img.style.width='100%';
        img.style.height='100%';
        img.style.objectFit='cover';
        img.style.setProperty('object-position',x+'% '+y+'%','important');
        img.style.display='block';
      }
    }else{
      el.style.setProperty('background-position',x+'% '+y+'%','important');
    }
  }

  function attachDirectPositionDrags(){
    if(!isHomePage())return;

    document.querySelectorAll('#clinics .clinic-image').forEach(el=>{
      if(el.dataset.jshDragBound)return;
      el.dataset.jshDragBound='1';
      el.dataset.jshDragPosition='1';

      const kind=el.tagName==='IMG'?'image':(el.classList.contains('doctor-photo')?'doctor-image':'background');

      el.addEventListener('pointerdown',async e=>{
        if(!editMode)return;
        if(e.button!==undefined && e.button!==0)return;

        e.preventDefault();
        e.stopPropagation();

        let selector=el.dataset.jshSelector||stableSelector(el);
        if(el.classList?.contains('doctor-photo'))selector=DOCTOR_OVERRIDE_KEY;
        if(!selector)return;

        const rect=el.getBoundingClientRect();
        const useMobile=window.matchMedia('(max-width:700px)').matches;
        const [fallbackX,fallbackY]=currentElementPosition(el);
        const overrides=await loadHomeOverrides();
        const existing=overrides[selector]||{};
        const fixedKey=homePositionKeyForElement(el);
        const fixedPositions=fixedKey ? await loadHomeImagePositions() : {};
        const fixed=fixedKey ? (fixedPositions[fixedKey]||{}) : {};

        if(kind==='doctor-image'){
          const doctorState=await getDedicatedDoctorPosition();
          const startX=e.clientX;
          const startY=e.clientY;
          const origin=useMobile?{...doctorState.mobile}:{...doctorState.desktop};
          let moved=false;

          el.classList.add('jsh-position-dragging');
          try{el.setPointerCapture(e.pointerId)}catch(_){}

          const onDoctorMove=ev=>{
            const dxPx=ev.clientX-startX;
            const dyPx=ev.clientY-startY;
            if(Math.abs(dxPx)>2 || Math.abs(dyPx)>2)moved=true;

            const nextX=Math.max(-30,Math.min(30,origin.x+(dxPx/Math.max(rect.width,1))*100));
            const nextY=Math.max(-30,Math.min(30,origin.y+(dyPx/Math.max(rect.height,1))*100));

            if(useMobile){
              doctorState.mobile.x=nextX;
              doctorState.mobile.y=nextY;
            }else{
              doctorState.desktop.x=nextX;
              doctorState.desktop.y=nextY;
            }

            const normalized=normalizeDedicatedDoctorPosition(doctorState);
            Object.assign(doctorState,normalized);
            applyDedicatedDoctorPositionPreview(el,normalized);
          };

          const finishDoctor=async ev=>{
            el.removeEventListener('pointermove',onDoctorMove);
            el.removeEventListener('pointerup',finishDoctor);
            el.removeEventListener('pointercancel',finishDoctor);
            el.classList.remove('jsh-position-dragging');
            try{el.releasePointerCapture(ev.pointerId)}catch(_){}

            if(!moved)return;
            el._jshDraggedRecently=Date.now();

            try{
              const verified=await saveDedicatedDoctorPosition(doctorState);
              applyDedicatedDoctorPositionPreview(el,verified);
              toast((useMobile?'모바일':'PC')+' 의료진 사진 위치를 저장했습니다.');
              setTimeout(()=>location.reload(),400);
            }catch(err){
              console.error(err);
              toast('의료진 사진 위치 저장 실패: '+(err?.message||'알 수 없는 오류'));
            }
          };

          el.addEventListener('pointermove',onDoctorMove);
          el.addEventListener('pointerup',finishDoctor);
          el.addEventListener('pointercancel',finishDoctor);
          return;
        }

        const positions={
          desktop_x:Number.isFinite(Number(fixed.desktop_x))?Number(fixed.desktop_x):
            (Number.isFinite(Number(existing.desktop_x))?Number(existing.desktop_x):
              (Number.isFinite(Number(el.dataset.jshDesktopX))?Number(el.dataset.jshDesktopX):fallbackX)),
          desktop_y:Number.isFinite(Number(fixed.desktop_y))?Number(fixed.desktop_y):
            (Number.isFinite(Number(existing.desktop_y))?Number(existing.desktop_y):
              (Number.isFinite(Number(el.dataset.jshDesktopY))?Number(el.dataset.jshDesktopY):fallbackY)),
          mobile_x:Number.isFinite(Number(fixed.mobile_x))?Number(fixed.mobile_x):
            (Number.isFinite(Number(existing.mobile_x))?Number(existing.mobile_x):
              (Number.isFinite(Number(el.dataset.jshMobileX))?Number(el.dataset.jshMobileX):fallbackX)),
          mobile_y:Number.isFinite(Number(fixed.mobile_y))?Number(fixed.mobile_y):
            (Number.isFinite(Number(existing.mobile_y))?Number(existing.mobile_y):
              (Number.isFinite(Number(el.dataset.jshMobileY))?Number(el.dataset.jshMobileY):fallbackY))
        };

        const startX=e.clientX;
        const startY=e.clientY;
        const originX=useMobile?positions.mobile_x:positions.desktop_x;
        const originY=useMobile?positions.mobile_y:positions.desktop_y;
        let moved=false;

        el.classList.add('jsh-position-dragging');
        try{el.setPointerCapture(e.pointerId)}catch(_){}

        const onMove=ev=>{
          const dxPx=ev.clientX-startX;
          const dyPx=ev.clientY-startY;
          if(Math.abs(dxPx)>2 || Math.abs(dyPx)>2)moved=true;

          // background-position works inversely to dragging the image itself:
          // drag photo right/down => decrease focal position.
          const nextX=clampImagePosition(originX-(dxPx/Math.max(rect.width,1))*100);
          const nextY=clampImagePosition(originY-(dyPx/Math.max(rect.height,1))*100);

          if(useMobile){
            positions.mobile_x=nextX;
            positions.mobile_y=nextY;
          }else{
            positions.desktop_x=nextX;
            positions.desktop_y=nextY;
          }
          applyDirectPosition(el,kind,positions,useMobile);
        };

        const finish=async ev=>{
          el.removeEventListener('pointermove',onMove);
          el.removeEventListener('pointerup',finish);
          el.removeEventListener('pointercancel',finish);
          el.classList.remove('jsh-position-dragging');
          try{el.releasePointerCapture(ev.pointerId)}catch(_){}

          if(!moved)return;

          el._jshDraggedRecently=Date.now();

          const currentSrc=kind==='image'
            ? (el.getAttribute('src')||'')
            : (kind==='doctor-image'
                ? (el.querySelector('img')?.getAttribute('src')||'')
                : computedBackgroundUrl(el));

          const data={
            ...existing,
            kind:'image',
            src:existing.src||currentSrc,
            alt:kind==='image'?(existing.alt||el.getAttribute('alt')||''):(kind==='doctor-image'?(existing.alt||el.querySelector('img')?.getAttribute('alt')||''):'') ,
            desktop_x:clampImagePosition(positions.desktop_x),
            desktop_y:clampImagePosition(positions.desktop_y),
            mobile_x:clampImagePosition(positions.mobile_x),
            mobile_y:clampImagePosition(positions.mobile_y)
          };

          try{
            const fixedKey=homePositionKeyForElement(el);

            if(fixedKey){
              await saveFixedHomeImagePosition(fixedKey,data);
            }else{
              await saveHomeOverride(selector,data);
            }

            toast((useMobile?'모바일':'PC')+' 이미지 위치를 저장했습니다.');

            // Reload after persistence so the visitor view and editor view are identical.
            setTimeout(()=>location.reload(),300);
          }catch(err){
            console.error(err);
            toast('이미지 위치 저장에 실패했습니다: '+err.message);
          }
        };

        el.addEventListener('pointermove',onMove);
        el.addEventListener('pointerup',finish);
        el.addEventListener('pointercancel',finish);
      });

      // Prevent clinic-card link / normal editor click immediately after a drag.
      el.addEventListener('click',e=>{
        if(el._jshDraggedRecently && Date.now()-el._jshDraggedRecently<500){
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },true);
    });
  }

  async function optimizeImage(file,isHero=false){
    if(!file.type.startsWith('image/'))throw new Error('이미지 파일만 업로드할 수 있습니다.');

    const targetW=isHero?1920:1800;
    const targetH=isHero?1080:1800;
    const targetBytes=isHero?1.5*1024*1024:2*1024*1024;

    const bitmap=await createImageBitmap(file);
    const scale=Math.min(1,targetW/bitmap.width,targetH/bitmap.height);
    const width=Math.max(1,Math.round(bitmap.width*scale));
    const height=Math.max(1,Math.round(bitmap.height*scale));

    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,width,height);
    ctx.drawImage(bitmap,0,0,width,height);
    bitmap.close?.();

    let quality=.84;
    let blob=await new Promise(res=>canvas.toBlob(res,'image/webp',quality));
    while(blob && blob.size>targetBytes && quality>.54){
      quality-=.08;
      blob=await new Promise(res=>canvas.toBlob(res,'image/webp',quality));
    }

    if(!blob)throw new Error('이미지 최적화에 실패했습니다.');

    const stem=(file.name||'image').replace(/\.[^.]+$/,'').replace(/[^\w가-힣-]+/g,'-').slice(0,50)||'image';
    return {
      blob,
      filename:stem+'.webp',
      width,
      height,
      originalBytes:file.size,
      optimizedBytes:blob.size
    };
  }

  async function uploadGenericImageBlob(blob,filename='image.webp'){
    const ext=(filename.split('.').pop()||'webp').toLowerCase();
    const path='page-editor/'+new Date().toISOString().slice(0,7)+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;

    const r=await fetch(BASE+'/storage/v1/object/site-media/'+path,{
      method:'POST',
      headers:authHeaders({
        'Content-Type':blob.type||'image/webp',
        'x-upsert':'false'
      }),
      body:blob
    });
    if(!r.ok)throw new Error(await r.text());
    return BASE+'/storage/v1/object/public/site-media/'+path;
  }

  async function uploadGenericImage(file){
    const optimized=await optimizeImage(file,false);
    return uploadGenericImageBlob(optimized.blob,optimized.filename);
  }

  function markHomeFields(){
    if(!location.pathname.endsWith('/') && !location.pathname.endsWith('index.html'))return;
    for(const [selector,meta] of Object.entries(HOME_FIELDS)){
      const el=document.querySelector(selector);
      if(!el)continue;
      el.dataset.jshEditable='home-copy';
      el.dataset.jshKey=meta.key;
      el.dataset.jshLabel=meta.label;
      el.dataset.jshType=meta.type;
      if(!el.dataset.jshBound){
        el.dataset.jshBound='1';
        el.addEventListener('click',e=>{
          if(!editMode)return;
          e.preventDefault();
          e.stopPropagation();
          openHomeCopyEditor(el);
        });
      }
    }
  }

  async function openHomeCopyEditor(el){
    const key=el.dataset.jshKey;
    const label=el.dataset.jshLabel||'문구 수정';
    const type=el.dataset.jshType||'text';
    const rows=await api('cms_settings?select=value&key=eq.home_copy&limit=1');
    const copy=rows?.[0]?.value||{};
    const value=copy[key] ?? el.textContent.trim();

    const field=type==='textarea'
      ? `<textarea id="jshCopyValue" style="min-height:180px">${esc(value)}</textarea>`
      : `<input id="jshCopyValue" value="${esc(value)}">`;

    openModal(label,`
      <div class="jsh-editor-field wide">
        <label>${esc(label)}</label>
        ${field}
      </div>`,async()=>{
        const next=document.getElementById('jshCopyValue').value.trim();
        copy[key]=next;
        await api('cms_settings?on_conflict=key',{
          method:'POST',
          headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
          body:JSON.stringify({key:'home_copy',value:copy})
        });
        el.textContent=next;
        closeModal();
        toast('메인 문구를 저장했습니다.');
      });
  }

  function attachPostButtons(){
    document.querySelectorAll('[data-post-id]').forEach(el=>{
      if(el.querySelector(':scope > .jsh-post-edit-btn'))return;
      const id=el.dataset.postId;
      if(!id)return;
      const b=document.createElement('button');
      b.type='button';
      b.className='jsh-post-edit-btn';
      b.textContent='수정';
      b.onclick=e=>{
        e.preventDefault();e.stopPropagation();
        openPostEditor(id);
      };
      el.appendChild(b);
    });
  }

  function richToolbar(){
    return `
      <div class="jsh-rich-toolbar">
        <select id="jshBlock">
          <option value="">문단</option><option value="p">본문</option>
          <option value="h2">큰 제목</option><option value="h3">작은 제목</option>
          <option value="blockquote">인용문</option>
        </select>
        <button type="button" data-cmd="bold"><b>B</b></button>
        <button type="button" data-cmd="italic"><i>I</i></button>
        <button type="button" data-cmd="underline"><u>U</u></button>
        <button type="button" data-cmd="insertUnorderedList">• 목록</button>
        <button type="button" data-cmd="justifyLeft">왼쪽</button>
        <button type="button" data-cmd="justifyCenter">가운데</button>
      </div>`;
  }

  function bindToolbar(){
    document.querySelectorAll('.jsh-rich-toolbar [data-cmd]').forEach(b=>{
      b.onclick=()=>{
        document.getElementById('jshBodyEditor')?.focus();
        document.execCommand(b.dataset.cmd,false,null);
      };
    });
    const block=document.getElementById('jshBlock');
    if(block)block.onchange=()=>{
      if(!block.value)return;
      document.getElementById('jshBodyEditor')?.focus();
      document.execCommand('formatBlock',false,block.value);
      block.value='';
    };
  }

  async function openPostEditor(id){
    const pages=await loadPages();
    let post={
      id:null,page_id:'',title:'',summary:'',category:'',
      image_url:'',content_html:'<p></p>',is_active:true,is_pinned:false,source_type:'manual'
    };
    if(id){
      const rows=await api('cms_posts?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1');
      if(!rows?.length){toast('게시글을 찾을 수 없습니다.');return}
      post=rows[0];
    }else{
      const slug=new URLSearchParams(location.search).get('slug');
      if(slug){
        const page=pages.find(p=>p.slug===slug);
        if(page)post.page_id=page.id;
      }
    }

    currentEdit={type:'post',id:post.id};

    openModal(id?'게시글 수정':'새 게시글 작성',`
      <div class="jsh-editor-grid">
        <div class="jsh-editor-field">
          <label>게시판</label>
          <select id="jshPostPage">
            <option value="">게시판 선택</option>
            ${pages.filter(p=>p.is_visible).map(p=>`<option value="${p.id}" ${p.id===post.page_id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="jsh-editor-field">
          <label>분류</label>
          <input id="jshPostCategory" value="${esc(post.category||'')}" placeholder="예: 담적·소화기">
        </div>
        <div class="jsh-editor-field wide">
          <label>제목</label>
          <input id="jshPostTitle" value="${esc(post.title||'')}">
        </div>
        <div class="jsh-editor-field wide">
          <label>목록 요약</label>
          <textarea id="jshPostSummary">${esc(post.summary||'')}</textarea>
        </div>
        <div class="jsh-editor-field wide">
          <label>대표이미지 URL</label>
          <input id="jshPostImage" value="${esc(post.image_url||'')}">
        </div>
        <div class="jsh-editor-field">
          <label>공개 여부</label>
          <select id="jshPostActive">
            <option value="true" ${post.is_active!==false?'selected':''}>공개</option>
            <option value="false" ${post.is_active===false?'selected':''}>숨김</option>
          </select>
        </div>
        <div class="jsh-editor-field">
          <label>대표글</label>
          <select id="jshPostPinned">
            <option value="false" ${!post.is_pinned?'selected':''}>일반글</option>
            <option value="true" ${post.is_pinned?'selected':''}>대표글</option>
          </select>
        </div>
        <div class="jsh-editor-field wide">
          <label>본문</label>
          ${richToolbar()}
          <div id="jshBodyEditor" contenteditable="true">${post.content_html||'<p></p>'}</div>
        </div>
      </div>`,async()=>{
        const payload={
          page_id:document.getElementById('jshPostPage').value,
          category:document.getElementById('jshPostCategory').value.trim(),
          title:document.getElementById('jshPostTitle').value.trim(),
          summary:document.getElementById('jshPostSummary').value.trim(),
          image_url:document.getElementById('jshPostImage').value.trim(),
          content_html:document.getElementById('jshBodyEditor').innerHTML.trim()||'<p></p>',
          is_active:document.getElementById('jshPostActive').value==='true',
          is_pinned:document.getElementById('jshPostPinned').value==='true',
          source_type:post.source_type||'manual'
        };
        if(!payload.page_id||!payload.title){
          toast('게시판과 제목을 입력해주세요.');return;
        }

        if(post.id){
          await api('cms_posts?id=eq.'+encodeURIComponent(post.id),{
            method:'PATCH',
            headers:{Prefer:'return=minimal'},
            body:JSON.stringify(payload)
          });
        }else{
          await api('cms_posts',{
            method:'POST',
            headers:{Prefer:'return=minimal'},
            body:JSON.stringify(payload)
          });
        }

        closeModal();
        toast(post.id?'게시글을 수정했습니다.':'새 게시글을 작성했습니다.');
        setTimeout(()=>location.reload(),550);
      });
    bindToolbar();
  }

  function observeDynamic(){
    const obs=new MutationObserver(()=>{
      markHomeFields();
      markGenericHomeElements();
      attachHeroImageButtons();
      attachPostButtons();
    });
    obs.observe(document.body,{subtree:true,childList:true});
  }

  async function init(){
    if(!await verifyAdmin())return;
    ensureUI();
    markHomeFields();
    markGenericHomeElements();
    attachHeroImageButtons();
    attachPostButtons();
    observeDynamic();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
