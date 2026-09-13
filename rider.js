(function () {
  const API = 'https://khalasa-api.onrender.com/v1';
  const tokenKey = 'khalasaRiderToken';
  let active = null;

  const style = document.createElement('style');
  style.textContent = '.kr-open{position:fixed;left:14px;bottom:76px;z-index:80;border:0;border-radius:14px;padding:13px 18px;background:#ff6b35;color:#fff;font:800 14px Cairo;box-shadow:0 10px 25px #1234}.kr-live{position:fixed;inset:0;z-index:10000;background:#f4f9f6;display:none;overflow:auto;padding:22px;direction:rtl;font-family:Cairo,Arial}.kr-live.show{display:block}.kr-card{max-width:720px;margin:auto;background:#fff;border:1px solid #d6e5dd;border-radius:18px;padding:20px}.kr-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.kr-card input,.kr-card select{width:100%;box-sizing:border-box;padding:13px;margin:7px 0;border:1px solid #c9d9d1;border-radius:10px;background:#fff}.kr-btn{border:0;border-radius:10px;padding:11px 15px;background:#137e59;color:#fff;font-weight:800;cursor:pointer}.kr-btn.alt{background:#edf4f0;color:#164c39}.kr-order{border:1px solid #d8e6df;border-radius:13px;padding:14px;margin:12px 0}.kr-note{color:#697a72;font-size:13px}.kr-error{color:#b42318}.kr-otp{margin-top:12px}.kr-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.kr-register{display:none}.kr-register.show{display:block}.kr-pending{background:#fff7dc;border:1px solid #eed68a;border-radius:12px;padding:12px;margin-top:10px}';
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', '<button id="krOpen" class="kr-open">طلبات المندوب الحقيقية</button><section id="krLive" class="kr-live"><div class="kr-card"><div class="kr-row"><h2>طلبات المندوب</h2><button id="krClose" class="kr-btn alt">إغلاق</button></div><form id="krLogin"><input id="krPhone" inputmode="numeric" pattern="01[0-9]{9}" placeholder="رقم هاتف المندوب" required><input id="krCode" type="password" minlength="10" placeholder="رمز الدخول" required><button class="kr-btn">دخول آمن</button></form><div id="krSession" hidden><div class="kr-row"><b id="krName"></b><button id="krLogout" class="kr-btn alt">تسجيل الخروج</button></div><p id="krStatus" class="kr-note"></p><div id="krOrders"></div></div><p id="krMessage" class="kr-note"></p></div></section>');
  const $ = id => document.getElementById(id);
  $('krSession').insertAdjacentHTML('afterbegin','<div class="kr-row" style="margin:12px 0"><button id="krAvailability" class="kr-btn alt" type="button">حالة استقبال الطلبات</button><button id="krNotifications" class="kr-btn alt" type="button">🔔 تفعيل التنبيهات</button></div>');
  $('krLogin').insertAdjacentHTML('beforebegin','<div class="kr-tabs"><button id="krLoginTab" class="kr-btn" type="button">تسجيل الدخول</button><button id="krRegisterTab" class="kr-btn alt" type="button">تسجيل مندوب جديد</button></div><form id="krRegister" class="kr-register"><input id="krRegisterName" placeholder="الاسم الكامل" required><input id="krRegisterPhone" inputmode="numeric" pattern="01[0-9]{9}" placeholder="رقم الهاتف 01xxxxxxxxx" required><select id="krRegisterGovernorate" required><option value="">اختر المحافظة</option></select><select id="krRegisterCity" required disabled><option value="">اختر المدينة بعد المحافظة</option></select><select id="krRegisterVehicle"><option value="motorcycle">دراجة نارية</option><option value="bicycle">دراجة</option><option value="car">سيارة</option></select><input id="krRegisterCode" type="password" minlength="10" placeholder="أنشئ رمز دخول من 10 خانات على الأقل" required><button class="kr-btn">إرسال طلب الانضمام</button><p class="kr-note">يمكنك تسجيل الطلب الآن، ولن يبدأ الحساب في استقبال الطلبات إلا بعد موافقة الإدارة.</p></form>');
  const token = () => sessionStorage.getItem(tokenKey) || '';
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('content-type', 'application/json');
    if (token()) headers.set('authorization', `Bearer ${token()}`);
    const response = await fetch(API + path, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'API_REQUEST_FAILED');
    return body;
  }
  function node(tag, value) { const item = document.createElement(tag); item.textContent = String(value ?? ''); return item; }
  function message(value, error = false) { $('krMessage').textContent = value; $('krMessage').className = error ? 'kr-note kr-error' : 'kr-note'; }
  $('krLoginTab').onclick=()=>{$('krLogin').hidden=false;$('krRegister').classList.remove('show');};
  let registrationCities=[];
  function fillRegistrationCities(){const governorate=$('krRegisterGovernorate').value,select=$('krRegisterCity');select.innerHTML='<option value="">اختر المدينة</option>';for(const city of registrationCities.filter(item=>item.governorate===governorate)){const option=document.createElement('option');option.value=city.id;option.textContent=city.name;select.append(option)}select.disabled=!governorate;}
  $('krRegisterGovernorate').onchange=fillRegistrationCities;
  $('krRegisterTab').onclick=async()=>{$('krLogin').hidden=true;$('krRegister').classList.add('show');try{const data=await request('/public/cities');registrationCities=data.cities||[];const select=$('krRegisterGovernorate');select.innerHTML='<option value="">اختر المحافظة</option>';for(const governorate of [...new Set(registrationCities.map(city=>city.governorate))]){const option=document.createElement('option');option.value=governorate;option.textContent=governorate;select.append(option)}fillRegistrationCities()}catch(_){message('تعذر تحميل المحافظات والمدن الآن.',true)}};
  $('krRegister').onsubmit=async event=>{event.preventDefault();message('جارٍ إرسال طلب الانضمام…');const button=event.target.querySelector('button');button.disabled=true;try{await request('/rider/applications',{method:'POST',body:JSON.stringify({fullName:$('krRegisterName').value.trim(),phone:$('krRegisterPhone').value.trim(),cityId:$('krRegisterCity').value,vehicleType:$('krRegisterVehicle').value,accessCode:$('krRegisterCode').value})});event.target.reset();event.target.innerHTML='<div class="kr-pending"><b>تم إرسال طلبك بنجاح</b><p>حالة الطلب: بانتظار مراجعة الإدارة. استخدم بياناتك لتسجيل الدخول بعد الموافقة.</p></div>';message('');}catch(error){message(error.message==='PHONE_ALREADY_REGISTERED_OR_PENDING'?'رقم الهاتف مسجل أو لديه طلب قيد المراجعة.':'تعذر إرسال الطلب؛ راجع البيانات.',true)}finally{button.disabled=false}};
  async function loadOffers() {
    const result = await request('/rider/offers');
    const box = $('krOrders'); box.replaceChildren();
    for (const order of result.orders || []) {
      const card = document.createElement('article'); card.className = 'kr-order';
      card.append(node('b', order.public_code), node('p', `عنوان التسليم: ${order.delivery_address}`), node('p', `أجرة التوصيل: ${Number(order.delivery_fee)} ج.م`));
      const button = node('button', 'قبول الطلب'); button.className = 'kr-btn';
      button.onclick = () => accept(order); card.append(button); box.append(card);
    }
    if (!box.children.length) box.append(node('p', 'لا توجد طلبات متاحة الآن.'));
    $('krStatus').textContent = `آخر تحديث: ${new Date().toLocaleTimeString('ar-EG')}`;
  }
  let knownOfferIds=new Set(),refreshTimer=null,currentAvailability=false;
  function directionsUrl(lat,lng,address){const destination=lat&&lng?`${lat},${lng}`:address;return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination||'');}
  function navigationButton(label,lat,lng,address){const button=node('button',label);button.className='kr-btn alt';button.onclick=()=>window.open(directionsUrl(lat,lng,address),'_blank','noopener');return button;}
  async function loadDashboard(){
    const result=await request('/rider/workspace'),rider=result.rider,offers=result.offers||[];
    $('krName').textContent=rider.full_name;currentAvailability=rider.is_available===true;$('krAvailability').textContent=currentAvailability?'🟢 متاح لاستقبال الطلبات':'⚪ غير متاح';$('krAvailability').className=currentAvailability?'kr-btn':'kr-btn alt';
    $('krStatus').textContent=`${rider.governorate||''} · ${rider.city_name||''} · مكتمل اليوم: ${Number(result.stats.completed_today||0)} · الأرباح: ${Number(result.stats.earnings_today||0)} ج.م`;
    if(result.activeOrder){active=result.activeOrder;renderActive(active.status);return;}
    const newOffers=offers.filter(order=>!knownOfferIds.has(order.id));
    if(newOffers.length&&knownOfferIds.size&&Notification.permission==='granted')new Notification('طلب توصيل جديد',{body:`${newOffers[0].merchant_name} — ${Number(newOffers[0].delivery_fee)} ج.م`});
    knownOfferIds=new Set(offers.map(order=>order.id));const box=$('krOrders');box.replaceChildren();
    if(!currentAvailability){box.append(node('p','أنت غير متاح الآن. فعّل استقبال الطلبات لعرض الطلبات القريبة.'));return;}
    for(const order of offers){const card=document.createElement('article');card.className='kr-order';card.append(node('b',order.public_code),node('p',`الاستلام: ${order.merchant_name}`),node('p',`عنوان المحل: ${order.merchant_address}`),node('p',`عنوان التسليم: ${order.delivery_address}`),node('p',`أجرة التوصيل: ${Number(order.delivery_fee)} ج.م`));const row=document.createElement('div');row.className='kr-row';const acceptButton=node('button','قبول الطلب');acceptButton.className='kr-btn';acceptButton.onclick=()=>accept(order);row.append(acceptButton,navigationButton('🧭 اتجاهات المحل',order.merchant_lat,order.merchant_lng,order.merchant_address));card.append(row);box.append(card)}
    if(!box.children.length)box.append(node('p','لا توجد طلبات متاحة الآن. سيتم التحديث تلقائيًا.'));
  }
  async function loadDashboardLegacy(){const result=await request('/rider/dashboard');$('krName').textContent=result.rider.full_name;$('krStatus').textContent=`${result.rider.city_name||''} · مكتمل اليوم: ${Number(result.stats.completed_today||0)} · الأرباح: ${Number(result.stats.earnings_today||0)} ج.م`;if(result.activeOrder){active=result.activeOrder;renderActive(active.status);return}const box=$('krOrders');box.replaceChildren();for(const order of result.offers||[]){const card=document.createElement('article');card.className='kr-order';card.append(node('b',order.public_code),node('p',`الاستلام: ${order.merchant_name}`),node('p',`عنوان التسليم: ${order.delivery_address}`),node('p',`أجرة التوصيل: ${Number(order.delivery_fee)} ج.م`));const button=node('button','قبول الطلب');button.className='kr-btn';button.onclick=()=>accept(order);card.append(button);box.append(card)}if(!box.children.length)box.append(node('p','لا توجد طلبات متاحة الآن.'))}
  async function accept(order) {
    try {
      await request(`/orders/${encodeURIComponent(order.id)}/rider-accept`, { method: 'POST', body: '{}' });
      message('تم قبول الطلب وإسناده إليك.'); await loadDashboard();
    } catch (error) { message(error.message === 'ORDER_ALREADY_TAKEN_OR_OUTSIDE_CITY' ? 'سبق مندوب آخر إلى الطلب.' : 'تعذر قبول الطلب.', true); }
  }
  function renderActive(stage) {
    const box = $('krOrders'); box.replaceChildren(); const card = document.createElement('article'); card.className = 'kr-order';
    card.append(node('b', active.public_code), node('p', `عنوان التسليم: ${active.delivery_address}`));
    const button = node('button', stage === 'assigned' ? 'تم الاستلام من المحل' : 'تأكيد التسليم'); button.className = 'kr-btn';
    if (stage === 'assigned') button.onclick = pickup;
    else {
      const otp = document.createElement('input'); otp.id = 'krOtp'; otp.className = 'kr-otp'; otp.inputMode = 'numeric'; otp.maxLength = 4; otp.placeholder = 'رمز التسليم المكوّن من 4 أرقام'; card.append(otp); button.onclick = deliver;
    }
    const navigation=document.createElement('div');navigation.className='kr-row';navigation.style.margin='10px 0';navigation.append(stage==='assigned'?navigationButton('🧭 الملاحة إلى المحل',active.merchant_lat,active.merchant_lng,active.merchant_address):navigationButton('🧭 الملاحة إلى العميل',active.delivery_lat,active.delivery_lng,active.delivery_address));
    if(stage==='assigned'&&active.merchant_phone){const call=node('a','📞 اتصال بالمحل');call.className='kr-btn alt';call.href='tel:'+active.merchant_phone;navigation.append(call)}else if(active.customer_phone){const call=node('a','📞 اتصال بالعميل');call.className='kr-btn alt';call.href='tel:'+active.customer_phone;navigation.append(call)}
    card.append(navigation,button); box.append(card);
  }
  async function pickup() { try { await request(`/orders/${encodeURIComponent(active.id)}/pickup`, { method: 'POST', body: '{}' }); renderActive('picked_up'); message('تم تسجيل استلام الطلب. اطلب رمز التسليم من العميل عند الوصول.'); } catch (_) { message('تعذر تسجيل استلام الطلب.', true); } }
  async function deliver() { const otp = $('krOtp').value.trim(); if (!/^\d{4}$/.test(otp)) return message('أدخل رمز تسليم صحيحًا من 4 أرقام.', true); try { await request(`/orders/${encodeURIComponent(active.id)}/deliver`, { method: 'POST', body: JSON.stringify({ otp }) }); active = null; message('تم تسليم الطلب بنجاح.'); await loadDashboard(); } catch (_) { message('رمز التسليم غير صحيح أو انتهت المحاولات.', true); } }
  $('krOpen').onclick = () => { $('krLive').classList.add('show'); if (token()) { $('krLogin').hidden = true; $('krSession').hidden = false; loadDashboard().catch(() => { sessionStorage.removeItem(tokenKey); $('krLogin').hidden = false; $('krSession').hidden = true; }); } };
  $('krClose').onclick = () => $('krLive').classList.remove('show');
  $('krLogout').onclick = () => { sessionStorage.removeItem(tokenKey); $('krLogin').hidden = false; $('krSession').hidden = true; };
  $('krAvailability').onclick=async()=>{try{const result=await request('/rider/availability',{method:'PATCH',body:JSON.stringify({isAvailable:!currentAvailability})});currentAvailability=result.rider.is_available;message(currentAvailability?'تم تشغيل استقبال الطلبات.':'تم إيقاف استقبال الطلبات.');await loadDashboard()}catch(_){message('تعذر تغيير حالة العمل.',true)}};
  $('krNotifications').onclick=async()=>{if(!('Notification' in window))return message('المتصفح لا يدعم الإشعارات.',true);const permission=await Notification.requestPermission();message(permission==='granted'?'تم تفعيل تنبيهات الطلبات الجديدة.':'لم يتم السماح بالإشعارات.',permission!=='granted')};
  $('krLogin').onsubmit = async event => { event.preventDefault(); message('جارٍ تسجيل الدخول…'); try { const result = await request('/partner/login', { method: 'POST', body: JSON.stringify({ phone: $('krPhone').value.trim(), accessCode: $('krCode').value }) }); if (result.user.role !== 'rider') throw new Error('RIDER_REQUIRED'); sessionStorage.setItem(tokenKey, result.token); $('krName').textContent = result.user.fullName; $('krLogin').hidden = true; $('krSession').hidden = false; message(''); await loadDashboard(); } catch (_) { message('بيانات دخول المندوب غير صحيحة.', true); } };
  function startRefresh(){if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(token()&&!document.hidden)loadDashboard().catch(()=>{})},15000)}
  startRefresh();if(token())setTimeout(()=>$('krOpen').click(),0);
})();
