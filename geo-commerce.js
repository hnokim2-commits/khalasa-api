<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>خالصة | توصيل في مصر</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="auth.css" />
  <link rel="stylesheet" href="payments.css" />
  <link rel="stylesheet" href="geo-commerce.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <button class="icon-btn menu-btn" aria-label="القائمة" onclick="toggleMenu()">☰</button>
      <div class="brand"><span class="brand-mark">و</span><span>خالصة</span></div>
      <button class="icon-btn cart-trigger" aria-label="السلة" onclick="openCart()"><span>🛍️</span><b id="cartCount">0</b></button>
    </header>

    <aside class="side-menu" id="sideMenu">
      <button class="close" onclick="toggleMenu()">×</button>
      <button class="menu-profile" onclick="openAuth()"><span>👋</span><div><b id="profileName">أهلاً بك</b><small id="profileHint">سجّل دخولك لتتابع طلباتك</small></div><i>‹</i></button>
      <a href="#restaurants" onclick="toggleMenu()">المطاعم</a><a href="#offers" onclick="toggleMenu()">العروض</a><a href="#how" onclick="toggleMenu()">كيف تعمل خالصة؟</a>
    </aside><div class="overlay" id="overlay" onclick="closePanels()"></div>

    <main>
      <section class="hero">
        <p class="eyebrow">توصيل سريع داخل مدينتك</p>
        <h1>كل اللي نفسك فيه<br><em>يوصلك لحد عندك</em></h1>
        <button class="location-card" onclick="chooseArea()"><span class="location-pin">●</span><span><small>التوصيل إلى</small><b id="areaName">اختر منطقتك</b></span><span class="chevron">‹</span></button>
        <div class="search"><span>⌕</span><input id="searchInput" oninput="filterRestaurants()" placeholder="بتدور على إيه؟ مطعم أو أكلة..." /></div>
      </section>

      <section class="categories" aria-label="الأقسام">
        <button class="category active" data-category="all" onclick="setCategory('all',this)"><span>✨</span>الكل</button>
        <button class="category" data-category="burger" onclick="setCategory('burger',this)"><span>🍔</span>برجر</button>
        <button class="category" data-category="pizza" onclick="setCategory('pizza',this)"><span>🍕</span>بيتزا</button>
        <button class="category" data-category="egyptian" onclick="setCategory('egyptian',this)"><span>🍲</span>أكل بيتي</button>
        <button class="category" data-category="dessert" onclick="setCategory('dessert',this)"><span>🍰</span>حلويات</button>
        <button class="category" data-category="gold" onclick="setCategory('gold',this)"><span>💍</span>ذهب ومجوهرات</button>
        <button class="category" data-category="appliances" onclick="setCategory('appliances',this)"><span>🔌</span>أجهزة منزلية</button>
        <button class="category" data-category="pharmacy" onclick="setCategory('pharmacy',this)"><span>💊</span>صيدليات</button>
        <button class="category" data-category="fish" onclick="setCategory('fish',this)"><span>🐟</span>أسماك ومشاوي</button>
        <button class="category" data-category="grocery" onclick="setCategory('grocery',this)"><span>🛒</span>بقالة</button>
        <button class="category" data-category="produce" onclick="setCategory('produce',this)"><span>🥬</span>سوق الخضار والفواكه</button>
      </section>

      <section class="promo" id="offers"><div><span class="pill">عرض الأسبوع</span><h2>خصم 25% على أول طلب</h2><p>استخدم الكود <b>KHALASA25</b></p></div><span class="promo-art">🛵</span></section>

      <section class="sponsored-section" id="sponsoredSection" aria-label="إعلانات مدفوعة">
        <div class="section-heading"><div><p class="eyebrow">مختارة لك</p><h2>إعلانات في منطقتك</h2></div><span class="sponsored-label">إعلان ممول</span></div>
        <div class="sponsored-grid" id="sponsoredGrid"></div>
      </section>

      <section class="content" id="restaurants">
        <div class="section-heading"><div><p class="eyebrow">اختياراتك القريبة</p><h2>محلات قريبة منك</h2></div><button onclick="showAll()">عرض الكل ‹</button></div>
        <div class="restaurant-grid" id="restaurantGrid"></div>
        <p class="empty-state" id="emptyState">مفيش نتيجة مطابقة، جرّب تبحث بكلمة تانية.</p>
      </section>

      <section class="how" id="how"><span>📍</span><div><h3>مصر كلها قريباً</h3><p><b>خير بلادنا لأولاد بلادنا.</b> خالصة تتوسع تدريجياً لتصل إلى مدن مصر كلها وتقرّب لك محلات منطقتك.</p></div></section>
    </main>

    <nav class="bottom-nav"><button class="selected">⌂<span>الرئيسية</span></button><button onclick="document.getElementById('restaurants').scrollIntoView({behavior:'smooth'})">♜<span>المطاعم</span></button><button onclick="openCart()">🛍️<span>طلباتي</span></button><button onclick="alert('ميزة الحساب هتكون متاحة قريباً')">◉<span>حسابي</span></button></nav>
  </div>

  <div class="modal" id="areaModal"><div class="modal-card location-picker"><button class="close" onclick="closeArea()">×</button><p class="eyebrow">مدينة التوصيل</p><h2>اختَر محافظتك ومدينتك</h2><p class="location-help">سنرتب المحلات التي تخدم مدينتك أولاً، ويمكنك تغييرها في أي وقت.</p><button class="locate-me" onclick="requestCustomerLocation()">⌖ تحديد مدينتي من موقعي</button><label>المحافظة<select id="areaGovernorateSelect" onchange="updateCityOptions('area')"></select></label><label>المدينة<select id="areaCitySelect"></select></label><button class="auth-submit" onclick="confirmCustomerLocation()">تأكيد مدينة التوصيل</button></div></div>
