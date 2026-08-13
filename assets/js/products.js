/* Резервный каталог Lou. Цены указаны во вьетнамских донгах (VND). */
(function () {
  const collections = [
    { id: "music", image: "assets/img/design-music.webp", title: { vi: "Âm nhạc", en: "Music", ru: "Музыка" }, quote: "I Love This Part" },
    { id: "fix", image: "assets/catalog/image%20lou/t_shirt/old/fix/ivory/fix_i_1.jpg", title: { vi: "Sửa chữa", en: "Fix It", ru: "Починю" }, quote: "I’m Fixing This" },
    { id: "photo", image: "assets/img/design-photo.webp", hit: true, title: { vi: "Nhiếp ảnh", en: "Photography", ru: "Фотография" }, quote: "One More Photo" },
    { id: "cook", image: "assets/img/design-oven.webp", title: { vi: "Nấu ăn", en: "Cooking", ru: "Готовим вместе" }, quote: "Fresh Out of the Oven" },
    { id: "rain", image: "assets/img/design-rain.webp", title: { vi: "Ngày mưa", en: "Rainy Day", ru: "Дождливый день" }, quote: "Just Listening to the Rain" },
    { id: "book", image: "assets/img/design-one-more-page.webp", title: { vi: "Đọc sách", en: "Book Lover", ru: "Любителям книг" }, quote: "Just One More Page" },
    { id: "sleep", image: "assets/img/design-five-minutes.webp", title: { vi: "Ngủ thêm", en: "Sleepy Lou", ru: "Сонный Lou" }, quote: "Five More Minutes" },
    { id: "no-plans", image: "assets/img/design-no-plans.webp", hit: true, title: { vi: "Không kế hoạch", en: "No Plans", ru: "Без планов" }, quote: "No Plans for Today" },
    { id: "flower", image: "assets/img/design-grown.webp", title: { vi: "Hoa nhỏ", en: "Little Flower", ru: "Маленький цветок" }, quote: "You’ve Grown So Much" },
    { id: "bus", image: "assets/img/design-waiting.webp", title: { vi: "Chờ xe buýt", en: "Bus Stop", ru: "На остановке" }, quote: "Waiting Together" }
  ];

  const audiences = {
    music: { ru: "для любителей музыки", en: "for music lovers", vi: "dành cho người yêu âm nhạc" },
    fix: { ru: "для художников", en: "for artists", vi: "dành cho nghệ sĩ" },
    photo: { ru: "для любителей фотографии", en: "for photography lovers", vi: "dành cho người yêu nhiếp ảnh" },
    cook: { ru: "для кулинаров", en: "for home cooks", vi: "dành cho người yêu nấu ăn" },
    rain: { ru: "для любителей дождя", en: "for rain lovers", vi: "dành cho người yêu mưa" },
    book: { ru: "для книголюбов", en: "for book lovers", vi: "dành cho người yêu sách" },
    sleep: { ru: "для любителей поспать", en: "for those who love to sleep in", vi: "dành cho người thích ngủ nướng" },
    "no-plans": { ru: "для любителей домашнего уюта", en: "for homebodies", vi: "dành cho người yêu sự ấm cúng" },
    flower: { ru: "для любителей растений", en: "for plant lovers", vi: "dành cho người yêu cây cỏ" },
    bus: { ru: "про моменты вместе", en: "for moments together", vi: "cho những khoảnh khắc bên nhau" }
  };
  const mugAudienceRu = { photo: "для фотографов", bus: "для тех, кто ценит моменты вместе" };
  const colors = {
    white: { ru: "белая", en: "white", vi: "màu trắng" },
    ivory: { ru: "цвет слоновой кости", en: "ivory", vi: "màu ngà" },
    black: { ru: "чёрная", en: "black", vi: "màu đen" },
    moss: { ru: "мох", en: "moss", vi: "màu rêu" }
  };
  function teeName(c, color) {
    const a = audiences[c.id], tone = colors[color];
    return {
      ru: "Футболка Lou Be You «" + c.quote + "» — " + tone.ru + ", " + a.ru,
      en: "Lou Be You T-Shirt «" + c.quote + "» — " + tone.en + ", " + a.en,
      vi: "Áo thun Lou Be You «" + c.quote + "» — " + tone.vi + ", " + a.vi
    };
  }
  function mugName(c) {
    const a = audiences[c.id];
    return {
      ru: "Кружка Lou Be You «" + c.quote + "» — " + (mugAudienceRu[c.id] || a.ru),
      en: "Lou Be You Mug «" + c.quote + "» — " + a.en,
      vi: "Cốc Lou Be You «" + c.quote + "» — " + a.vi
    };
  }

  window.LOU_COLLECTIONS = collections.map(function (c) {
    return {
      id: c.id,
      image: c.image,
      hit: Boolean(c.hit),
      vi: c.quote,
      en: c.quote,
      ru: c.quote
    };
  });

  const tshirtMaterial = {
    vi: "100% cotton chải kỹ, 220 gsm. Hình in DTG bền màu.",
    en: "100% combed cotton, 220 gsm. Long-lasting DTG print.",
    ru: "100% чёсаный хлопок, 220 г/м². Стойкая DTG-печать."
  };
  const mugMaterial = {
    vi: "Sứ trắng, 330 ml. Dùng được với máy rửa bát và lò vi sóng.",
    en: "White ceramic, 330 ml. Dishwasher and microwave safe.",
    ru: "Белая керамика, 330 мл. Можно мыть в посудомоечной машине и использовать в микроволновке."
  };

  const products = [];
  collections.forEach(function (c, index) {
    const dataKey = c.id === "no-plans" ? "noplans" : c.id;
    const teeGalleries = window.LOU_CONFIG.variantImages[dataKey];
    const mugGalleries = window.LOU_CONFIG.variantImages["mug_" + dataKey];
    const namesByColor = {};
    Object.keys(teeGalleries).forEach(function (color) { namesByColor[color] = teeName(c, color); });
    products.push({
      id: dataKey,
      category: "tshirt",
      hit: dataKey === "noplans" || dataKey === "photo",
      collection: c.id,
      image: teeGalleries.white[0],
      gallery: teeGalleries.white,
      galleries: teeGalleries,
      price: Math.round(12 * window.LOU_CONFIG.usdToVnd),
      stock: 100,
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["White", "Ivory", "Black", "Moss"],
      quote: c.quote,
      name: namesByColor.white,
      namesByColor: namesByColor,
      desc: {
        vi: "Áo thun Lou dáng rộng, mềm mại với hình minh họa “" + c.quote + "”",
        en: "A soft, relaxed Lou T-shirt featuring the “" + c.quote + "” illustration.",
        ru: "Мягкая футболка Lou свободного кроя с иллюстрацией «" + c.quote + "»."
      },
      material: tshirtMaterial
    });
    products.push({
      id: "mug_" + dataKey,
      category: "mug",
      hit: dataKey === "music",
      collection: c.id,
      image: mugGalleries.white[0],
      gallery: mugGalleries.white,
      galleries: mugGalleries,
      price: Math.round(8 * window.LOU_CONFIG.usdToVnd),
      stock: 50,
      sizes: [],
      colors: ["White"],
      quote: c.quote,
      name: mugName(c),
      desc: {
        vi: "Cốc sứ Lou với hình minh họa “" + c.quote + "” cho những khoảnh khắc ấm áp mỗi ngày.",
        en: "A Lou ceramic mug featuring “" + c.quote + "” for warm everyday moments.",
        ru: "Керамическая кружка Lou с иллюстрацией «" + c.quote + "» для тёплых повседневных моментов."
      },
      material: mugMaterial
    });
  });

  window.LOU_PRODUCTS_RAW = products;
  window.LOU_PRODUCTS = products.map(function (p) {
    const sizes = p.sizes.length ? p.sizes : [""];
    const colors = p.colors.map(function (c) { return String(c).toLowerCase(); });
    const perVariant = Math.max(0, Math.round(p.stock / (sizes.length * colors.length)));
    p.colors = colors;
    p.variants = [];
    sizes.forEach(function (size) {
      colors.forEach(function (color) {
        p.variants.push({
          sku: p.id + "_" + color + (size ? "_" + size : ""),
          size: size,
          color: color,
          stock: perVariant,
          price: p.price
        });
      });
    });
    return p;
  });
})();
