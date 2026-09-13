(function () {
  'use strict';

  const path = location.pathname.toLowerCase();
  const role = path.includes('merchant') ? 'merchant' : path.includes('rider') ? 'rider' : path.includes('customer') ? 'customer' : null;
  if (!role) return;

  const labels = {
    customer: { title: 'سجّل أولًا لإتمام الطلب', detail: 'يجب تسجيل حساب العميل وتوثيق رقم الهاتف عبر رمز OTP قبل إنشاء أي طلب.', action: 'تسجيل العميل' },
    merchant: { title: 'فعّل حساب المحل أولًا', detail: 'يجب استكمال تسجيل المحل والمستندات والحصول على اعتماد الإدارة قبل عرض المنتجات أو قبول الطلبات.', action: 'استكمال تسجيل المحل' },
    rider: { title: 'فعّل حساب المندوب أولًا', detail: 'يجب استكمال بيانات المندوب والمستندات والحصول على اعتماد الإدارة قبل قبول أو توصيل أي طلب.', action: 'استكمال تسجيل المندوب' }
  };

  const storageKeys = [
    `khalasa_registration_${role}`,
    `khalasa_${role}_registration`,
    `khalasa_${role}_profile`,
    `wasla_${role}_profile`,
    `registration_${role}`
  ];

  function parse(value) {
    if (!value) return null;
    try { return JSON.parse(value); } catch (_) { return null; }
  }

  function profile() {
    for (const key of storageKeys) {
      const value = parse(localStorage.getItem(key));
      if (value && typeof value === 'object') return value;
    }
    return {};
  }

  function allowed() {
    const p = profile();
    const registered = p.registered === true || p.registrationComplete === true || p.status === 'registered' || p.status === 'approved';
    if (!registered) return false;
    if (role === 'customer') return p.phoneVerified === true || p.otpVerified === true || p.is_phone_verified === true;
    return p.approved === true || p.verification === 'approved' || p.status === 'approved';
  }

  const operationWords = {
    customer: /(?:اطلب|إتمام الطلب|تأكيد الطلب|الدفع|اشتر|شراء|checkout|order|pay|buy)/i,
    merchant: /(?:قبول الطلب|استقبال الطلبات|بدء البيع|حفظ المنتج|إضافة منتج|تسجيل منتج|فتح المحل|accept order|start selling|save product|add product)/i,
    rider: /(?:قبول الطلب|استلام الطلب|بدء الرحلة|تم الاستلام|تم التوصيل|إنهاء التوصيل|accept order|pickup|start trip|delivered|complete delivery)/i
  };
  const safeWords = /(?:تسجيل|دخول|otp|تحقق|توثيق|مستند|شروط|خصوصية|register|login|verify|document)/i;

  function operationTarget(node) {
    const target = node && node.closest ? node.closest('button,a,input[type="submit"],[role="button"],form') : null;
    if (!target) return null;
    const text = [target.textContent, target.value, target.id, target.name, target.className, target.getAttribute('href'), target.getAttribute('data-action')].filter(Boolean).join(' ');
    return operationWords[role].test(text) && !safeWords.test(text) ? target : null;
  }

  function registrationLink() {
    const candidates = role === 'customer'
      ? ['#register', '#auth', 'customer-register.html', 'customer.html#register']
      : role === 'merchant'
        ? ['#registration', '#verification', 'merchant-register.html', 'merchant-dashboard.html#registration']
        : ['#registration', '#verification', 'rider-register.html', 'rider-app.html#registration'];
    return candidates[0];
  }

  function showGate() {
    const old = document.getElementById('khalasa-registration-gate');
    if (old) old.remove();
    const copy = labels[role];
    const overlay = document.createElement('div');
    overlay.id = 'khalasa-registration-gate';
    overlay.dir = 'rtl';
    overlay.innerHTML = `<div class="khalasa-gate-card" role="dialog" aria-modal="true" aria-labelledby="khalasa-gate-title">
      <button class="khalasa-gate-close" aria-label="إغلاق">×</button>
      <div class="khalasa-gate-icon">🔒</div>
      <h2 id="khalasa-gate-title">${copy.title}</h2>
      <p>${copy.detail}</p>
      <a class="khalasa-gate-primary" href="${registrationLink()}">${copy.action}</a>
      <button class="khalasa-gate-secondary" type="button">العودة</button>
      <small>لحمايتك وحماية جميع أطراف منصة خالصة، لا يمكن تنفيذ أي معاملة قبل التحقق.</small>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.khalasa-gate-close,.khalasa-gate-secondary').forEach(el => el.addEventListener('click', () => overlay.remove()));
  }

  const style = document.createElement('style');
  style.textContent = `#khalasa-registration-gate{position:fixed;inset:0;z-index:2147483647;background:rgba(6,32,24,.72);display:grid;place-items:center;padding:20px;font-family:inherit}#khalasa-registration-gate .khalasa-gate-card{position:relative;width:min(430px,100%);background:#fff;border-radius:24px;padding:28px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.28)}.khalasa-gate-icon{width:58px;height:58px;margin:auto;display:grid;place-items:center;border-radius:18px;background:#e8f7ef;font-size:28px}.khalasa-gate-card h2{margin:16px 0 8px;color:#103f31;font-size:24px}.khalasa-gate-card p{color:#52635d;line-height:1.8}.khalasa-gate-primary,.khalasa-gate-secondary{box-sizing:border-box;display:block;width:100%;border-radius:12px;padding:13px;margin-top:10px;font-weight:800;text-decoration:none;cursor:pointer}.khalasa-gate-primary{background:#13865f;color:white}.khalasa-gate-secondary{border:1px solid #d8e4df;background:white;color:#174b3b}.khalasa-gate-card small{display:block;margin-top:14px;color:#71817b;line-height:1.6}.khalasa-gate-close{position:absolute;left:14px;top:10px;border:0;background:none;font-size:28px;color:#66756f;cursor:pointer}`;
  document.head.appendChild(style);

  document.addEventListener('click', function (event) {
    if (allowed() || !operationTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showGate();
  }, true);

  document.addEventListener('submit', function (event) {
    const target = operationTarget(event.target) || operationTarget(event.submitter);
    if (allowed() || !target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showGate();
  }, true);

  window.KhalasaRegistrationGate = { role, allowed, require: function () { if (allowed()) return true; showGate(); return false; } };
})();