<div class="modal" id="authModal"><div class="modal-card auth-card"><button class="close" onclick="closeAuth()">×</button><div class="auth-brand"><span class="brand-mark">و</span><div><p class="eyebrow">حساب خالصة</p><h2 id="authTitle">أنشئ حسابك</h2></div></div><form id="phoneStep"><label>رقم الهاتف المحمول<input id="phoneInput" inputmode="numeric" maxlength="11" placeholder="01XXXXXXXXX" required></label><label>البريد الإلكتروني<input id="emailInput" type="email" autocomplete="email" placeholder="name@example.com" required></label><label>الاسم الكامل<input id="nameInput" placeholder="الاسم الكامل" required></label><div class="location-fields"><label>المحافظة<select id="signupGovernorateSelect" onchange="updateCityOptions('signup')" required></select></label><label>المدينة<select id="signupCitySelect" required></select></label></div><p class="auth-note">تُستخدم المدينة لترشيح المحلات القريبة، ويمكن تغييرها لاحقاً.</p><button type="button" class="auth-submit" id="sendOtpButton" onclick="sendOtp(event)">إرسال رمز التحقق بالبريد</button><p class="auth-delivery-status" id="authDeliveryStatus" aria-live="polite">سنرسل رمزاً صالحاً لمدة 5 دقائق إلى بريدك الإلكتروني.</p><label>رمز التحقق<input id="otpInput" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="• • • • • •" required></label><button type="button" class="auth-submit" onclick="verifyOtp(event)">تأكيد وإنشاء الحساب</button><p class="auth-note">لن نطلب صورة البطاقة الشخصية من العميل.</p></form></div></div>
  <div class="modal" id="paymentModal"><div class="modal-card payment-card"><button class="close" onclick="closePayment()">×</button><p class="eyebrow">إتمام الطلب</p><h2>اختر طريقة الدفع</h2><div class="payment-total"><span>إجمالي الطلب</span><b id="paymentTotal">0 ج.م</b></div><div class="payment-options"><button class="payment-option selected" data-pay="cod" onclick="selectPayment(this)"><span class="pay-icon">💵</span><div><b>الدفع عند الاستلام</b><small>ادفع للمندوب عند وصول الطلب</small></div><i>✓</i></button><button class="payment-option" data-pay="wallet" onclick="selectPayment(this)"><span class="pay-icon wallet-icon">◉</span><div><b>محفظة ذكية</b><small>فودافون كاش، اتصالات كاش، أورانج كاش</small></div><i>✓</i></button><button class="payment-option" data-pay="card" onclick="selectPayment(this)"><span class="pay-icon">💳</span><div><b>فيزا أو ماستركارد</b><small>دفع إلكتروني آمن عبر بوابة الدفع</small></div><i>✓</i></button></div><div class="payment-note" id="paymentNote">💡 جهّز المبلغ المناسب للمندوب عند الاستلام.</div><button class="auth-submit" onclick="confirmPayment()">تأكيد الطلب والدفع عند الاستلام</button></div></div>
  <div class="cart-panel" id="cartPanel"><div class="cart-head"><h2>سلة الطلب</h2><button class="close" onclick="closePanels()">×</button></div><div id="cartItems" class="cart-items"></div><div class="cart-footer"><div><span>الإجمالي</span><b id="cartTotal">0 ج.م</b></div><button id="checkoutBtn" onclick="checkout()" disabled>إتمام الطلب</button></div></div>
  <div class="toast" id="toast"></div>
