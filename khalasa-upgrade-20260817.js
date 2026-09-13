<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0f5a4d" />
  <meta name="description" content="خالصة — منصة محلية تجمع العميل والمحل والمندوب والإدارة في نظام واحد." />
  <title>خالصة | كل طلب يوصل بالطريقة الصح</title>
  <style>
    :root {
      --ink: #102b27;
      --green: #0d6b59;
      --green-dark: #08463b;
      --mint: #dff5eb;
      --orange: #ff7040;
      --cream: #fffdf8;
      --line: #e9e4da;
      --muted: #6c7774;
      --shadow: 0 18px 45px rgba(16, 43, 39, .12);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background: #f8f5ef;
      font-family: Tahoma, Arial, sans-serif;
      line-height: 1.65;
    }
    a { color: inherit; text-decoration: none; }
    button { font: inherit; }

    .container { width: min(1160px, calc(100% - 40px)); margin: auto; }
    .announcement {
      color: #eaffe9;
      background: #073d34;
      padding: 10px 0;
      font-size: 13px;
    }
    .announcement .container {
      display: flex;
      justify-content: center;
      gap: 9px;
      align-items: center;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #78e3a1; display: inline-block; }

    header {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(255, 253, 248, .92);
      border-bottom: 1px solid rgba(233, 228, 218, .85);
      backdrop-filter: blur(14px);
    }
    .nav {
      height: 76px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 25px; font-weight: 800; color: var(--green); }
    .brand-mark {
      width: 37px; height: 37px; border-radius: 13px;
      display: grid; place-items: center;
      background: var(--orange); color: white; font-size: 24px; font-weight: 900;
      transform: rotate(-8deg);
    }
    .nav-links { display: flex; align-items: center; gap: 23px; color: #53605d; font-size: 14px; }
    .nav-links a:hover { color: var(--green); }
    .nav-actions { display: flex; align-items: center; gap: 9px; }
    .button {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      border: 1px solid transparent; border-radius: 12px; padding: 11px 17px;
      cursor: pointer; font-weight: 700; transition: .2s ease;
    }
    .button:hover { transform: translateY(-2px); }
    .button-primary { background: var(--green); color: white; box-shadow: 0 9px 18px rgba(13, 107, 89, .19); }
    .button-secondary { background: white; border-color: #dfe4de; color: var(--green-dark); }
    .menu { display: none; border: 0; background: transparent; font-size: 27px; color: var(--green-dark); cursor: pointer; }

    .hero {
      overflow: hidden;
      position: relative;
      padding: 72px 0 65px;
      background:
        radial-gradient(circle at 12% 12%, rgba(255, 170, 100, .26), transparent 24%),
        radial-gradient(circle at 90% 78%, rgba(92, 211, 167, .25), transparent 24%),
        #fffdf8;
    }
    .hero::before, .hero::after {
      content: ""; position: absolute; border-radius: 50%; pointer-events: none;
      border: 1px solid rgba(13, 107, 89, .09);
    }
    .hero::before { width: 390px; height: 390px; left: -190px; bottom: -260px; }
    .hero::after { width: 260px; height: 260px; right: -120px; top: -110px; }
    .hero-grid { position: relative; display: grid; grid-template-columns: 1.03fr .97fr; gap: 56px; align-items: center; }
    .eyebrow {
      display: inline-flex; gap: 7px; align-items: center;
      background: #e9f8f0; color: var(--green); border-radius: 999px;
      padding: 7px 12px; font-size: 13px; font-weight: 700;
    }
    h1 { font-size: clamp(39px, 5.2vw, 70px); letter-spacing: -2px; line-height: 1.11; margin: 17px 0; }
    h1 span { color: var(--orange); }
    .hero p { margin: 0; max-width: 570px; font-size: 18px; color: #576763; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 11px; margin-top: 26px; }
    .trust-line { display: flex; flex-wrap: wrap; gap: 17px; margin-top: 25px; color: #5f716b; font-size: 13px; }
    .trust-line span { display: inline-flex; align-items: center; gap: 6px; }

    .order-card {
      padding: 18px; border-radius: 28px; background: #103d34; color: white; box-shadow: var(--shadow);
      transform: rotate(-1.5deg);
    }
    .order-card-inner { padding: 24px; border: 1px solid rgba(255,255,255,.18); border-radius: 21px; }
    .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 23px; }
    .live { padding: 5px 9px; color: #bbf5ce; background: rgba(126,227,161,.13); border-radius: 99px; font-size: 12px; }
    .location-trigger {
      border: 0; background: rgba(255,255,255,.1); color: white; cursor: pointer;
      border-radius: 12px; padding: 8px 10px; font-size: 12px;
    }
    .mini-shop { background: #fff; color: var(--ink); border-radius: 17px; padding: 16px; }
    .mini-shop-top { display: flex; align-items: center; justify-content: space-between; gap: 13px; }
    .shop-icon { width: 47px; height: 47px; display: grid; place-items: center; border-radius: 15px; background: #fff0e8; font-size: 27px; }
    .mini-shop b { display: block; font-size: 15px; }
    .mini-shop small { color: var(--muted); font-size: 11px; }
    .mini-progress { margin: 19px 0 11px; height: 8px; background: #e7ece8; border-radius: 99px; overflow: hidden; }
    .mini-progress i { display: block; width: 67%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--orange), #ff9b55); }
    .mini-status { display: flex; justify-content: space-between; font-size: 12px; color: #4b615a; }
    .rider-pill { margin-top: 17px; padding: 12px; border-radius: 14px; background: rgba(255,255,255,.1); display: flex; align-items: center; gap: 9px; font-size: 12px; }
    .avatar { width: 31px; height: 31px; border-radius: 50%; display: grid; place-items: center; background: #ff8c5d; }

    .quick-categories { padding: 24px 0; background: white; border-bottom: 1px solid var(--line); }
    .category-scroll { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
    .category {
      min-height: 82px; padding: 12px 6px; border-radius: 17px; border: 1px solid #edf0ed;
      text-align: center; color: #34423e; background: #fff; transition: .2s;
    }
    .category:hover { border-color: #b7ddcc; transform: translateY(-3px); box-shadow: 0 9px 20px rgba(10,75,59,.08); }
    .category i { display: block; font-style: normal; font-size: 24px; margin-bottom: 3px; }
    .category span { font-size: 12px; font-weight: 700; }

    section { padding: 84px 0; }
    .section-heading { display: flex; gap: 25px; align-items: end; justify-content: space-between; margin-bottom: 30px; }
    .section-heading h2 { margin: 0; font-size: clamp(27px, 3vw, 39px); letter-spacing: -1px; }
    .section-heading p { max-width: 480px; margin: 0; color: var(--muted); font-size: 14px; }
    .apps { background: #f8f5ef; }
    .app-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 17px; }
    .app-card { position: relative; min-height: 270px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 24px; padding: 25px; background: white; transition: .22s; }
    .app-card:hover { transform: translateY(-5px); box-shadow: var(--shadow); }
    .app-card.customer { color: white; border: 0; background: linear-gradient(135deg, #0e6555, #0c4037); }
    .app-card.customer::after { content: "🛍️"; position: absolute; left: -10px; bottom: -28px; font-size: 150px; opacity: .13; transform: rotate(-15deg); }
    .app-card.merchant { background: #eef8f2; }
    .app-card.rider { background: #eaf2ff; }
    .app-card.admin { background: #fff2e8; }
    .app-card .icon { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 17px; background: rgba(255,255,255,.18); font-size: 28px; }
    .app-card:not(.customer) .icon { background: white; }
    .app-card h3 { margin: 18px 0 8px; font-size: 23px; }
    .app-card p { margin: 0; color: inherit; opacity: .75; font-size: 13px; }
    .app-link { margin-top: auto; padding-top: 20px; font-weight: 800; color: inherit; font-size: 14px; }
    .app-card.customer .app-link { color: #d8ffe9; }

    .how { background: var(--green-dark); color: white; }
    .how .section-heading p { color: #b7d8ce; }
    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
    .step { padding: 24px; border: 1px solid rgba(255,255,255,.15); border-radius: 20px; background: rgba(255,255,255,.055); }
    .step-number { display: grid; width: 39px; height: 39px; place-items: center; border-radius: 12px; color: #0e5144; background: #bdf1d5; font-weight: 900; }
    .step h3 { margin: 18px 0 6px; font-size: 18px; }
    .step p { margin: 0; color: #c5ddd5; font-size: 13px; }
    .benefits { display: grid; grid-template-columns: repeat(4, 1fr); gap: 13px; margin-top: 42px; }
    .benefit { display: flex; gap: 9px; align-items: center; padding: 13px; border-radius: 13px; background: rgba(255,255,255,.07); color: #d7eee5; font-size: 12px; }

    .cta { padding: 74px 0; }
    .cta-box { padding: 45px; overflow: hidden; position: relative; border-radius: 28px; background: #ff7141; color: white; }
    .cta-box::before { content: ""; position: absolute; width: 280px; height: 280px; border: 38px solid rgba(255,255,255,.13); border-radius: 50%; left: -100px; top: -155px; }
    .cta-content { position: relative; display: flex; gap: 25px; justify-content: space-between; align-items: center; }
    .cta h2 { margin: 0 0 8px; font-size: clamp(27px, 3.5vw, 42px); }
    .cta p { margin: 0; opacity: .9; }
    .cta .button { background: white; color: #c24721; white-space: nowrap; }

    footer { padding: 35px 0; background: #092f29; color: #d4e3de; }
    .footer { display: flex; gap: 22px; align-items: center; justify-content: space-between; }
    .footer .brand { color: white; font-size: 20px; }
    .footer .brand-mark { width: 31px; height: 31px; border-radius: 10px; font-size: 19px; }
    .footer p { margin: 0; font-size: 12px; color: #a7c3ba; }

    @media (max-width: 860px) {
      .nav-links { display: none; }
      .menu { display: block; }
      .nav-links.open {
        display: flex; position: absolute; top: 76px; right: 0; left: 0; padding: 18px 20px;
        flex-direction: column; align-items: flex-start; background: #fffdf8; border-bottom: 1px solid var(--line);
      }
      .nav-actions .button-secondary { display: none; }
      .hero { padding-top: 47px; }
      .hero-grid { grid-template-columns: 1fr; gap: 32px; }
      .order-card { max-width: 520px; width: 100%; margin: auto; }
      .category-scroll { display: flex; overflow-x: auto; padding-bottom: 3px; }
      .category { min-width: 91px; }
      .app-grid { grid-template-columns: repeat(2, 1fr); }
      .app-card.customer { grid-column: span 2; }
      .benefits { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 560px) {
      .container { width: min(100% - 28px, 1160px); }
      .announcement { font-size: 11px; }
      .nav { height: 65px; }
      .brand { font-size: 22px; }
      .brand-mark { width: 32px; height: 32px; font-size: 20px; }
      .nav-actions .button { padding: 9px 11px; font-size: 12px; }
      .nav-links.open { top: 65px; }
      h1 { font-size: 42px; letter-spacing: -1px; }
      .hero p { font-size: 15px; }
      .hero-actions .button { flex: 1; }
      section { padding: 56px 0; }
      .section-heading { display: block; margin-bottom: 22px; }
      .section-heading p { margin-top: 7px; }
      .app-grid, .steps { grid-template-columns: 1fr; }
      .app-card.customer { grid-column: auto; }
      .app-card { min-height: 225px; }
      .benefits { grid-template-columns: 1fr; margin-top: 25px; }
      .cta-box { padding: 31px 24px; }
      .cta-content, .footer { align-items: flex-start; flex-direction: column; }
      .cta .button { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="announcement"><div class="container"><span class="dot"></span> خالصة في مرحلة التشغيل التجريبي — خير بلدنا لكل ولادنا</div></div>

  <header>
    <div class="container nav">
      <a class="brand" href="index.html" aria-label="العودة للرئيسية"><span class="brand-mark">خ</span> خالصة</a>
      <nav class="nav-links" id="mainNav">
        <a href="#applications">التطبيقات</a>
        <a href="#how">كيف تعمل؟</a>
        <a href="merchant-dashboard.html">لأصحاب المحلات</a>
        <a href="rider-app.html">للمندوبين</a>
      </nav>
      <div class="nav-actions">
        <a class="button button-secondary" href="merchant-dashboard.html">انضم كمحل</a>
        <a class="button button-primary" href="customer.html">ابدأ التسوق</a>
        <button class="menu" id="menuButton" aria-label="فتح القائمة">☰</button>
      </div>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <div class="eyebrow">✦ منصة توصيل محلية متكاملة</div>
          <h1>كل طلب يوصل<br><span>بالطريقة الصح.</span></h1>
          <p>من المأكولات والبقالة إلى الصيدليات والخضار والأجهزة — خالصة تجمع العميل والمحل والمندوب في تجربة واحدة سهلة وآمنة.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="customer.html">تسوق الآن ←</a>
            <a class="button button-secondary" href="#applications">استكشف التطبيقات</a>
          </div>
          <div class="trust-line">
            <span>✓ طلبات واضحة ومتابعة مباشرة</span>
            <span>✓ محلات من منطقتك أولاً</span>
            <span>✓ الدفع عند الاستلام والتجريبي الإلكتروني</span>
          </div>
        </div>

        <aside class="order-card" aria-label="مثال لمتابعة الطلب">
          <div class="order-card-inner">
            <div class="card-top">
              <span class="live">● الطلب قيد التوصيل</span>
              <button type="button" class="location-trigger" id="locationButton">📍 اختر مدينتك</button>
            </div>
            <div class="mini-shop">
              <div class="mini-shop-top">
                <div><b>طلبك من أقرب محل</b><small>تم التجهيز وجارٍ الاستلام</small></div>
                <span class="shop-icon">🛒</span>
              </div>
              <div class="mini-progress"><i></i></div>
              <div class="mini-status"><span>المحل</span><span>المندوب</span><span>باب البيت</span></div>
            </div>
            <div class="rider-pill"><span class="avatar">🛵</span><span>المندوب في الطريق إليك — متابعة مباشرة للطلب</span></div>
          </div>
        </aside>
      </div>
    </section>

    <section class="quick-categories" aria-label="الأقسام">
      <div class="container category-scroll">
        <a href="customer.html" class="category"><i>🍔</i><span>مطاعم</span></a>
        <a href="customer.html" class="category"><i>🥬</i><span>خضار وفاكهة</span></a>
        <a href="customer.html" class="category"><i>🛒</i><span>بقالة</span></a>
        <a href="customer.html" class="category"><i>💊</i><span>صيدليات</span></a>
        <a href="customer.html" class="category"><i>🐟</i><span>أسماك ومشويات</span></a>
        <a href="customer.html" class="category"><i>💎</i><span>ذهب ومجوهرات</span></a>
        <a href="customer.html" class="category"><i>🧺</i><span>أجهزة منزلية</span></a>
      </div>
    </section>

    <section class="apps" id="applications">
      <div class="container">
        <div class="section-heading">
          <div><div class="eyebrow">أربع تجارب، نظام واحد</div><h2>اختر ما يناسبك في خالصة</h2></div>
          <p>واجهة مستقلة لكل طرف، مع تنسيق الطلبات والتسويات والمتابعة عبر النظام المركزي.</p>
        </div>
        <div class="app-grid">
          <a class="app-card customer" href="customer.html">
            <span class="icon">🛍️</span>
            <h3>تطبيق العميل</h3>
            <p>اكتشف المحلات القريبة، اختر طلبك، وتابعه من التجهيز حتى باب البيت.</p>
            <span class="app-link">ابدأ الطلب ←</span>
          </a>
          <a class="app-card merchant" href="merchant-dashboard.html">
            <span class="icon">🏪</span>
            <h3>لوحة المحل</h3>
            <p>إدارة المنتجات والطلبات ونطاق البيع، مع أدوات تشغيل أوضح للمحل.</p>
            <span class="app-link">دخول المحل ←</span>
          </a>
          <a class="app-card rider" href="rider-app.html">
            <span class="icon">🛵</span>
            <h3>تطبيق المندوب</h3>
            <p>استلام الطلبات، معرفة خط السير، ومتابعة الأرباح والتحويلات.</p>
            <span class="app-link">دخول الكابتن ←</span>
          </a>
          <a class="app-card admin" href="admin-dashboard.html">
            <span class="icon">⚙️</span>
            <h3>الإدارة والتشغيل</h3>
            <p>مراجعة الحسابات والوثائق، إدارة العروض، وتحليل التشغيل التجريبي.</p>
            <span class="app-link">لوحة الإدارة ←</span>
          </a>
        </div>
      </div>
    </section>

    <section class="how" id="how">
      <div class="container">
        <div class="section-heading">
          <div><div class="eyebrow">بسيطة من أول طلب</div><h2>كيف تعمل خالصة؟</h2></div>
          <p>نبدأ بالموقع والمدينة، ثم نرشح المحلات القادرة على خدمتك داخل نطاق البيع.</p>
        </div>
        <div class="steps">
          <article class="step"><span class="step-number">١</span><h3>اختر موقعك أو مدينتك</h3><p>يعرض التطبيق المحلات القريبة حسب الموقع الجغرافي، مع إمكانية تغيير المدينة في أي وقت.</p></article>
          <article class="step"><span class="step-number">٢</span><h3>اطلب من محل موثوق</h3><p>استعرض المنتجات والعروض ثم أرسل الطلب للمحل مباشرة وبوضوح.</p></article>
          <article class="step"><span class="step-number">٣</span><h3>تابع وصول طلبك</h3><p>يستلم المندوب الطلب وتتابع كل مرحلة حتى الاستلام والتقييم.</p></article>
        </div>
        <div class="benefits">
          <div class="benefit">🛡️ حماية بيانات الحسابات</div>
          <div class="benefit">📍 نطاق بيع يحدده المحل</div>
          <div class="benefit">💳 خيارات دفع متعددة</div>
          <div class="benefit">📈 تشغيل وتسويات منظمة</div>
        </div>
      </div>
    </section>

    <section class="cta">
      <div class="container">
        <div class="cta-box">
          <div class="cta-content">
            <div><h2>خلّينا نبدأ أول طلب معًا.</h2><p>سجّل كعميل، أو أضف محلك وابدأ الوصول إلى عملاء منطقتك.</p></div>
            <a class="button" href="customer.html">ابدأ مع خالصة</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="container footer">
      <a class="brand" href="index.html"><span class="brand-mark">خ</span> خالصة</a>
      <p>منصة تشغيل وتوصيل محلية — مرحلة تجريبية داخل مصر.</p>
      <p>© <span id="year"></span> خالصة</p>
    </div>
  </footer>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();
    const menuButton = document.getElementById('menuButton');
    const mainNav = document.getElementById('mainNav');
    menuButton.addEventListener('click', () => mainNav.classList.toggle('open'));

    const locationButton = document.getElementById('locationButton');
    locationButton.addEventListener('click', () => {
      if (!navigator.geolocation) {
        locationButton.textContent = '📍 اختر مدينتك من التطبيق';
        return;
      }
      locationButton.textContent = '⌛ جارٍ تحديد الموقع';
      navigator.geolocation.getCurrentPosition(
        () => locationButton.textContent = '✓ تم تحديد موقعك',
        () => locationButton.textContent = '📍 اختر مدينتك يدويًا',
        { enableHighAccuracy: false, timeout: 7000 }
      );
    });
  </script>
</body>
</html>
