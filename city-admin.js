// الاسم التجاري المعتمد: «منصة خالصة».
// يحمي الواجهات المنشورة من ظهور أي صيغة قديمة للاسم.
(() => {
  const normalizeBrand = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach((item) => {
      item.nodeValue = item.nodeValue.replaceAll("\u062e\u0644\u0627\u0635\u0629", "خالصة");
    });
    document.title = document.title.replaceAll("\u062e\u0644\u0627\u0635\u0629", "خالصة");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalizeBrand, { once: true });
  } else {
    normalizeBrand();
  }
})();