<script src="khalasa-api.js"></script>
<script src="app.js"></script>
  <script src="client-integration.js"></script>
  <script src="geo-commerce.js"></script>
  <script src="customer-otp.js"></script>
  <style id="khalasa-extra-categories-style">
    .khalasa-extra-categories {
      margin: 18px auto;
      padding: 0 16px;
      max-width: 1180px;
      direction: rtl;
    }
    .khalasa-extra-categories__title {
      margin: 0 0 12px;
      color: #12352a;
      font-size: clamp(1.05rem, 2.2vw, 1.35rem);
      font-weight: 800;
    }
    .khalasa-extra-categories__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .khalasa-extra-category {
      display: flex;
      min-height: 104px;
      align-items: center;
      gap: 14px;
      padding: 16px;
      border: 1px solid #dfe9e4;
      border-radius: 20px;
      background: #fff;
      color: #12352a;
      box-shadow: 0 10px 28px rgba(18, 53, 42, .08);
      cursor: pointer;
      text-align: right;
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .khalasa-extra-category:hover,
    .khalasa-extra-category:focus-visible {
      transform: translateY(-2px);
      border-color: #14845c;
      box-shadow: 0 14px 34px rgba(18, 53, 42, .13);
      outline: none;
    }
    .khalasa-extra-category__icon {
      display: grid;
      width: 54px;
      height: 54px;
      flex: 0 0 54px;
      place-items: center;
      border-radius: 17px;
      background: #eaf7f1;
      font-size: 1.8rem;
    }
    .khalasa-extra-category:nth-child(2) .khalasa-extra-category__icon {
      background: #fff2e9;
    }
    .khalasa-extra-category strong {
      display: block;
      margin-bottom: 5px;
      font-size: 1rem;
    }
    .khalasa-extra-category small {
      color: #668076;
      line-height: 1.55;
    }
    @media (max-width: 560px) {
      .khalasa-extra-categories__grid { grid-template-columns: 1fr; }
      .khalasa-extra-category { min-height: 92px; padding: 14px; }
    }
  </style>

  <script id="khalasa-extra-categories-script">
    (() => {
      const categories = [
        {
          id: 'stationery',
          icon: '📚',
          title: 'المكتبات والأدوات المكتبية',
          description: 'كتب، كراسات، أقلام، مستلزمات المدارس والمكاتب',
          search: 'مكتبات أدوات مكتبية كتب كراسات أقلام مدارس'
        },
        {
          id: 'hardware',
          icon: '🧰',
          title: 'الخردوات والعدد',
          description: 'عدد يدوية، أدوات صيانة، مسامير ولوازم منزلية',
          search: 'خردوات عدد أدوات صيانة مسامير لوازم منزلية'
        }
      ];

      const applyCategory = (category) => {
        localStorage.setItem('khalasa_selected_category', category.id);
        localStorage.setItem('khalasa_selected_category_name', category.title);

        const searchInput = document.querySelector(
          'input[type="search"], #search, #storeSearch, [data-search-input], input[placeholder*="بحث"]'
        );

        if (searchInput) {
          searchInput.value = category.title;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          searchInput.focus({ preventScroll: true });
        }

        document.dispatchEvent(new CustomEvent('khalasa:category-selected', {
          detail: category
        }));

        const results = document.querySelector(
          '#stores, #results, .stores-grid, .merchant-list, [data-store-results]'
        );
        (results || searchInput)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      const render = () => {
        if (document.getElementById('khalasa-extra-categories')) return;

        const section = document.createElement('section');
        section.id = 'khalasa-extra-categories';
        section.className = 'khalasa-extra-categories';
        section.setAttribute('aria-labelledby', 'khalasa-extra-categories-title');
        section.innerHTML = `
      <h2 class="khalasa-extra-categories__title" id="khalasa-extra-categories-title">تسوّق حسب احتياجك</h2>
          <div class="khalasa-extra-categories__grid"></div>
        `;

        const grid = section.querySelector('.khalasa-extra-categories__grid');
        categories.forEach((category) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'khalasa-extra-category';
          button.dataset.category = category.id;
          button.dataset.keywords = category.search;
          button.setAttribute('aria-label', `عرض قسم ${category.title}`);
          button.innerHTML = `
            <span class="khalasa-extra-category__icon" aria-hidden="true">${category.icon}</span>
            <span>
              <strong>${category.title}</strong>
              <small>${category.description}</small>
            </span>
          `;
          button.addEventListener('click', () => applyCategory(category));
          grid.appendChild(button);
        });

        const existingCategories = document.querySelector(
          '#categories, .categories-section, [data-categories-section], .category-section'
        );
        const main = document.querySelector('main');

        if (existingCategories) {
          existingCategories.insertAdjacentElement('afterend', section);
        } else if (main) {
          main.insertAdjacentElement('afterbegin', section);
        } else {
          document.body.appendChild(section);
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render, { once: true });
      } else {
        render();
      }
    })();
  </script>
<script src="beta-live.js"></script>
<link rel="stylesheet" href="khalasa-upgrade-20260817.css">
<script src="khalasa-upgrade-20260817.js"></script>
<script src="customer-orders-20260910.js"></script></body>
</html>
