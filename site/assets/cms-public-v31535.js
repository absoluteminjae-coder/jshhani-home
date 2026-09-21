
(function(){
  const C=window.JSH_CONFIG||{};
  const base=(C.supabaseUrl||'').replace(/\/$/,'');
  const key=C.supabaseAnonKey||'';

  function esc(s=''){
    return String(s).replace(/[&<>"']/g,m=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[m]));
  }

  async function get(path){
    const r=await fetch(base+'/rest/v1/'+path,{
      method:'GET',
      cache:'no-store',
      headers:{
        apikey:key,
        Authorization:'Bearer '+key,
        'Cache-Control':'no-cache'
      }
    });
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function loadPages(all=false){
    const filter=all?'':'&is_visible=eq.true';
    return get('cms_pages?select=*'+filter+'&order=sort_order.asc,name.asc');
  }

  function pageUrl(slug){
    return '/'+encodeURIComponent(slug)+'/';
  }

  const DETAIL_SEO={
    damjeok:{title:'청주 담적병·기능성소화불량 진료 | 더부룩함·명치 답답함 | 제세현한의원',description:'담적병의 의미, 식후 더부룩함·조기 포만감·명치 통증·트림 등 주요 증상, 기능성소화불량과의 차이, 검사가 먼저 필요한 경우, 제세현한의원의 진료 기준과 근거자료를 안내합니다.'},
    bopye:{title:'청주 쉰목소리·기침·비염 진료 | 보폐고엔오 | 제세현한의원',description:'쉰 목소리, 감기 후 오래가는 기침·가래, 비염·후비루가 반복될 때 확인할 증상과 검사가 필요한 경우, 제세현한의원의 보폐고엔오·호흡기 진료 기준과 근거자료를 안내합니다.'},
    diet:{title:'청주 한방 다이어트 | 제세현한의원',description:'체중과 식습관, 생활패턴을 함께 살펴보는 제세현한의원 한방 다이어트 프로그램 안내입니다.'},
    pain:{title:'청주 통증치료·추나·초음파 진료 | 제세현한의원',description:'허리, 목, 어깨, 무릎 등 근골격계 통증을 평가하고 추나·약침·초음파 진료 등을 안내하는 제세현한의원 통증클리닉입니다.'},
    immunity:{title:'청주 녹용보약·면역관리 | 제세현한의원',description:'피로와 체력 저하 등 현재 상태를 살펴보고 녹용보약과 한약 진료를 안내하는 제세현한의원 진료 페이지입니다.'},
    vascular:{title:'청주 경동맥초음파·혈관관리 | 제세현한의원',description:'경동맥초음파를 포함해 혈관 상태와 대사 건강을 살펴보는 제세현한의원 혈관·대사 진료 안내입니다.'},
    autonomic:{title:'청주 자율신경·화병·갱년기 진료 | 제세현한의원',description:'두근거림, 열감, 불면, 어지럼 등 다양한 증상을 함께 살펴보는 제세현한의원 자율신경 진료 안내입니다.'},
    craniosacral:{title:'청주 두개천골치료 | 제세현한의원',description:'두개천골치료의 진료 과정과 적용 범위를 안내하는 제세현한의원 진료 페이지입니다.'},
    constitution:{title:'청주 맞춤 한약·체질 진료 | 제세현한의원',description:'증상과 생활상태를 함께 살펴 개인별 한약 진료 방향을 안내하는 제세현한의원 체질·한약 진료 페이지입니다.'},
    tonic:{title:'청주 보약·한약 진료 | 제세현한의원',description:'현재 증상과 체력 상태를 살펴 개인별 보약·한약 진료 방향을 안내하는 제세현한의원 진료 페이지입니다.'}
  };


  function rootAssetUrl(url){
    const v=String(url||'');
    if(v.startsWith('assets/')) return '/'+v;
    if(v.startsWith('./assets/')) return '/assets/'+v.slice(9);
    return v;
  }

  function rootHtmlAssetUrls(html){
    let v=String(html||'');

    // src / href / poster
    v=v.replace(
      /\b(src|href|poster)=(["'])(?:\.\/)?assets\//gi,
      (m,attr,q)=>attr+'='+q+'/assets/'
    );

    // srcset may contain one or more local asset candidates.
    v=v.replace(
      /\bsrcset=(["'])([\s\S]*?)\1/gi,
      (m,q,value)=>{
        const fixed=value
          .split(',')
          .map(part=>{
            const bits=part.trim().split(/\s+/);
            if(bits[0]?.startsWith('./assets/')) bits[0]='/assets/'+bits[0].slice(9);
            else if(bits[0]?.startsWith('assets/')) bits[0]='/'+bits[0];
            return bits.join(' ');
          })
          .join(', ');
        return 'srcset='+q+fixed+q;
      }
    );

    // inline style url(assets/...)
    v=v.replace(
      /url\((["']?)(?:\.\/)?assets\//gi,
      (m,q)=>'url('+q+'/assets/'
    );

    return v;
  }

  function detailSlug(){
    const query=new URLSearchParams(location.search).get('slug');
    if(query)return query;
    const path=location.pathname.replace(/\/+$/,'').split('/').filter(Boolean);
    const last=decodeURIComponent(path[path.length-1]||'');
    return DETAIL_SEO[last] ? last : '';
  }

  function upsertMeta(selector,attrs){
    let el=document.head.querySelector(selector);
    if(!el){
      el=document.createElement('meta');
      document.head.appendChild(el);
    }
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
    return el;
  }

  function applyDetailSeo(slug,pageName){
    const seo=DETAIL_SEO[slug]||{};
    const canonical='https://jshhani.com/'+encodeURIComponent(slug)+'/';
    document.title=seo.title || ((pageName||'상세 진료')+' | 제세현한의원');

    let canonicalEl=document.head.querySelector('link[rel="canonical"]');
    if(!canonicalEl){
      canonicalEl=document.createElement('link');
      canonicalEl.rel='canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href=canonical;

    upsertMeta('meta[name="description"]',{name:'description',content:seo.description||''});
    upsertMeta('meta[name="robots"]',{name:'robots',content:'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'});
    upsertMeta('meta[property="og:type"]',{property:'og:type',content:'website'});
    upsertMeta('meta[property="og:site_name"]',{property:'og:site_name',content:'제세현한의원'});
    upsertMeta('meta[property="og:locale"]',{property:'og:locale',content:'ko_KR'});
    upsertMeta('meta[property="og:title"]',{property:'og:title',content:seo.title||document.title});
    upsertMeta('meta[property="og:description"]',{property:'og:description',content:seo.description||''});
    upsertMeta('meta[property="og:url"]',{property:'og:url',content:canonical});

    let ld=document.head.querySelector('#jsh-detail-schema');
    if(!ld){
      ld=document.createElement('script');
      ld.type='application/ld+json';
      ld.id='jsh-detail-schema';
      document.head.appendChild(ld);
    }
    const graph=[
      {
        '@type':'MedicalWebPage',
        '@id':canonical+'#webpage',
        'url':canonical,
        'name':seo.title||document.title,
        'description':seo.description||'',
        'inLanguage':'ko-KR',
        'dateModified':(slug==='damjeok'||slug==='bopye')?'2026-09-16':undefined,
        'author':(slug==='damjeok'||slug==='bopye')?{'@type':'Person','name':'차민재','jobTitle':'한의사','url':'https://jshhani.com/doctor.html','worksFor':{'@id':'https://jshhani.com/#clinic'}}:undefined,
        'about':{'@type':'MedicalClinic','@id':'https://jshhani.com/#clinic'}
      },
      {
        '@type':'BreadcrumbList',
        'itemListElement':[
          {'@type':'ListItem','position':1,'name':'제세현한의원','item':'https://jshhani.com/'},
          {'@type':'ListItem','position':2,'name':pageName||slug,'item':canonical}
        ]
      }
    ];

    if(slug==='damjeok'){
      graph[0].citation=[
        'https://theromefoundation.org/rome-iv/rome-iv-criteria/',
        'https://pubmed.ncbi.nlm.nih.gov/31917913/',
        'https://pubmed.ncbi.nlm.nih.gov/28631728/',
        'https://nikom.or.kr/nckm/module/practiceGuide/view.do?guide_idx=192&menu_idx=14',
        'https://www.cochrane.org/evidence/CD008487_acupuncture-treating-functional-dyspepsia',
        'https://pubmed.ncbi.nlm.nih.gov/34851546/'
      ];
      graph.push({
        '@type':'FAQPage',
        '@id':canonical+'#faq',
        'mainEntity':[
          {'@type':'Question','name':"담적병은 위내시경에서 확인되나요?",'acceptedAnswer':{'@type':'Answer','text':"담적병 자체가 위내시경에서 보이는 현대의학의 표준 진단명은 아닙니다. 위내시경은 위염, 궤양, 종양 등 구조적인 이상을 확인하는 검사이고, 검사에서 큰 이상이 없어도 기능성소화불량 같은 증상은 지속될 수 있습니다."}},
          {'@type':'Question','name':"담적병과 기능성소화불량은 같은 병인가요?",'acceptedAnswer':{'@type':'Answer','text':"같은 진단명은 아닙니다. 담적병은 한의학적 임상 개념이고, 기능성소화불량은 현대의학에서 사용하는 진단 범주입니다. 다만 식후 포만감, 조기 포만감, 명치 통증·작열감 등 증상 영역이 겹칠 수 있습니다."}},
          {'@type':'Question','name':"위내시경이 정상인데 왜 계속 더부룩한가요?",'acceptedAnswer':{'@type':'Answer','text':"구조적인 이상이 없더라도 만성 상부위장관 증상이 지속될 수 있으며, 이런 경우 기능성소화불량 범주에서 평가될 수 있습니다. 증상 기간과 양상, 헬리코박터 검사 이력, 복용 약과 다른 질환을 함께 확인해야 합니다."}},
          {'@type':'Question','name':"담적 치료는 얼마나 걸리나요?",'acceptedAnswer':{'@type':'Answer','text':"정해진 기간은 없습니다. 증상이 얼마나 오래됐는지, 식사·수면·배변 패턴, 동반 질환과 복용 약에 따라 달라지므로 초기 반응을 보면서 치료 계획을 조정합니다."}},
          {'@type':'Question','name':"담적에 피해야 할 음식이 따로 있나요?",'acceptedAnswer':{'@type':'Answer','text':"모든 사람에게 동일한 금지 음식이 있는 것은 아닙니다. 과식·야식·음주·카페인처럼 흔한 유발요인을 확인하고, 실제로 본인 증상을 반복시키는 음식을 찾는 것이 중요합니다."}},
          {'@type':'Question','name':"소화불량과 두통·어지럼이 같이 있으면 담적인가요?",'acceptedAnswer':{'@type':'Answer','text':"두통과 어지럼은 원인이 다양하므로 소화기 증상과 함께 있다고 해서 담적으로 단정할 수 없습니다. 지속되거나 신경학적 증상이 동반되면 해당 원인의 평가가 우선입니다."}},
          {'@type':'Question','name':"헬리코박터 파일로리 검사도 필요한가요?",'acceptedAnswer':{'@type':'Answer','text':"소화불량 진료에서 헬리코박터 파일로리 검사는 중요한 평가 항목 중 하나입니다. 검사 필요성과 치료 여부는 연령, 내시경 이력, 증상과 위험요인을 고려해 결정합니다."}},
          {'@type':'Question','name':"어떤 증상은 한의원보다 검사를 먼저 받아야 하나요?",'acceptedAnswer':{'@type':'Answer','text':"원인 없는 체중 감소, 반복되는 구토, 흑색변·혈변, 진행하는 삼킴곤란, 심한 빈혈이나 쇠약, 심한 통증·황달 등이 있다면 의학적 평가를 먼저 받는 것이 안전합니다."}}
        ]
      });
    }


    if(slug==='bopye'){
      graph[0].citation=[
        'https://pubmed.ncbi.nlm.nih.gov/29494316/',
        'https://pubmed.ncbi.nlm.nih.gov/31515408/',
        'https://pubmed.ncbi.nlm.nih.gov/33979988/',
        'https://pubmed.ncbi.nlm.nih.gov/32707227/',
        'https://nikom.or.kr/nckm/module/practiceGuide/view.do?guide_idx=167'
      ];
      graph.push({
        '@type':'FAQPage',
        '@id':canonical+'#faq',
        'mainEntity':[
          {'@type':'Question','name':'보폐고엔오는 어떤 증상에서 상담하나요?','acceptedAnswer':{'@type':'Answer','text':'쉰 목소리와 목 피로, 감기 뒤 오래 남는 기침·가래, 비염·후비루와 함께 나타나는 목 이물감 등에서 현재 상태와 원인을 먼저 확인한 뒤 복용 여부를 상담합니다.'}},
          {'@type':'Question','name':'쉰 목소리가 얼마나 지속되면 검사를 받아야 하나요?','acceptedAnswer':{'@type':'Answer','text':'쉰 목소리가 4주 이내에 호전되지 않으면 후두내시경을 시행하거나 가능한 의료기관으로 의뢰하도록 권고됩니다. 목의 덩이, 호흡곤란, 흡연력 등 위험요인이 있으면 더 일찍 평가가 필요할 수 있습니다.'}},
          {'@type':'Question','name':'감기는 나았는데 기침이 계속되면 어떻게 하나요?','acceptedAnswer':{'@type':'Answer','text':'기침의 기간과 양상을 확인해야 합니다. 성인에서 8주 이상 지속되면 만성기침으로 평가하며, 상기도기침증후군, 기침형 천식, 위식도역류질환 등 다양한 원인을 고려합니다.'}},
          {'@type':'Question','name':'비염이나 후비루가 기침과 연결될 수 있나요?','acceptedAnswer':{'@type':'Answer','text':'그럴 수 있습니다. 비염·비부비동 증상은 만성기침 평가에서 함께 확인하는 요소이며, 코 증상과 목 이물감·헛기침이 같이 반복되는지 살펴보는 것이 중요합니다.'}},
          {'@type':'Question','name':'성대결절이나 성대폴립이 있으면 보폐고엔오만 복용하면 되나요?','acceptedAnswer':{'@type':'Answer','text':'아닙니다. 이미 성대 병변이 확인됐거나 쉰 목소리가 지속되면 이비인후과 후두 평가와 치료 계획이 우선입니다. 보폐고엔오 복용은 그 결과와 현재 상태를 참고해 보조적으로 상담합니다.'}},
          {'@type':'Question','name':'보폐고엔오는 하루에 몇 번 복용하나요?','acceptedAnswer':{'@type':'Answer','text':'제세현한의원에서는 증상이 두드러지는 시기에는 하루 3–5회, 안정기에는 하루 1회를 기본 안내로 활용하지만 실제 횟수는 진료 후 상태에 따라 조정합니다.'}}
        ]
      });
    }

    ld.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
  }

  async function renderNav(activeSlug=''){
    try{
      const pages=await loadPages(false);
      document.querySelectorAll('[data-dynamic-nav]').forEach(nav=>{
        const links=[
          `<a href="/" class="${!activeSlug?'active':''}">홈</a>`,
          `<a href="/doctor.html" class="${activeSlug==='doctor'?'active':''}">의료진소개</a>`,
          `<a href="/reviews.html">진료후기</a>`,
          `<a href="/shop.html" class="${activeSlug==='shop'?'active':''}">상품</a>`
        ];
        pages.forEach(p=>{
          links.push(`<a href="${pageUrl(p.slug)}" class="${p.slug===activeSlug?'active':''}">${esc(p.name)}</a>`);
        });
        nav.innerHTML=links.join('');
      });
    }catch(e){
      console.error('nav load failed',e);
    }
  }


  async function applyBrandAssets(){
    try{
      const rows=await get('cms_settings?select=value&key=eq.brand_assets&limit=1');
      const brand=rows?.[0]?.value || {};

      // v3.12.3: 로고와 favicon은 승인된 AI 원본을 정적 파일로 사용합니다.
      // 새로고침 시 과거 Supabase 이미지가 덮어쓰는 현상을 막습니다.
      if(brand.site_title){
        document.title=brand.site_title;
      }
    }catch(e){
      console.error('brand assets load failed',e);
    }
  }

  async function applyDesign(){
    try{
      const rows=await get('cms_settings?select=value&key=eq.design&limit=1');
      const font=rows?.[0]?.value?.font || 'editorial';
      const root=document.documentElement;

      const presets={
        classic:{title:"'Nanum Myeongjo',serif",body:"'Noto Sans KR',sans-serif"},
        editorial:{title:"'Nanum Myeongjo',serif",body:"'Noto Sans KR',sans-serif"},
        elegant:{title:"'Gowun Batang','Nanum Myeongjo',serif",body:"'Gowun Dodum','Noto Sans KR',sans-serif"},
        clean:{title:"'Noto Sans KR',sans-serif",body:"'Noto Sans KR',sans-serif"}
      };
      const p=presets[font]||presets.editorial;

      // Main page variables and detail page variables both supported.
      root.style.setProperty('--title',p.title);
      root.style.setProperty('--body',p.body);
      root.style.setProperty('--font-title',p.title);
      root.style.setProperty('--font-body',p.body);
      document.body.dataset.cmsFont=font;
    }catch(e){
      console.error('design load failed',e);
    }
  }

  async function renderHomePosts(){
    const grid=
      document.querySelector('[data-section="health-content"] [data-editable="blog-cards"]') ||
      document.querySelector('#health .post-grid') ||
      document.querySelector('#library .post-grid');

    if(!grid) return;

    try{
      const posts=await get('cms_posts?select=id,title,summary,image_url,source_url,page_id,created_at&is_active=eq.true&is_pinned=eq.false&order=created_at.desc&limit=6');
      if(!posts.length) return;

      const pages=await loadPages(false);
      const pageMap=Object.fromEntries(pages.map(p=>[p.id,p]));

      grid.innerHTML=posts.map(post=>{
        const page=pageMap[post.page_id];
        const link='/article.html?id='+encodeURIComponent(post.id);
        return `
          <a class="post-card" data-post-id="${post.id}" href="${esc(link)}">
            <div class="post-thumb">
              ${post.image_url?`<img src="${esc(rootAssetUrl(post.image_url))}" alt="" style="width:100%;height:100%;object-fit:cover">`:'블로그 대표 이미지'}
            </div>
            <h3>${esc(post.title||'')}</h3>
            <p>${esc(post.summary||'')}</p>
            <div class="post-category">${esc(page?.name||'건강정보')}</div>
          </a>`;
      }).join('');
    }catch(e){
      console.error('home posts load failed',e);
    }
  }

  async function renderPopups(){
    try{
      const rows=await get('cms_popups?select=*&is_active=eq.true&order=sort_order.asc,created_at.desc');
      if(!rows.length)return;

      const pop=rows[0];
      const wrap=document.createElement('div');
      wrap.id='cmsPopup';
      wrap.innerHTML=`
        <div class="cms-popup-backdrop"></div>
        <div class="cms-popup-card">
          <button type="button" class="cms-popup-close" aria-label="닫기">×</button>
          ${pop.image_url?(
            pop.link_url
              ? `<a class="cms-popup-image-link" href="${esc(pop.link_url)}"><img src="${esc(rootAssetUrl(pop.image_url))}" alt="${esc(pop.title||'')}" class="cms-popup-image"></a>`
              : `<img src="${esc(rootAssetUrl(pop.image_url))}" alt="${esc(pop.title||'')}" class="cms-popup-image">`
          ):''}
          <div class="cms-popup-body">
            <strong>${esc(pop.title||'')}</strong>
            ${pop.link_url?`<a class="cms-popup-link" href="${esc(pop.link_url)}">자세히 보기 →</a>`:''}
          </div>
        </div>`;
      document.body.appendChild(wrap);

      const style=document.createElement('style');
      style.textContent=`
        #cmsPopup{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px}
        .cms-popup-backdrop{position:absolute;inset:0;background:rgba(12,20,15,.48)}
        .cms-popup-card{position:relative;z-index:1;width:min(440px,92vw);max-height:86vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.24)}
        .cms-popup-close{position:absolute;right:10px;top:10px;z-index:2;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.92);font-size:23px;cursor:pointer}
        .cms-popup-image-link{display:block}.cms-popup-image{width:100%;max-height:62vh;object-fit:contain;background:#f7f7f5;height:auto;display:block}
        .cms-popup-body{padding:20px}
        .cms-popup-body strong{display:block;font-size:18px;color:#183a2a}
        .cms-popup-link{display:inline-block;margin-top:12px;font-size:12px;font-weight:700;color:#28563f}
      `;
      document.head.appendChild(style);

      function close(){wrap.remove();style.remove();}
      wrap.querySelector('.cms-popup-close').onclick=close;
      wrap.querySelector('.cms-popup-backdrop').onclick=close;
    }catch(e){
      console.error('popup load failed',e);
    }
  }

  async function renderDetail(){
    removeDuplicateStaticLogos();
    applyBrandAssets();
    const root=document.getElementById('detailRoot');
    if(!root)return;

    const slug=detailSlug();

    root.innerHTML='<div class="cms-loading">페이지를 불러오는 중입니다.</div>';

    try{
      const rows=await get('cms_pages?select=*&slug=eq.'+encodeURIComponent(slug)+'&is_visible=eq.true&limit=1');
      const p=rows[0];

      await Promise.all([renderNav(slug),applyDesign()]);

      if(!p){
        root.innerHTML='<div class="cms-error"><h2>현재 공개되지 않은 페이지입니다.</h2><p><a href="/">홈으로 돌아가기</a></p></div>';
        return;
      }

      const posts=await get(
        'cms_posts?select=*&page_id=eq.'+encodeURIComponent(p.id)+
        '&is_active=eq.true&order=is_pinned.desc,sort_order.asc,created_at.desc'
      );

      const pinned=posts.find(x=>x.is_pinned) || posts[0] || null;

      const isDietMainTemplate=(html)=>String(html||'').includes('data-diet-main-template="v31512"');
      const isBopyeMainTemplate=(html)=>String(html||'').includes('data-bopye-main-template="v31535"');
      const isDamjeokMainTemplate=(html)=>String(html||'').includes('data-damjeok-main-template="v31526"');

      const dietTemplate=(slug==='diet' && window.JSH_DIET_MAIN_TEMPLATE)
        ? window.JSH_DIET_MAIN_TEMPLATE
        : '';
      const bopyeTemplate=(slug==='bopye' && window.JSH_BOPYE_MAIN_TEMPLATE)
        ? window.JSH_BOPYE_MAIN_TEMPLATE
        : '';
      const damjeokTemplate=(slug==='damjeok' && window.JSH_DAMJEOK_MAIN_TEMPLATE)
        ? window.JSH_DAMJEOK_MAIN_TEMPLATE
        : '';

      let pinnedBody=pinned?.content_html||'';
      let pinnedTitle=pinned?.title||'';

      if(slug==='diet' && dietTemplate && !isDietMainTemplate(pinned?.content_html)){
        pinnedBody=dietTemplate;
        pinnedTitle='엔오슬림환 다이어트 프로그램';
      }

      if(slug==='bopye' && bopyeTemplate && !isBopyeMainTemplate(pinned?.content_html)){
        pinnedBody=bopyeTemplate;
        pinnedTitle='보폐고엔오 호흡기 진료';
      }

      if(slug==='damjeok' && damjeokTemplate && !isDamjeokMainTemplate(pinned?.content_html)){
        pinnedBody=damjeokTemplate;
        pinnedTitle='담적병·소화기 진료';
      }

      // Pretty URLs (/damjeok/, /bopye/, /diet/...) change the base path.
      // Normalize any CMS/template local asset path before inserting HTML.
      pinnedBody=rootHtmlAssetUrls(pinnedBody);

      const related=posts.filter(x=>!pinned || x.id!==pinned.id);
      const relatedCards=related.slice(0,3);
      const relatedMore=related.slice(3);

      const plainSummary=(post)=>{
        if(post.summary && String(post.summary).trim())return String(post.summary).trim();
        const temp=document.createElement('div');
        temp.innerHTML=post.content_html||'';
        return (temp.textContent||temp.innerText||'')
          .replace(/\s+/g,' ')
          .trim()
          .slice(0,105);
      };

      applyDetailSeo(slug,p.name);

      root.innerHTML=`
        <section class="page-head">
          <div class="container">
            <div class="eyebrow">${esc(p.eyebrow||'SPECIALTY CLINIC')}</div>
            <h1>${esc(p.name)}</h1>
            <p>${esc(p.description||'')}</p>
          </div>
        </section>

        <section class="featured">
          <div class="container">
            <div class="featured-meta"><span class="featured-label">대표 메인글</span></div>

            ${(pinned || (slug==='diet' && dietTemplate) || (slug==='bopye' && bopyeTemplate) || (slug==='damjeok' && damjeokTemplate)) ? `
              <article class="featured-article featured-article-clean" data-post-id="${pinned?.id||''}">
                <h2>${esc(pinnedTitle)}</h2>
                <div class="article-body">${pinnedBody}</div>
              </article>
            ` : `
              <div class="featured-article">
                <div class="cms-loading">대표 메인글이 아직 없습니다.</div>
              </div>
            `}
          </div>
        </section>

        <section class="blog-section detail-related-section">
          <div class="container">
            <div class="blog-top detail-related-head">
              <div>
                <div class="detail-related-kicker">RELATED HEALTH INFORMATION</div>
                <h2>${esc(p.name)} 관련 글</h2>
                <p>대표글과 함께 참고하면 좋은 내용을 확인해보세요.</p>
              </div>
            </div>

            ${relatedCards.length ? `
              <div class="detail-related-cards">
                ${relatedCards.map(post=>`
                  <a class="detail-related-card"
                     href="/article.html?id=${encodeURIComponent(post.id)}"
                     aria-label="${esc(post.title||'관련 글 보기')}">
                    <div class="detail-related-card-image">
                      ${post.image_url
                        ? `<img src="${esc(rootAssetUrl(post.image_url))}" alt="">`
                        : `<div class="detail-related-card-placeholder">
                             <span>${esc(post.category||p.name)}</span>
                           </div>`}
                    </div>
                    <div class="detail-related-card-body">
                      <div class="detail-related-card-category">${esc(post.category||p.name)}</div>
                      <h3>${esc(post.title||'')}</h3>
                      <p>${esc(plainSummary(post))}</p>
                      <span class="detail-related-card-link">글 읽기 →</span>
                    </div>
                  </a>
                `).join('')}
              </div>
            ` : `
              <div class="detail-related-empty">아직 등록된 관련 글이 없습니다.</div>
            `}

            ${relatedMore.length ? `
              <details class="detail-related-more">
                <summary>
                  <span>다른 글 더보기</span>
                  <span class="detail-related-count">${relatedMore.length}개</span>
                </summary>
                <div class="detail-related-list">
                  ${relatedMore.map((post,index)=>`
                    <a class="detail-related-list-item"
                       href="/article.html?id=${encodeURIComponent(post.id)}">
                      <span class="detail-related-list-number">${String(index+4).padStart(2,'0')}</span>
                      <span class="detail-related-list-copy">
                        <strong>${esc(post.title||'')}</strong>
                        <small>${esc(post.category||p.name)}</small>
                      </span>
                      <span class="detail-related-list-arrow">→</span>
                    </a>
                  `).join('')}
                </div>
              </details>
            ` : ''}
          </div>
        </section>

        <section class="cta">
          <div class="container cta-inner">
            <div><h2>${esc(p.name)} 진료가 궁금하신가요?</h2><p>현재 증상과 경과를 확인한 뒤 진료 방향을 안내드립니다.</p></div>
            <a href="tel:0432211275">전화 예약하기</a>
          </div>
        </section>`;
    }catch(e){
      console.error(e);
      root.innerHTML='<div class="cms-error"><h2>페이지를 불러오지 못했습니다.</h2><p>Supabase 연결을 확인해주세요.</p></div>';
    }
  }


  async function renderBopyePage(){
    const mainRoot=document.getElementById('bopyeMainArticle');
    const relatedRoot=document.getElementById('bopyeRelatedPosts');
    if(!mainRoot && !relatedRoot)return;

    try{
      const pages=await get(
        'cms_pages?select=id,name,slug&slug=eq.bopye&is_visible=eq.true&limit=1'
      );
      const page=pages?.[0];

      if(!page){
        if(mainRoot && window.JSH_BOPYE_MAIN_TEMPLATE){
          mainRoot.innerHTML=rootHtmlAssetUrls(window.JSH_BOPYE_MAIN_TEMPLATE);
        }
        if(relatedRoot){
          relatedRoot.innerHTML='<div class="bopye-related-empty">관련 건강정보가 아직 없습니다.</div>';
        }
        return;
      }

      const posts=await get(
        'cms_posts?select=id,title,summary,image_url,category,content_html,sort_order,created_at,is_pinned'+
        '&page_id=eq.'+encodeURIComponent(page.id)+
        '&is_active=eq.true'+
        '&order=is_pinned.desc,sort_order.asc,created_at.desc'
      );

      const pinned=posts.find(x=>x.is_pinned)||posts[0]||null;
      const isNewTemplate=(html)=>String(html||'').includes('data-bopye-main-template="v31516"');
      const template=window.JSH_BOPYE_MAIN_TEMPLATE||'';

      if(mainRoot){
        if(pinned && isNewTemplate(pinned.content_html)){
          mainRoot.innerHTML=rootHtmlAssetUrls(pinned.content_html||'');
        }else if(template){
          mainRoot.innerHTML=template;
        }else if(pinned){
          mainRoot.innerHTML=rootHtmlAssetUrls(pinned.content_html||'');
        }else{
          mainRoot.innerHTML='<div class="bopye-related-empty">대표 메인글이 아직 없습니다.</div>';
        }
      }

      if(!relatedRoot)return;

      const related=posts.filter(x=>!pinned || x.id!==pinned.id);

      if(!related.length){
        relatedRoot.innerHTML='<div class="bopye-related-empty">관련 건강정보가 아직 없습니다.</div>';
        return;
      }

      const plainSummary=(post)=>{
        if(post.summary && String(post.summary).trim())return String(post.summary).trim();
        const div=document.createElement('div');
        div.innerHTML=post.content_html||'';
        return (div.textContent||div.innerText||'')
          .replace(/\s+/g,' ')
          .trim()
          .slice(0,105);
      };

      const cards=related.slice(0,3);
      const more=related.slice(3);

      relatedRoot.innerHTML=`
        <div class="related-health-grid">
          ${cards.map(post=>`
            <a class="bopye-post-card" href="/article.html?id=${encodeURIComponent(post.id)}">
              <div class="bopye-post-thumb">
                ${post.image_url
                  ? `<img src="${esc(rootAssetUrl(post.image_url))}" alt="" loading="lazy" decoding="async">`
                  : `<div class="bopye-post-thumb-empty">${esc(post.category||'보폐고엔오')}</div>`}
              </div>
              <div class="bopye-post-body">
                <div class="bopye-post-category">${esc(post.category||'보폐고엔오')}</div>
                <h3>${esc(post.title||'')}</h3>
                <p>${esc(plainSummary(post))}</p>
                <span class="bopye-post-link">건강정보 읽기 →</span>
              </div>
            </a>
          `).join('')}
        </div>

        ${more.length ? `
          <details class="bopye-more">
            <summary>
              <span>다른 건강정보 더보기</span>
              <span class="bopye-more-count">${more.length}개</span>
            </summary>
            <div class="bopye-post-list">
              ${more.map((post,index)=>`
                <a href="/article.html?id=${encodeURIComponent(post.id)}">
                  <span class="bopye-post-num">${String(index+4).padStart(2,'0')}</span>
                  <span class="bopye-post-list-copy">
                    <strong>${esc(post.title||'')}</strong>
                    <small>${esc(post.category||'보폐고엔오')}</small>
                  </span>
                  <span class="bopye-post-arrow">→</span>
                </a>
              `).join('')}
            </div>
          </details>
        `:''}
      `;
    }catch(e){
      console.error('bopye page load failed',e);
      if(mainRoot && window.JSH_BOPYE_MAIN_TEMPLATE){
        mainRoot.innerHTML=rootHtmlAssetUrls(window.JSH_BOPYE_MAIN_TEMPLATE);
      }
      if(relatedRoot){
        relatedRoot.innerHTML='<div class="bopye-related-empty">건강정보를 불러오지 못했습니다.</div>';
      }
    }
  }

  async function renderBopyeRelatedPosts(){
    return renderBopyePage();
  }

  async function renderArticle(){
    removeDuplicateStaticLogos();
    applyBrandAssets();
    const root=document.getElementById('articleRoot');
    if(!root)return;

    const id=new URLSearchParams(location.search).get('id')||'';
    root.innerHTML='<div class="cms-loading">글을 불러오는 중입니다.</div>';

    try{
      const rows=await get('cms_posts?select=*&id=eq.'+encodeURIComponent(id)+'&is_active=eq.true&limit=1');
      const post=rows[0];

      if(!post){
        root.innerHTML='<div class="cms-error"><h2>글을 찾을 수 없습니다.</h2><p><a href="/">홈으로 돌아가기</a></p></div>';
        return;
      }

      const pages=await get('cms_pages?select=*&id=eq.'+encodeURIComponent(post.page_id)+'&is_visible=eq.true&limit=1');
      const page=pages[0];

      await Promise.all([renderNav(page?.slug||''),applyDesign()]);

      document.title=(post.title||'건강정보')+' | 제세현한의원';

      root.innerHTML=`
        <section class="page-head">
          <div class="container">
            <div class="eyebrow">${esc(page?.name||'HEALTH LIBRARY')}</div>
            <h1 style="font-size:clamp(30px,4.2vw,54px)">${esc(post.title||'')}</h1>
            <p>${esc(post.summary||'')}</p>
          </div>
        </section>

        <section class="featured">
          <div class="container">
            <article class="featured-article" data-post-id="${post.id}">
              ${post.image_url?`<div class="featured-image"><img src="${esc(rootAssetUrl(post.image_url))}" alt=""></div>`:''}
              <div class="article-body cms-imported-body">${rootHtmlAssetUrls(post.content_html||'')}</div>
              ${post.source_url?`
                <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e4e7e2">
                  <a href="${esc(post.source_url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#64856e;font-weight:700">네이버 원문 보기 →</a>
                </div>`:''}
            </article>
          </div>
        </section>

        ${page?`
          <section class="cta">
            <div class="container cta-inner">
              <div><h2>${esc(page.name)} 진료가 궁금하신가요?</h2><p>현재 증상과 경과를 확인한 뒤 진료 방향을 안내드립니다.</p></div>
              <a href="${pageUrl(page.slug)}">${esc(page.name)} 상세페이지</a>
            </div>
          </section>`:''}
      `;
    }catch(e){
      console.error(e);
      root.innerHTML='<div class="cms-error"><h2>글을 불러오지 못했습니다.</h2><p>잠시 후 다시 확인해주세요.</p></div>';
    }
  }




  function cssEscapeValue(value=''){
    return String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  }


  const HOME_IMAGE_POSITION_KEYS=[
    'clinicDamjeok','clinicBopye','clinicVascular',
    'clinicDiet','clinicPain','clinicAutonomic'
  ];

  function homeImagePositionKeyForElement(el){
    if(!el)return '';
    if(el.classList?.contains('doctor-photo'))return 'doctor';

    if(el.classList?.contains('clinic-image')){
      const cards=[...document.querySelectorAll('#clinics .clinic-card')];
      const card=el.closest('.clinic-card');
      const index=cards.indexOf(card);
      return index>=0 ? (HOME_IMAGE_POSITION_KEYS[index]||'') : '';
    }

    return '';
  }

  function normalizeHomeImagePosition(data){
    const n=(v,fallback)=>{
      const x=Number(v);
      return Number.isFinite(x)?x:fallback;
    };

    const dx=n(data?.desktop_x,50);
    const dy=n(data?.desktop_y,50);
    const mx=n(data?.mobile_x,dx);
    const my=n(data?.mobile_y,dy);

    return {desktop_x:dx,desktop_y:dy,mobile_x:mx,mobile_y:my};
  }


  function normalizeDoctorTransform(data){
    const num=(v,f)=>{
      const n=Number(v);
      return Number.isFinite(n)?n:f;
    };
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
    const safeZoom=(x,y,requested)=>{
      // If the image is moved, enlarge it enough that no blank band can appear.
      const required=100+(2*Math.max(Math.abs(x),Math.abs(y)))+2;
      return clamp(Math.max(num(requested,102),required),100,220);
    };

    const desktop_offset_x=clamp(num(data?.desktop_offset_x,0),-30,30);
    const desktop_offset_y=clamp(num(data?.desktop_offset_y,0),-30,30);
    const mobile_offset_x=clamp(num(data?.mobile_offset_x,0),-30,30);
    const mobile_offset_y=clamp(num(data?.mobile_offset_y,0),-30,30);

    return {
      desktop_offset_x,
      desktop_offset_y,
      mobile_offset_x,
      mobile_offset_y,
      desktop_zoom:safeZoom(desktop_offset_x,desktop_offset_y,data?.desktop_zoom),
      mobile_zoom:safeZoom(mobile_offset_x,mobile_offset_y,data?.mobile_zoom)
    };
  }

  function applyDoctorTransform(el,data){
    if(!el)return;
    const img=el.querySelector('img');
    if(!img)return;

    const p=normalizeDoctorTransform(data||{});
    const useMobile=window.matchMedia('(max-width:700px)').matches;
    const x=useMobile?p.mobile_offset_x:p.desktop_offset_x;
    const y=useMobile?p.mobile_offset_y:p.desktop_offset_y;
    const zoom=useMobile?p.mobile_zoom:p.desktop_zoom;

    el.dataset.jshDoctorPositioned='1';
    el.dataset.jshDoctorSource='canonical-home-overrides';
    el.dataset.jshDoctorDesktopOffsetX=String(p.desktop_offset_x);
    el.dataset.jshDoctorDesktopOffsetY=String(p.desktop_offset_y);
    el.dataset.jshDoctorMobileOffsetX=String(p.mobile_offset_x);
    el.dataset.jshDoctorMobileOffsetY=String(p.mobile_offset_y);
    el.dataset.jshDoctorDesktopZoom=String(p.desktop_zoom);
    el.dataset.jshDoctorMobileZoom=String(p.mobile_zoom);

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

  function applyFixedHomeImagePosition(el,data){
    if(!el || !data)return;
    const p=normalizeHomeImagePosition(data);

    el.dataset.jshPositioned='1';
    el.dataset.jshDesktopX=String(p.desktop_x);
    el.dataset.jshDesktopY=String(p.desktop_y);
    el.dataset.jshMobileX=String(p.mobile_x);
    el.dataset.jshMobileY=String(p.mobile_y);

    el.style.setProperty('--jsh-desktop-position',p.desktop_x+'% '+p.desktop_y+'%');
    el.style.setProperty('--jsh-mobile-position',p.mobile_x+'% '+p.mobile_y+'%');

    const useMobile=window.matchMedia('(max-width:700px)').matches;
    const x=useMobile?p.mobile_x:p.desktop_x;
    const y=useMobile?p.mobile_y:p.desktop_y;

    if(el.classList.contains('doctor-photo')){
      applyDoctorTransform(el,data);
    }else if(el.classList.contains('clinic-image')){
      el.style.setProperty('background-position',x+'% '+y+'%','important');
    }
  }

  async function applyHomeImagePositions(){
    try{
      const rows=await get('cms_settings?select=value&key=eq.home_image_positions&limit=1');
      const positions=rows?.[0]?.value||{};

      const doctor=document.querySelector('#doctor .doctor-photo');
      if(doctor){
        applyDoctorTransform(doctor,positions.doctor||{});
      }

      document.querySelectorAll('#clinics .clinic-card').forEach((card,index)=>{
        const el=card.querySelector('.clinic-image');
        const key=HOME_IMAGE_POSITION_KEYS[index];
        if(el && key && positions[key]){
          applyFixedHomeImagePosition(el,positions[key]);
        }
      });

      refreshResponsiveImagePositions();
    }catch(e){
      console.error('home image positions load failed',e);
    }
  }



  async function applyDoctorTransformFromOverrides(){
    try{
      const rows=await rest('cms_settings?select=*&key=eq.home_overrides&limit=1');
      const overrides=rows?.[0]?.value||{};
      const doctor=document.querySelector('#doctor .doctor-photo');
      if(!doctor)return;

      const canonical=overrides['#doctor .doctor-photo'];

      if(canonical?.doctor_transform){
        applyDoctorTransform(doctor,canonical.doctor_transform);
        return;
      }

      // Backward compatibility only before the first v3.14.9 save:
      // use the most recently inserted legacy doctor override.
      const keys=Object.keys(overrides).filter(k=>/doctor-photo/.test(k));
      for(let i=keys.length-1;i>=0;i--){
        const data=overrides[keys[i]];
        if(data?.doctor_transform){
          applyDoctorTransform(doctor,data.doctor_transform);
          return;
        }
      }
    }catch(e){
      console.warn('doctor transform restore failed',e);
    }
  }


  function normalizeDoctorImagePosition(value){
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
    const point=(obj={})=>{
      const x=clamp(obj.x,-30,30);
      const y=clamp(obj.y,-30,30);

      // A shifted image must be enlarged enough to keep the frame filled.
      const requiredZoom=100+(2*Math.max(Math.abs(x),Math.abs(y)))+4;
      const zoom=clamp(Math.max(Number(obj.zoom)||100,requiredZoom),100,220);
      return {x,y,zoom};
    };

    return {
      desktop:point(value?.desktop),
      mobile:point(value?.mobile)
    };
  }

  function resetDoctorImageStyles(img){
    if(!img)return;

    [
      'position','left','top','right','bottom','width','height','max-width',
      'object-fit','object-position','transform','transform-origin',
      'margin','inset'
    ].forEach(prop=>img.style.removeProperty(prop));
  }

  function applyDoctorImagePosition(el,value){
    if(!el)return;
    const img=el.querySelector('img');
    if(!img)return;

    const normalized=normalizeDoctorImagePosition(value||{});
    const mobile=window.matchMedia('(max-width:700px)').matches;
    const p=mobile?normalized.mobile:normalized.desktop;

    resetDoctorImageStyles(img);

    el.style.setProperty('position','relative','important');
    el.style.setProperty('overflow','hidden','important');

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

    el.dataset.jshDoctorPosition='dedicated-v3150';
    el.dataset.jshDoctorX=String(p.x);
    el.dataset.jshDoctorY=String(p.y);
    el.dataset.jshDoctorZoom=String(p.zoom);
  }

  async function applyDedicatedDoctorImagePosition(){
    try{
      const rows=await get('cms_settings?select=value&key=eq.doctor_image_position&limit=1');
      const value=rows?.[0]?.value||{
        desktop:{x:0,y:0,zoom:100},
        mobile:{x:0,y:0,zoom:100}
      };
      const doctor=document.querySelector('#doctor .doctor-photo');
      if(doctor)applyDoctorImagePosition(doctor,value);
    }catch(e){
      console.error('doctor image position load failed',e);
    }
  }

  async function applyHomeOverrides(){
    try{
      const rows=await get('cms_settings?select=value&key=eq.home_overrides&limit=1');
      const overrides=rows?.[0]?.value || {};

      Object.entries(overrides).forEach(([selector,data])=>{
        // v3.14.9: doctor image has exactly one canonical override key.
        // Ignore stale doctor selectors created by earlier generic-editor versions.
        if(/doctor-photo/.test(String(selector)) && selector!=='#doctor .doctor-photo')return;

        // Old generic editor could save a logo/image override on the obsolete
        // hero-image-placeholder. Never apply that stale override again.
        if(String(selector).includes('hero-image-placeholder'))return;

        let el=null;
        try{el=document.querySelector(selector)}catch(e){}
        if(!el || !data)return;

        // v3.12.8 strict image whitelist.
        // Old generic editor image overrides may point to normal text/layout elements.
        // Public image overrides are allowed ONLY on the known image slots below.
        if(data.kind==='image'){
          const allowedImageTarget =
            el.classList.contains('hero-bg') ||
            el.classList.contains('clinic-image') ||
            el.classList.contains('doctor-photo') ||
            el.classList.contains('map-placeholder');

          if(!allowedImageTarget)return;
        }

        if(data.kind==='text'){
          el.textContent=data.value ?? '';
        }else if(data.kind==='html'){
          const htmlValue=String(data.value ?? '');
          if(/logo-jesehyun|static-brand-logo|brand-picture/i.test(htmlValue)){
            return;
          }
          el.innerHTML=htmlValue;
        }else if(data.kind==='link'){
          if(typeof data.text==='string')el.textContent=data.text;
          if(typeof data.href==='string')el.setAttribute('href',data.href);
        }else if(data.kind==='image'){
          const doctorImage=el.classList.contains('doctor-photo')
            ? el.querySelector('img')
            : null;

          if(el.tagName==='IMG'){
            if(data.src)el.setAttribute('src',data.src);
            if(typeof data.alt==='string')el.setAttribute('alt',data.alt);
            el.style.objectFit='cover';
          }else if(doctorImage){
            if(data.src)doctorImage.setAttribute('src',data.src);
            if(typeof data.alt==='string' && data.alt)doctorImage.setAttribute('alt',data.alt);
            doctorImage.style.width='100%';
            doctorImage.style.height='100%';
            doctorImage.style.objectFit='cover';
            doctorImage.style.display='block';
          }else if(data.src){
            const isHero=el.classList.contains('hero-bg');

            // Hero source is managed by applyHomeMedia() so slide 2/3 remain deferred.
            // The override still contributes its saved X/Y positioning below.
            if(!isHero){
              el.style.backgroundImage='url("'+cssEscapeValue(data.src)+'")';
              el.style.backgroundSize='cover';
            }
          }

          const dx=Number.isFinite(Number(data.desktop_x))?Number(data.desktop_x):50;
          const dy=Number.isFinite(Number(data.desktop_y))?Number(data.desktop_y):50;
          const mx=Number.isFinite(Number(data.mobile_x))?Number(data.mobile_x):dx;
          const my=Number.isFinite(Number(data.mobile_y))?Number(data.mobile_y):dy;

          el.dataset.jshPositioned='1';
          el.style.setProperty('--jsh-desktop-position',dx+'% '+dy+'%');
          el.style.setProperty('--jsh-mobile-position',mx+'% '+my+'%');

          const useMobile=window.matchMedia('(max-width:700px)').matches;
          const px=useMobile?mx:dx;
          const py=useMobile?my:dy;

          if(el.tagName==='IMG'){
            el.style.objectPosition=px+'% '+py+'%';
          }else if(doctorImage){
            doctorImage.style.objectPosition=px+'% '+py+'%';
          }else{
            el.style.backgroundPosition=px+'% '+py+'%';
          }

          el.dataset.jshDesktopX=String(dx);
          el.dataset.jshDesktopY=String(dy);
          el.dataset.jshMobileX=String(mx);
          el.dataset.jshMobileY=String(my);

          // Backward-compatible fallback for an old hero override that has no
          // corresponding home_media source. It is intentionally deferred.
          if(el.classList.contains('hero-bg') && data.src && !el.dataset.jshLoadedHeroUrl){
            const slide=el.closest('.hero-slide');
            const index=[...document.querySelectorAll('#hero .hero-slide')].indexOf(slide);
            if(index===0){
              loadHeroBackground(0,data.src,'high').catch(()=>{});
            }else if(index>0){
              scheduleHeroBackground(index,data.src,index===1?650:1250);
            }
          }
        }
      });
      clearInvalidImageOverrides();
      refreshResponsiveImagePositions();
    }catch(e){
      console.error('home overrides load failed',e);
    }
  }



  function clearInvalidImageOverrides(){
    const allowedSelector='.hero-bg,.clinic-image,.doctor-photo,.map-placeholder';

    document.querySelectorAll('[style]').forEach(el=>{
      if(el.matches?.(allowedSelector))return;
      if(el.closest?.('.header'))return;

      const inlineBg=el.style?.backgroundImage||'';
      if(inlineBg && inlineBg!=='none'){
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-size');
        el.style.removeProperty('background-position');
      }

      if(el.dataset?.jshPositioned==='1'){
        delete el.dataset.jshPositioned;
        delete el.dataset.jshDesktopX;
        delete el.dataset.jshDesktopY;
        delete el.dataset.jshMobileX;
        delete el.dataset.jshMobileY;
      }
    });
  }


  function refreshResponsiveImagePositions(){
    const useMobile=window.matchMedia('(max-width:700px)').matches;

    document.querySelectorAll('[data-jsh-doctor-positioned="1"]').forEach(el=>{
      applyDoctorTransform(el,{
        desktop_offset_x:Number(el.dataset.jshDoctorDesktopOffsetX||0),
        desktop_offset_y:Number(el.dataset.jshDoctorDesktopOffsetY||0),
        mobile_offset_x:Number(el.dataset.jshDoctorMobileOffsetX||0),
        mobile_offset_y:Number(el.dataset.jshDoctorMobileOffsetY||0),
        desktop_zoom:Number(el.dataset.jshDoctorDesktopZoom||105),
        mobile_zoom:Number(el.dataset.jshDoctorMobileZoom||105)
      });
    });

    document.querySelectorAll('[data-jsh-positioned="1"]').forEach(el=>{
      const dx=Number(el.dataset.jshDesktopX||50);
      const dy=Number(el.dataset.jshDesktopY||50);
      const mx=Number(el.dataset.jshMobileX||dx);
      const my=Number(el.dataset.jshMobileY||dy);
      const x=useMobile?mx:dx;
      const y=useMobile?my:dy;

      if(el.tagName==='IMG'){
        el.style.setProperty('object-position',x+'% '+y+'%','important');
      }else if(el.classList.contains('doctor-photo')){
        const img=el.querySelector('img');
        if(img)img.style.setProperty('object-position',x+'% '+y+'%','important');
      }else{
        el.style.setProperty('background-position',x+'% '+y+'%','important');
      }
    });
  }

  let jshResponsivePositionTimer=null;
  window.addEventListener('resize',()=>{
    clearTimeout(jshResponsivePositionTimer);
    jshResponsivePositionTimer=setTimeout(refreshResponsiveImagePositions,80);
  });

  async function applyHomeCopy(){
    try{
      const rows=await get('cms_settings?select=value&key=eq.home_copy&limit=1');
      const c=rows?.[0]?.value||{};
      const set=(sel,val)=>{const el=document.querySelector(sel);if(el&&val)el.textContent=val};
      set('.slide-1 h1',c.hero1_title); set('.slide-1 p',c.hero1_subtitle);
      set('.slide-2 h1',c.hero2_title); set('.slide-2 p',c.hero2_subtitle);
      set('.slide-3 h1',c.hero3_title); set('.slide-3 p',c.hero3_subtitle);
      set('#clinics .section-head h2',c.clinics_title); set('#clinics .section-head p',c.clinics_subtitle);
      set('#doctor .doctor-copy h2',c.doctor_title); set('#doctor .doctor-name',c.doctor_name); set('#doctor .doctor-copy p',c.doctor_body);
      const hh=document.querySelector('[data-section="health-content"] .section-head')||document.querySelector('#health .section-head')||document.querySelector('#library .section-head');
      if(hh){const h=hh.querySelector('h2'),p=hh.querySelector('p');if(h&&c.health_title)h.textContent=c.health_title;if(p&&c.health_subtitle)p.textContent=c.health_subtitle;}
      set('#visit .section-head h2',c.visit_title); set('#visit .section-head p',c.visit_subtitle);
    }catch(e){console.error('home copy load failed',e)}
  }


  const HERO_GRADIENTS=[
    'linear-gradient(90deg,rgba(8,24,15,.85) 0%,rgba(8,24,15,.58) 44%,rgba(8,24,15,.15) 80%)',
    'linear-gradient(90deg,rgba(8,24,15,.86) 0%,rgba(8,24,15,.60) 44%,rgba(8,24,15,.14) 80%)',
    'linear-gradient(90deg,rgba(8,24,15,.84) 0%,rgba(8,24,15,.56) 44%,rgba(8,24,15,.12) 80%)'
  ];

  const heroLoadPromises=new Map();
  const heroQueued=new Map();
  const heroImageKeepAlive=window.__JSH_HERO_IMAGE_KEEPALIVE=
    window.__JSH_HERO_IMAGE_KEEPALIVE||new Map();

  function cssUrl(url=''){
    return String(url).replace(/\\/g,'\\\\').replace(/"/g,'%22');
  }

  function addImagePreload(url,priority='auto'){
    if(!url)return;
    const key='link[data-jsh-preload="'+encodeURIComponent(url)+'"]';
    if(document.querySelector(key))return;

    const link=document.createElement('link');
    link.rel='preload';
    link.as='image';
    link.href=url;
    link.dataset.jshPreload=encodeURIComponent(url);
    if(priority==='high'){
      try{link.fetchPriority='high'}catch(_){}
      link.setAttribute('fetchpriority','high');
    }
    document.head.appendChild(link);
  }

  function warmImage(url,priority='auto'){
    if(!url)return Promise.resolve(false);
    if(heroLoadPromises.has(url))return heroLoadPromises.get(url);

    const img=new Image();
    heroImageKeepAlive.set(url,img);

    try{img.decoding='async'}catch(_){}
    try{img.fetchPriority=priority}catch(_){}
    if(priority==='high')img.setAttribute?.('fetchpriority','high');

    const promise=new Promise(resolve=>{
      img.onload=async()=>{
        try{
          if(img.decode)await img.decode();
        }catch(_){}
        resolve(true);
      };
      img.onerror=()=>resolve(false);
      img.src=url;

      if(img.complete){
        Promise.resolve(img.decode?.()).catch(()=>{}).finally(()=>resolve(true));
      }
    });

    heroLoadPromises.set(url,promise);
    return promise;
  }

  function paintHeroBackground(index,url){
    const slide=document.querySelector('.hero-slide.slide-'+(index+1));
    const bg=slide?.querySelector('.hero-bg');
    if(!bg || !url)return;

    if(bg.dataset.jshLoadedHeroUrl===url)return;

    bg.style.backgroundImage=HERO_GRADIENTS[index]+', url("'+cssUrl(url)+'")';
    bg.style.backgroundSize='cover';
    bg.style.backgroundPosition='center';
    bg.style.backgroundRepeat='no-repeat';
    bg.dataset.jshLoadedHeroUrl=url;
  }

  async function loadHeroBackground(index,url,priority='auto'){
    if(!url)return;

    if(priority==='high')addImagePreload(url,'high');

    // Painting the first slide immediately starts the browser request at once.
    // Deferred slides wait until the image is warm, so they do not compete with LCP.
    if(index===0){
      paintHeroBackground(index,url);
      await warmImage(url,'high');
      return;
    }

    await warmImage(url,priority);
    paintHeroBackground(index,url);
  }

  function scheduleHeroBackground(index,url,delay=0){
    if(!url)return;
    const token=index+':'+url;
    if(heroQueued.get(index)===token)return;
    heroQueued.set(index,token);

    const run=()=>loadHeroBackground(index,url,'low').catch(()=>{});

    if('requestIdleCallback' in window){
      window.requestIdleCallback(run,{timeout:Math.max(1200,delay+700)});
    }else{
      setTimeout(run,delay);
    }
  }

  function lazyBackground(el,url,before=''){
    if(!el || !url)return;

    const apply=()=>{
      if(el.dataset.jshLazyBackgroundLoaded===url)return;
      el.style.backgroundImage=(before?before+', ':'')+'url("'+cssUrl(url)+'")';
      el.style.backgroundSize='cover';
      el.style.backgroundPosition='center';
      el.style.backgroundRepeat='no-repeat';
      el.dataset.jshLazyBackgroundLoaded=url;
    };

    if(!('IntersectionObserver' in window)){
      setTimeout(apply,900);
      return;
    }

    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        observer.disconnect();
        apply();
      }
    },{
      rootMargin:'650px 0px',
      threshold:0.01
    });

    observer.observe(el);
  }

  function consumeEarlyHomeMediaPromise(){
    const early=window.__JSH_HOME_MEDIA_PROMISE;
    if(!early)return null;

    // Consume once. If it fails, applyHomeMedia falls back to the normal getter.
    window.__JSH_HOME_MEDIA_PROMISE=null;
    return early;
  }


  async function applyHomeMedia(){
    try{
      let rows=null;
      const early=consumeEarlyHomeMediaPromise();

      if(early){
        try{rows=await early}catch(e){rows=null}
      }

      if(!rows){
        rows=await get('cms_settings?select=value&key=eq.home_media&limit=1');
      }

      const media=rows?.[0]?.value || {};

      // LCP strategy:
      // hero 1 starts immediately and receives high fetch priority.
      // hero 2/3 wait until the browser is idle so they do not compete.
      if(media.hero1){
        loadHeroBackground(0,media.hero1,'high').catch(()=>{});
      }

      if(media.hero2){
        scheduleHeroBackground(1,media.hero2,550);
      }

      if(media.hero3){
        scheduleHeroBackground(2,media.hero3,900);
      }

      // Once the critical first hero has started, warm every hero image and
      // keep the Image objects alive for instant revisits between slides.
      setTimeout(()=>{
        [media.hero1,media.hero2,media.hero3].filter(Boolean).forEach((url,index)=>{
          warmImage(url,index===0?'high':'auto').catch(()=>{});
        });
      },650);

      // If the visitor interacts with the hero before the idle task runs,
      // warm both remaining slides right away.
      const hero=document.getElementById('hero');
      if(hero && !hero.dataset.jshHeroWarmBound){
        hero.dataset.jshHeroWarmBound='1';

        const warmRemaining=()=>{
          if(media.hero2)loadHeroBackground(1,media.hero2,'high').catch(()=>{});
          if(media.hero3)loadHeroBackground(2,media.hero3,'auto').catch(()=>{});
        };

        hero.addEventListener('pointerdown',warmRemaining,{once:true,passive:true});
        hero.addEventListener('mouseenter',warmRemaining,{once:true,passive:true});
        hero.addEventListener('touchstart',warmRemaining,{once:true,passive:true});
      }

      const clinicKeys=[
        'clinicDamjeok','clinicBopye','clinicVascular',
        'clinicDiet','clinicPain','clinicAutonomic'
      ];

      // Below-the-fold clinic photos no longer compete with the first hero.
      document.querySelectorAll('#clinics .clinic-card').forEach((card,i)=>{
        const url=media[clinicKeys[i]];
        const target=card.querySelector('.clinic-image');
        if(!target || !url)return;

        lazyBackground(
          target,
          url,
          'linear-gradient(180deg,rgba(12,35,23,.04),rgba(12,35,23,.42))'
        );

        const label=target.querySelector('span');
        if(label){
          label.style.color='#fff';
          label.style.textShadow='0 1px 6px rgba(0,0,0,.35)';
        }
      });

      const doctor=document.querySelector('#doctor .doctor-photo');
      if(doctor && media.doctor){
        doctor.innerHTML='<img src="'+esc(media.doctor)+'" alt="제세현한의원 대표원장" '+
          'loading="lazy" decoding="async" '+
          'style="width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block">';
      }

      const locationImage=document.querySelector('#visit .map-placeholder');
      if(locationImage && media.location){
        locationImage.innerHTML=
          '<img src="'+esc(media.location)+'" alt="제세현한의원 위치 안내 이미지" '+
          'loading="lazy" decoding="async" '+
          'style="width:100%;height:100%;min-height:380px;object-fit:cover;border-radius:14px">';
      }
    }catch(e){
      console.error('home media load failed',e);
    }
  }

  function removeDuplicateStaticLogos(){
    document.querySelectorAll('img.static-brand-logo').forEach(img=>{
      if(!img.closest('.header'))img.remove();
    });
    document.querySelectorAll('picture.brand-picture').forEach(pic=>{
      if(!pic.closest('.header'))pic.remove();
    });
  }


  function purgeUnexpectedMainBrandArtifacts(){
    const header=document.querySelector('header.header');

    const isInsideHeader=(el)=>!!(header && header.contains(el));

    document.querySelectorAll('img').forEach(img=>{
      if(isInsideHeader(img))return;
      const src=String(img.getAttribute('src')||'');
      if(/logo-jesehyun|logo-static|static-brand-logo/i.test(src) ||
         img.classList.contains('static-brand-logo')){
        img.remove();
      }
    });

    document.querySelectorAll('source').forEach(source=>{
      if(isInsideHeader(source))return;
      const srcset=String(source.getAttribute('srcset')||'');
      if(/logo-jesehyun|logo-static/i.test(srcset)){
        const pic=source.closest('picture');
        if(pic && !isInsideHeader(pic))pic.remove();
        else source.remove();
      }
    });

    document.querySelectorAll('picture.brand-picture').forEach(pic=>{
      if(!isInsideHeader(pic))pic.remove();
    });

    document.querySelectorAll('[style]').forEach(el=>{
      if(isInsideHeader(el))return;
      const bg=String(el.style?.backgroundImage||'');
      if(/logo-jesehyun|logo-static/i.test(bg)){
        el.style.removeProperty('background-image');
        el.style.removeProperty('background');
      }
    });
  }

  function watchUnexpectedMainBrandArtifacts(){
    purgeUnexpectedMainBrandArtifacts();

    if(window.__jshBrandArtifactObserver)return;
    let scheduled=false;

    const schedulePurge=()=>{
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        purgeUnexpectedMainBrandArtifacts();
      });
    };

    const observer=new MutationObserver(schedulePurge);
    observer.observe(document.documentElement,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['src','srcset','style','class']
    });
    window.__jshBrandArtifactObserver=observer;
  }

  async function bootHome(){
    watchUnexpectedMainBrandArtifacts();
    removeDuplicateStaticLogos();
    await Promise.all([
      renderNav(''),
      applyBrandAssets(),
      applyDesign(),
      applyHomeCopy(),
      applyHomeMedia(),
      renderHomePosts(),
      renderPopups()
    ]);

    // Apply general overrides first.
    await applyHomeOverrides();

    // v3.14.5: doctor / clinic image positions use fixed setting keys,
    // so this MUST be the final image-position writer.
    await applyDedicatedDoctorImagePosition();

    clearInvalidImageOverrides();
    setTimeout(clearInvalidImageOverrides,250);

    purgeUnexpectedMainBrandArtifacts();
    setTimeout(purgeUnexpectedMainBrandArtifacts,250);
    setTimeout(purgeUnexpectedMainBrandArtifacts,800);
  }

  window.JSH_PUBLIC={renderBopyePage,renderBopyeRelatedPosts,
    renderNav,renderDetail,renderArticle,bootHome,applyBrandAssets,applyDesign,applyHomeCopy,applyHomeMedia,applyHomeOverrides,applyHomeImagePositions,renderHomePosts,renderPopups,applyDedicatedDoctorImagePosition,pageUrl,escapeHtml:esc
  };
})();
