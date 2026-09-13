(function () {
  const merchantSection = document.getElementById('admin-partners');
  const merchantNav = document.querySelector('[data-admin-page="partners"]');
  if (!merchantSection || !merchantNav || document.getElementById('admin-riders')) return;

  merchantNav.innerHTML = '🏪 <span>المحلات</span>';
  if (window.adminTitles) window.adminTitles.partners = 'المحلات';
  const riderNav = document.createElement('button');
  riderNav.dataset.adminPage = 'riders';
  riderNav.innerHTML = '🛵 <span>المندوبون</span>';
  riderNav.addEventListener('click', function () { window.adminPage('riders', riderNav); });
  merchantNav.insertAdjacentElement('afterend', riderNav);

  const riderSection = document.createElement('section');
  riderSection.className = 'admin-page';
  riderSection.id = 'admin-riders';
  riderSection.innerHTML = '<div class="panel"><div class="panel-head"><div><h2>المندوبون</h2><p>حسابات المندوبين وحالة استقبال الطلبات.</p></div><button class="table-btn" type="button" id="refreshRiders">تحديث ↻</button></div><div class="table-wrap"><table><thead><tr><th>الاسم</th><th>النوع</th><th>الحالة</th><th>النطاق</th><th>إجراء</th></tr></thead><tbody id="liveRidersBody"><tr><td colspan="5">جارٍ التحميل...</td></tr></tbody></table></div></div>';
  document.querySelector('main').appendChild(riderSection);
  riderSection.querySelector('.panel').insertAdjacentHTML('beforebegin','<section class="panel" style="margin-bottom:16px"><div class="panel-head"><div><h2>طلبات انضمام المندوبين</h2><p>طلبات التسجيل الذاتي منفصلة عن ترشيحات المحلات، ولا يتم التشغيل قبل موافقة الإدارة.</p></div><button class="table-btn" type="button" id="refreshRiderApplications">تحديث ↻</button></div><div id="riderApplications"><p class="loading">جارٍ تحميل الطلبات...</p></div></section>');

  const base = window.KHALASA_API_BASE_URL || location.origin;
  const merchantBody = merchantSection.querySelector('tbody');
  const riderBody = document.getElementById('liveRidersBody');
  const text = value => String(value == null ? '' : value);
  function cell(value) { const td = document.createElement('td'); td.textContent = text(value); return td; }
  function statusCell(label, active) { const td = document.createElement('td'), span = document.createElement('span'); span.className = 'tag ' + (active ? 'active-tag' : 'trial-tag'); span.textContent = label; td.appendChild(span); return td; }
  function actionCell(message) { const td = document.createElement('td'), button = document.createElement('button'); button.className = 'table-btn'; button.type = 'button'; button.textContent = 'عرض'; button.addEventListener('click', () => window.toast(message)); td.appendChild(button); return td; }
  function emptyRow(body, message) { const tr = document.createElement('tr'), td = cell(message); td.colSpan = 5; tr.appendChild(td); body.appendChild(tr); }

  async function loadSeparatedPartners() {
    try {
      const response = await fetch(base + '/v1/admin/partners', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('khalasaStaffToken') || '') } });
      if (!response.ok) throw new Error('load failed');
      const data = await response.json();
      merchantBody.replaceChildren(); riderBody.replaceChildren();
      (data.merchants || []).forEach(merchant => {
        const tr = document.createElement('tr'), name = cell(merchant.display_name), small = document.createElement('small');
        small.style.display = 'block'; small.textContent = [merchant.owner_name, merchant.phone].filter(Boolean).join(' · '); name.appendChild(small);
        tr.append(name, cell(merchant.category), statusCell(merchant.is_accepting_orders ? 'نشط' : 'متوقف', merchant.is_accepting_orders), cell([merchant.governorate, merchant.city_name].filter(Boolean).join('، ')), actionCell('ملف المحل متصل بقاعدة البيانات'));
        merchantBody.appendChild(tr);
      });
      (data.riders || []).forEach(rider => {
        const tr = document.createElement('tr'), name = cell(rider.full_name), small = document.createElement('small');
        small.style.display = 'block'; small.textContent = text(rider.phone); name.appendChild(small);
        tr.append(name, cell('مندوب'), statusCell(rider.is_available ? 'متاح' : 'غير متاح', rider.is_available), cell([rider.governorate, rider.city_name].filter(Boolean).join('، ')), actionCell('ملف المندوب متصل بقاعدة البيانات'));
        riderBody.appendChild(tr);
      });
      if (!merchantBody.children.length) emptyRow(merchantBody, 'لا توجد محلات بعد.');
      if (!riderBody.children.length) emptyRow(riderBody, 'لا يوجد مندوبون بعد.');
    } catch (_) {
      merchantBody.replaceChildren(); riderBody.replaceChildren();
      emptyRow(merchantBody, 'تعذر تحميل المحلات.'); emptyRow(riderBody, 'تعذر تحميل المندوبين.');
    }
  }
  async function loadRiderApplications() {
    const box=document.getElementById('riderApplications');
    try{
      const response=await fetch(base+'/v1/admin/rider-applications',{headers:{Authorization:'Bearer '+(localStorage.getItem('khalasaStaffToken')||'')}});
      if(!response.ok)throw new Error(); const data=await response.json(); box.replaceChildren();
      const pending=(data.applications||[]).filter(item=>item.status==='pending');
      pending.forEach(item=>{const card=document.createElement('article');card.className='city-user-card';const info=document.createElement('div');const title=document.createElement('b');title.textContent=item.full_name;const details=document.createElement('small');details.textContent=[item.phone,item.governorate,item.city_name].filter(Boolean).join(' · ');const source=document.createElement('small');source.textContent=item.source==='merchant'?'🏪 ترشيح محل'+(item.nominating_merchant?' — '+item.nominating_merchant:''):'📱 تسجيل ذاتي بالجوال';info.append(title,details,source);const actions=document.createElement('div');actions.className='city-user-actions';const approve=document.createElement('button');approve.className='primary';approve.textContent='✓ موافقة';approve.onclick=()=>reviewRiderApplication(item.id,'approved');const reject=document.createElement('button');reject.className='table-btn';reject.textContent='رفض';reject.onclick=()=>reviewRiderApplication(item.id,'rejected');actions.append(approve,reject);card.append(info,actions);box.append(card)});
      if(!pending.length){const p=document.createElement('p');p.className='loading';p.textContent='لا توجد طلبات انضمام معلقة.';box.append(p)}
    }catch(_){box.textContent='تعذر تحميل طلبات الانضمام.'}
  }
  async function reviewRiderApplication(id,status){const response=await fetch(base+'/v1/admin/rider-applications/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.getItem('khalasaStaffToken')||'')},body:JSON.stringify({status})});if(!response.ok)return window.toast('تعذر تحديث الطلب');window.toast(status==='approved'?'تم اعتماد المندوب':'تم رفض الطلب');await Promise.all([loadRiderApplications(),loadSeparatedPartners()]);}
  const refreshRiders = document.getElementById('refreshRiders');
  const addRider = document.createElement('button');
  addRider.className = 'primary'; addRider.type = 'button'; addRider.textContent = '+ إضافة مندوب';
  refreshRiders.insertAdjacentElement('beforebegin', addRider);
  document.body.insertAdjacentHTML('beforeend', '<section id="riderAddModal" class="apl-modal"><form id="riderAddForm" class="apl-card"><h2>إضافة مندوب جديد</h2><p>أنشئ حساب المندوب ورمز دخوله إلى تطبيق المندوب.</p><div class="apl-grid"><label>اسم المندوب<input id="riderAddName" required></label><label>رقم الهاتف<input id="riderAddPhone" inputmode="numeric" pattern="01[0-9]{9}" placeholder="01xxxxxxxxx" required></label><label>المدينة<select id="riderAddCity" required></select></label><label>وسيلة التوصيل<select id="riderAddVehicle"><option value="motorcycle">دراجة نارية</option><option value="bicycle">دراجة</option><option value="car">سيارة</option></select></label><label>رمز دخول قوي<input id="riderAddCode" type="password" minlength="10" autocomplete="new-password" required></label></div><p id="riderAddStatus" class="apl-error" aria-live="polite"></p><div class="apl-actions"><button type="button" class="table-btn" id="riderAddClose">إلغاء</button><button class="primary">إنشاء المندوب</button></div></form></section>');
  const riderModal = document.getElementById('riderAddModal'), riderForm = document.getElementById('riderAddForm'), riderStatus = document.getElementById('riderAddStatus');
  addRider.addEventListener('click', async function () {
    riderStatus.textContent = '';
    try {
      const response = await fetch(base + '/v1/admin/cities', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('khalasaStaffToken') || '') } });
      if (!response.ok) throw new Error();
      const data = await response.json(), select = document.getElementById('riderAddCity');
      select.replaceChildren();
      (data.cities || []).filter(city => city.is_active).forEach(city => { const option = document.createElement('option'); option.value = city.id; option.textContent = city.governorate + ' — ' + city.name; select.appendChild(option); });
      riderModal.classList.add('show');
    } catch (_) { window.toast('تعذر تحميل المدن'); }
  });
  document.getElementById('riderAddClose').addEventListener('click', () => riderModal.classList.remove('show'));
  riderForm.addEventListener('submit', async function (event) {
    event.preventDefault(); riderStatus.textContent = 'جارٍ إنشاء المندوب...';
    const submit = riderForm.querySelector('.apl-actions .primary'); submit.disabled = true;
    try {
      const response = await fetch(base + '/v1/admin/riders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('khalasaStaffToken') || '') }, body: JSON.stringify({ fullName: document.getElementById('riderAddName').value.trim(), phone: document.getElementById('riderAddPhone').value.trim(), cityId: document.getElementById('riderAddCity').value, vehicleType: document.getElementById('riderAddVehicle').value, accessCode: document.getElementById('riderAddCode').value }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'CREATE_FAILED');
      riderModal.classList.remove('show'); riderForm.reset(); window.toast('تم إنشاء المندوب بنجاح'); await loadSeparatedPartners();
    } catch (error) {
      riderStatus.textContent = error.message === 'PHONE_BELONGS_TO_ANOTHER_ROLE' ? 'رقم الهاتف مستخدم لحساب آخر.' : error.message === 'RIDER_ALREADY_EXISTS' ? 'هذا المندوب موجود بالفعل.' : 'تعذر إنشاء المندوب. راجع البيانات وحاول مجددًا.';
    } finally { submit.disabled = false; }
  });
  refreshRiders.addEventListener('click', loadSeparatedPartners);
  document.getElementById('refreshRiderApplications').addEventListener('click',loadRiderApplications);
  const previousAdminPage = window.adminPage;
  window.adminPage = function (page, button) { previousAdminPage(page, button); if (page === 'partners') loadSeparatedPartners(); if(page==='riders')Promise.all([loadSeparatedPartners(),loadRiderApplications()]); };
  setTimeout(()=>Promise.all([loadSeparatedPartners(),loadRiderApplications()]), 950);
})();
