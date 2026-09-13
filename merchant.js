<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0f5132">
  <title>خالصة | إدارة المحل</title>
  <style>
    :root{--ink:#102a23;--muted:#64756e;--green:#117a52;--dark:#0d3d2d;--mint:#e9f7ef;--line:#dce8e1;--bg:#f5f7f5;--orange:#f36c32;--white:#fff;--danger:#b42318;--shadow:0 12px 32px rgba(14,53,39,.08)}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);font-family:Tahoma,"Segoe UI",Arial,sans-serif;color:var(--ink);line-height:1.55}
    button,input,select{font:inherit} button{cursor:pointer}.shell{min-height:100vh;display:grid;grid-template-columns:250px minmax(0,1fr)}
    .side{background:var(--dark);color:#eaf8f0;padding:26px 18px;display:flex;flex-direction:column;gap:28px}.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:25px}.brand b{color:#fff}.brand i{font-style:normal;background:var(--orange);border-radius:11px;padding:0 8px;color:#fff;font-size:20px}
    .store-chip{background:rgba(255,255,255,.11);padding:15px;border-radius:16px}.store-chip strong{display:block;color:#fff}.store-chip span{font-size:12px;color:#bde4cf}.nav{display:grid;gap:7px}.nav a{color:#d4ebdf;text-decoration:none;padding:11px 12px;border-radius:10px}.nav a.active,.nav a:hover{background:rgba(255,255,255,.13);color:#fff}.side-foot{margin-top:auto;border-top:1px solid rgba(255,255,255,.15);padding-top:15px;font-size:12px;color:#bde4cf}
    main{min-width:0;padding:32px;max-width:1500px;width:100%;margin:auto}.top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}.eyebrow{margin:0;color:var(--green);font-size:13px;font-weight:700}.top h1{margin:4px 0;font-size:31px}.top p{margin:0;color:var(--muted)}.live{display:flex;align-items:center;gap:8px;background:var(--mint);padding:10px 13px;border-radius:11px;color:#136c4a;font-size:13px;white-space:nowrap}.dot{width:8px;height:8px;background:#1ea76d;border-radius:50%}
    .notice{display:flex;gap:13px;align-items:flex-start;background:#fff8e7;border:1px solid #f6deb0;border-radius:14px;padding:15px 17px;margin-bottom:20px;color:#725817}.notice b{color:#493600}.notice .ico{font-size:22px}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:20px}.card{background:var(--white);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--shadow)}.card h2{font-size:19px;margin:0 0 5px}.card .help{color:var(--muted);font-size:13px;margin:0 0 17px}.wide{grid-column:1/-1}.location{border-top:5px solid var(--green)}
    .gps-row{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#eaf8ef,#f7fffa);padding:16px;border:1px solid #cbe8d7;border-radius:14px;margin-bottom:16px}.gps-pin{font-size:29px}.gps-row strong{display:block}.gps-row small{color:var(--muted)}.gps-actions{margin-inline-start:auto;display:flex;gap:8px;flex-wrap:wrap}.btn{border:0;border-radius:10px;padding:11px 15px;font-weight:700}.btn.primary{background:var(--green);color:#fff}.btn.primary:hover{background:#0d6543}.btn.light{background:#fff;color:var(--green);border:1px solid #b7dcc7}.btn.orange{background:var(--orange);color:#fff}.btn.small{padding:7px 10px;font-size:12px}
    .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.field{display:grid;gap:6px}.field.full{grid-column:1/-1}.field label{font-size:13px;font-weight:700}.field input,.field select{width:100%;border:1px solid #cbd9d2;border-radius:10px;background:#fff;padding:11px;outline:none}.field input:focus,.field select:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(17,122,82,.12)}.gps-summary{margin-top:12px;padding:10px 12px;border-radius:10px;background:#f5f8f6;color:#486158;font-size:13px}
    .quick{display:grid;gap:15px}.quick-actions{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.hint{font-size:12px;color:var(--muted)}.product-list{display:grid;gap:9px;margin-top:15px}.product{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:10px}.product .picon{width:34px;height:34px;display:grid;place-items:center;background:#eaf8ef;border-radius:10px}.product strong{display:block}.product small{color:var(--muted)}.product .price{margin-inline-start:auto;font-weight:800;color:var(--green)}
    .orders{display:grid;gap:10px}.order{border:1px solid var(--line);padding:13px;border-radius:13px}.order-top{display:flex;justify-content:space-between;gap:10px}.badge{font-size:11px;background:#fff0d6;color:#985d00;padding:4px 8px;border-radius:20px;white-space:nowrap}.order small{color:var(--muted)}.order-actions{display:flex;gap:8px;margin-top:10px}.order.done .badge{background:#e7f7ee;color:#087443}
    .security{background:linear-gradient(135deg,#123e30,#0c6950);color:#fff}.security .help{color:#c4e6d5}.check-list{display:grid;gap:10px;margin:16px 0}.check-item{display:flex;gap:9px;align-items:flex-start;background:rgba(255,255,255,.09);padding:10px;border-radius:10px;font-size:13px}.check-item span{color:#9cf0c2}.agreement{display:flex;gap:10px;align-items:flex-start;padding:12px;background:#fff;color:#173f30;border-radius:11px;font-size:13px}.agreement input{width:18px;height:18px;margin-top:2px;accent-color:var(--green)}.security-note{margin-top:12px;font-size:12px;color:#d0ecdd}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.stat{padding:13px;border-radius:13px;background:#f6faf7;border:1px solid var(--line)}.stat span{font-size:12px;color:var(--muted);display:block}.stat strong{font-size:21px}
    .toast{position:fixed;left:20px;bottom:20px;background:#143d2e;color:#fff;padding:13px 16px;border-radius:11px;box-shadow:var(--shadow);transform:translateY(90px);opacity:0;transition:.25s;z-index:20}.toast.show{transform:translateY(0);opacity:1}.toast.error{background:var(--danger)}
    @media(max-width:980px){.shell{grid-template-columns:1fr}.side{display:none}main{padding:20px}.grid{grid-template-columns:1fr}.top h1{font-size:26px}.wide{grid-column:auto}}@media(max-width:620px){main{padding:14px}.top{flex-direction:column}.live{align-self:stretch}.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.gps-row{align-items:flex-start;flex-wrap:wrap}.gps-actions{width:100%;margin:0}.gps-actions .btn{flex:1}.stats{grid-template-columns:1fr 1fr}.card{padding:17px}.top h1{font-size:23px}}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="side" aria-label="قائمة المحل">
      <div class="brand"><i>خ</i><b>خالصة</b></div>
      <div class="store-chip"><strong>برجر شريت</strong><span>كفر صقر · متجر معتمد تجريبياً</span></div>
      <nav class="nav">
        <a class="active" href="#overview">◉ الرئيسية</a><a href="#products">▦ المنتجات</a><a href="#orders">▤ الطلبات</a><a href="#location">⌖ نطاق البيع</a><a href="#security">⌑ الحماية والتوثيق</a>
      </nav>
      <div class="side-foot">خير بلدنا لكل ولادنا<br>لوحة المحل التجريبية</div>
    </aside>
    <main>
      <header class="top" id="overview">
        <div><p class="eyebrow">لوحة إدارة المحل · تشغيل أسرع وأوضح</p><h1>خير بلدنا لكل ولادنا</h1><p>أضف منتجاتك، حدّد موقع محلك، واستقبل الطلبات في مكان واحد.</p></div>
        <div class="live"><span class="dot"></span> متاح لاستقبال الطلبات</div>
      </header>
      <section class="notice"><span class="ico">🛡️</span><div><b>التشغيل الآمن يبدأ من بيانات صحيحة.</b><br>استخدم GPS لتثبيت موقع المحل، ولا تشارك كلمات مرور أو بيانات بطاقات داخل التطبيق.</div></section>
      <section class="grid">
        <article class="card location" id="location">
          <h2>عنوان المحل وموقعه عبر GPS</h2><p class="help">يساعد الموقع الدقيق في نطاق البيع، إسناد المندوب، وحساب وقت التوصيل.</p>
          <div class="gps-row"><span class="gps-pin">📍</span><div><strong id="locationStatus">لم يتم تثبيت الموقع بعد</strong><small>اسمح للتطبيق بالوصول للموقع، أو أدخل العنوان يدوياً.</small></div><div class="gps-actions"><button class="btn primary" id="locateBtn" type="button">تحديد موقعي الآن</button><a class="btn light" id="mapLink" target="_blank" rel="noopener" hidden>فتح الخريطة</a></div></div>
          <form id="locationForm" class="form-grid">
            <div class="field"><label for="governorate">المحافظة</label><select id="governorate"><option>الشرقية</option><option>القاهرة</option><option>الجيزة</option><option>الإسكندرية</option><option>الدقهلية</option><option>القليوبية</option><option>الغربية</option><option>المنوفية</option><option>كفر الشيخ</option><option>البحيرة</option><option>دمياط</option><option>بورسعيد</option><option>الإسماعيلية</option><option>السويس</option><option>بني سويف</option><option>الفيوم</option><option>المنيا</option><option>أسيوط</option><option>سوهاج</option><option>قنا</option><option>الأقصر</option><option>أسوان</option><option>البحر الأحمر</option><option>مطروح</option><option>شمال سيناء</option><option>جنوب سيناء</option><option>الوادي الجديد</option></select></div>
            <div class="field"><label for="city">المدينة / المركز</label><input id="city" list="cities" value="كفر صقر" placeholder="مثال: كفر صقر"><datalist id="cities"><option value="كفر صقر"><option value="الزقازيق"><option value="فاقوس"><option value="أبو كبير"><option value="منيا القمح"><option value="القاهرة"></datalist></div>
            <div class="field full"><label for="address">العنوان التفصيلي</label><input id="address" placeholder="الشارع، علامة مميزة، رقم العقار"></div>
            <div class="field"><label for="deliveryRadius">نطاق البيع (كم)</label><select id="deliveryRadius"><option value="2">2 كم</option><option value="3">3 كم</option><option value="5" selected>5 كم</option><option value="7">7 كم</option><option value="10">10 كم</option></select></div>
            <div class="field"><label for="minimumOrder">الحد الأدنى للطلب (ج.م)</label><input id="minimumOrder" type="number" min="0" value="0"></div>
            <div class="field full"><button class="btn primary" type="submit">حفظ عنوان المحل ونطاق البيع</button></div>
          </form>
          <div class="gps-summary" id="gpsSummary">سيظهر هنا ملخص الموقع بعد الحفظ.</div>
        </article>
        <article class="card security" id="security">
          <h2>مركز الحماية والتوثيق</h2><p class="help">تأمين عملي للبيانات والعمليات قبل بدء البيع الفعلي.</p>
          <div class="check-list">
            <div class="check-item"><span>✓</span><div><b>حسابات بصلاحيات</b><br>اجعل لكل موظف حسابه ولا تشارك حساب المالك.</div></div>
            <div class="check-item"><span>✓</span><div><b>توثيق رقم الهاتف والوثائق</b><br>يُراجع من الإدارة قبل تفعيل التحويلات المالية.</div></div>
            <div class="check-item"><span>✓</span><div><b>سجل عمليات</b><br>يجب تسجيل تعديل المنتجات والطلبات والتحويلات على الخادم.</div></div>
          </div>
          <label class="agreement"><input id="agreement" type="checkbox"><span>أقرّ بأن بيانات المحل والمنتجات والأسعار صحيحة، وأتحمل المسؤولية القانونية عن أي غش أو تلاعب، وأوافق على شروط استخدام منصة خالصة وسياسة الخصوصية.</span></label>
          <div class="security-note" id="agreementStatus">لم تتم الموافقة بعد. لا يتم التفعيل النهائي قبل التحقق الإداري وربط الخادم.</div>
        </article>
        <article class="card" id="products">
          <h2>إضافة مادة للبيع بسرعة</h2><p class="help">أدخل الأساسيات أولاً، ثم طوّر التفاصيل والصور لاحقاً.</p>
          <form id="productForm" class="form-grid">
            <div class="field"><label for="productName">اسم المادة</label><input id="productName" required placeholder="مثال: وجبة برجر شريت"></div>
            <div class="field"><label for="productCategory">التصنيف</label><select id="productCategory"><option>مأكولات ومشروبات</option><option>بقالة</option><option>خضار وفواكه</option><option>صيدلية</option><option>أجهزة منزلية</option><option>ذهب ومجوهرات</option></select></div>
            <div class="field"><label for="productPrice">السعر (ج.م)</label><input id="productPrice" required type="number" min="0" step=".01" placeholder="0"></div>
            <div class="field"><label for="productStock">الكمية المتاحة</label><input id="productStock" required type="number" min="0" value="1"></div>
            <div class="field full quick-actions"><button class="btn orange" type="submit">+ إضافة المادة</button><span class="hint">تُحفظ هذه البيانات محلياً في النسخة التجريبية حتى ربطها بـ API.</span></div>
          </form>
          <div class="product-list" id="productList"></div>
        </article>
        <article class="card" id="orders">
          <h2>طلبات تحتاج إجراء</h2><p class="help">تدفق بسيط: قبول ← تجهيز ← تسليم للمندوب.</p>
          <div class="orders" id="ordersList">
            <div class="order" data-order="WS-2048"><div class="order-top"><strong>طلب #WS-2048</strong><span class="badge">بانتظار القبول</span></div><small>وجبة برجر شريت · الدفع عند الاستلام · 315 ج.م</small><div class="order-actions"><button class="btn primary small" data-order-action="accept">قبول وتجهيز</button><button class="btn light small" data-order-action="details">عرض التفاصيل</button></div></div>
            <div class="order" data-order="WS-2051"><div class="order-top"><strong>طلب #WS-2051</strong><span class="badge">قيد التجهيز</span></div><small>3 منتجات بقالة · دفع إلكتروني مؤكد · 185 ج.م</small><div class="order-actions"><button class="btn primary small" data-order-action="ready">جاهز للمندوب</button></div></div>
          </div>
        </article>
        <article class="card wide">
          <h2>ملخص اليوم</h2><p class="help">أرقام تشغيلية تجريبية تساعدك على المتابعة السريعة.</p>
          <div class="stats"><div class="stat"><span>طلبات اليوم</span><strong>12</strong></div><div class="stat"><span>قيد التجهيز</span><strong>2</strong></div><div class="stat"><span>إيراد اليوم</span><strong>2,840 ج.م</strong></div></div>
        </article>
      </section>
    </main>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script>
    (function(){
      var $=function(s){return document.querySelector(s)}, settingsKey="khalasaMerchantSettingsV3", productsKey="khalasaMerchantProductsV3";
      function parse(v,f){try{return JSON.parse(v)||f}catch(e){return f}}
      function notify(message,error){var t=$("#toast");t.textContent=message;t.className="toast show"+(error?" error":"");setTimeout(function(){t.className="toast"},3600)}
      function map(coords){var link=$("#mapLink");if(!coords){link.hidden=true;return}link.href="https://www.google.com/maps?q="+coords.lat+","+coords.lng;link.hidden=false}
      function locationSummary(s){var text=(s.address||"عنوان تفصيلي غير مُدخل")+" · "+(s.city||"")+"، "+(s.governorate||"")+" · نطاق البيع "+(s.radius||5)+" كم";if(s.coords){text+=" · GPS: "+s.coords.lat.toFixed(5)+", "+s.coords.lng.toFixed(5)}return text}
      function loadSettings(){var s=parse(localStorage.getItem(settingsKey),{});["governorate","city","address","deliveryRadius","minimumOrder"].forEach(function(id){if(s[id]!==undefined)$("#"+id).value=s[id]});if(s.coords){$("#locationStatus").textContent="تم تثبيت موقع المحل عبر GPS";map(s.coords)}if(s.agreement){$("#agreement").checked=true;$("#agreementStatus").textContent="تم حفظ الموافقة التجريبية محلياً. يلزم التحقق الإداري قبل التفعيل النهائي."}if(Object.keys(s).length)$("#gpsSummary").textContent=locationSummary({governorate:s.governorate,city:s.city,address:s.address,radius:s.deliveryRadius,coords:s.coords})}
      function saveSettings(){var old=parse(localStorage.getItem(settingsKey),{});var data={governorate:$("#governorate").value,city:$("#city").value.trim(),address:$("#address").value.trim(),deliveryRadius:$("#deliveryRadius").value,minimumOrder:$("#minimumOrder").value,coords:old.coords||null,agreement:$("#agreement").checked,updatedAt:new Date().toISOString()};localStorage.setItem(settingsKey,JSON.stringify(data));$("#gpsSummary").textContent=locationSummary({governorate:data.governorate,city:data.city,address:data.address,radius:data.deliveryRadius,coords:data.coords});notify("تم حفظ عنوان المحل ونطاق البيع")}
      $("#locationForm").addEventListener("submit",function(e){e.preventDefault();saveSettings()});
      $("#locateBtn").addEventListener("click",function(){if(!navigator.geolocation){notify("المتصفح لا يدعم GPS. أدخل العنوان يدوياً.",true);return}var btn=this;btn.disabled=true;btn.textContent="جارٍ تحديد الموقع...";navigator.geolocation.getCurrentPosition(function(p){var s=parse(localStorage.getItem(settingsKey),{});s.coords={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)};s.updatedAt=new Date().toISOString();localStorage.setItem(settingsKey,JSON.stringify(s));$("#locationStatus").textContent="تم تثبيت موقع المحل بدقة تقريبية "+s.coords.accuracy+" متر";map(s.coords);$("#gpsSummary").textContent=locationSummary({governorate:$("#governorate").value,city:$("#city").value,address:$("#address").value,radius:$("#deliveryRadius").value,coords:s.coords});notify("تم التقاط موقع GPS بنجاح");btn.disabled=false;btn.textContent="تحديث موقعي"},function(){notify("تعذر الوصول للموقع. فعّل إذن الموقع ثم أعد المحاولة أو أدخل العنوان يدوياً.",true);btn.disabled=false;btn.textContent="تحديد موقعي الآن"},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})});
      function esc(v){return String(v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
      function renderProducts(){var list=parse(localStorage.getItem(productsKey),[]),root=$("#productList");if(!list.length){root.innerHTML='<div class="hint">لم تضف مواد بعد. أضف أول مادة لتظهر هنا.</div>';return}root.innerHTML=list.slice().reverse().map(function(p){return '<div class="product"><span class="picon">'+(p.category==="خضار وفواكه"?"🥬":"▦")+'</span><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.category)+' · متاح: '+esc(p.stock)+'</small></div><span class="price">'+esc(p.price)+' ج.م</span></div>'}).join("")}
      $("#productForm").addEventListener("submit",function(e){e.preventDefault();var products=parse(localStorage.getItem(productsKey),[]);products.push({name:$("#productName").value.trim(),category:$("#productCategory").value,price:$("#productPrice").value,stock:$("#productStock").value,createdAt:new Date().toISOString()});localStorage.setItem(productsKey,JSON.stringify(products));this.reset();$("#productStock").value=1;renderProducts();notify("تمت إضافة المادة بنجاح")});
      $("#agreement").addEventListener("change",function(){var s=parse(localStorage.getItem(settingsKey),{});s.agreement=this.checked;s.updatedAt=new Date().toISOString();localStorage.setItem(settingsKey,JSON.stringify(s));$("#agreementStatus").textContent=this.checked?"تم حفظ الموافقة التجريبية محلياً. يلزم التحقق الإداري قبل التفعيل النهائي.":"لم تتم الموافقة بعد. لا يتم التفعيل النهائي قبل التحقق الإداري وربط الخادم."});
      document.querySelectorAll("[data-order-action]").forEach(function(b){b.addEventListener("click",function(){var order=this.closest(".order"),badge=order.querySelector(".badge"),action=this.dataset.orderAction;if(action==="accept"){badge.textContent="قيد التجهيز";this.textContent="جاهز للمندوب";this.dataset.orderAction="ready";notify("تم قبول الطلب وبدء التجهيز")}else if(action==="ready"){badge.textContent="جاهز للاستلام";order.classList.add("done");this.remove();notify("الطلب جاهز لإسناده إلى المندوب")}else{notify("تفاصيل الطلب ستظهر بعد ربطها بالخادم")}})});
      loadSettings();renderProducts();
    })();
  </script>
<script src="merchant-beta.js"></script>
<link rel="stylesheet" href="khalasa-upgrade-20260817.css">
<script src="partner-documents-20260913.js"></script>
<script src="khalasa-upgrade-20260817.js"></script>
</body>
</html>
