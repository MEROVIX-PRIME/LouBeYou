/* ============================================================
   LOU BE YOU — настройки сайта
   Здесь меняется всё, что не требует правки кода.
   ============================================================ */

window.LOU_CONFIG = {

  /* --- ПРАЙС ИЗ GOOGLE ТАБЛИЦЫ -----------------------------
     Ссылка на публикацию таблицы в формате CSV.
     Как получить: Файл → Поделиться → Опубликовать в интернете
                   → лист «Лист1» → формат CSV → Опубликовать
     Оставь пустым — сайт возьмёт товары из products.js
  ---------------------------------------------------------- */
  sheetCsvUrl: "",

  /* Резервный способ: сайт сам соберёт ссылку по этому id.
     Работает, только пока таблица открыта «всем по ссылке». */
  sheetId: "",
  sheetName: "Лист1",

  /* Названия колонок в твоей таблице. Регистр не важен.
     Можно дописать свои варианты — сайт найдёт любой из списка. */
  sheetColumns: {
    sku:        ["артикул", "sku"],
    price:      ["цена", "price"],
    oldPrice:   ["старая цена", "old price"],
    category:   ["категория", "category"],
    type:       ["тип", "type"],
    name:       ["название", "name", "название ru", "name ru"],
    nameEn:     ["название en", "name en"],
    nameVi:     ["название vi", "name vi", "ten", "tên"],
    desc:       ["описание", "description", "описание en", "desc en"],
    descRu:     ["описание ru", "desc ru"],
    descVi:     ["описание vi", "desc vi", "mo ta", "mô tả"],
    specs:      ["характеристики", "specs"],
    specsEn:    ["характеристики en", "specs en"],
    specsVi:    ["характеристики vi", "specs vi"],
    size:       ["размер", "size"],
    color:      ["цвет", "color", "colour"],
    stock:      ["остаток", "stock", "количество", "qty"],
    image:      ["картинка", "image", "фото", "изображение"],
    collection: ["коллекция", "collection"],
    rateVnd:    ["курс usd/vnd", "usd/vnd", "usd to vnd"],
    rateRub:    ["курс usd/rub", "usd/rub", "usd to rub"]
  },

  /* --- ВАЛЮТА -----------------------------------------------
     "VND" — цены в таблице уже в донгах (12 → 12 ₫)
     "USD" — цены в долларах, сайт пересчитает в донги
  ---------------------------------------------------------- */
  currency: "USD",
  usdToVnd: 26000,
  usdToRub: 85,

  /* --- ГРУППИРОВКА ВАРИАНТОВ --------------------------------
     Одна строка таблицы = один размер + цвет.
     Сайт объединяет строки в товар по началу артикула
     до первого подчёркивания: book_b_XS → book
  ---------------------------------------------------------- */

  /* Картинки. В таблице колонки с картинкой нет, поэтому связь
     задаётся здесь: начало артикула → файлы в assets/img/
     Если добавишь в таблицу колонку «картинка», победит она. */
  images: (function () {
    var ids = ["book", "bus", "cook", "fix", "noplans", "flower", "music", "photo", "rain", "sleep"];
    var slugs = { noplans: "no-plans" };
    var out = {};
    ids.forEach(function (id) {
      var slug = slugs[id] || id;
      out[id] = [
        "assets/img/catalog/" + slug + "-tshirt.jpg",
        "assets/img/catalog/" + slug + "-tshirt-white.jpg",
        "assets/img/catalog/" + slug + "-tshirt-moss.jpg",
        "assets/img/catalog/" + slug + "-tshirt-alt.jpg"
      ];
      out["mug_" + id] = [
        "assets/img/catalog/" + slug + "-mug.jpg",
        "assets/img/catalog/" + slug + "-mug-alt.jpg"
      ];
    });
    return out;
  })(),
  variantImages: (function () {
    var defs = {
      book: ["book", "book"], bus: ["bus", "bus"], cook: ["cook", "cook"],
      fix: ["fix", "fix"], noplans: ["no plans", "noplans"], flower: ["flower", "flower"],
      music: ["music", "music"], photo: ["photo", "ph"], rain: ["rain", "rain"], sleep: ["sleep", "sleep"]
    };
    var colors = { white: ["white", "w"], ivory: ["ivory", "i"], black: ["black", "b"], moss: ["moh", "m"] };
    var photoCounts = {
      book: { white: 3, ivory: 3, black: 4, moss: 3 },
      bus: { white: 3, ivory: 3, black: 3, moss: 3 },
      cook: { white: 3, ivory: 3, black: 3, moss: 3 },
      fix: { white: 3, ivory: 3, black: 4, moss: 3 },
      noplans: { white: 3, ivory: 3, black: 4, moss: 3 },
      flower: { white: 3, ivory: 3, black: 4, moss: 3 },
      music: { white: 3, ivory: 3, black: 4, moss: 3 },
      photo: { white: 3, ivory: 3, black: 4, moss: 3 },
      rain: { white: 3, ivory: 3, black: 3, moss: 3 },
      sleep: { white: 3, ivory: 3, black: 3, moss: 3 }
    };
    var out = {};
    var mugPrefix = { photo: "ph", noplans: "noplans" };
    Object.keys(defs).forEach(function (id) {
      var folder = defs[id][0], prefix = defs[id][1];
      out[id] = {};
      Object.keys(colors).forEach(function (color) {
        var cf = colors[color][0], cc = colors[color][1];
        var base = "assets/catalog/image%20lou/t_shirt/old/" + encodeURIComponent(folder) + "/" + cf + "/" + prefix + "_" + cc + "_";
        var count = photoCounts[id][color];
        out[id][color] = [];
        for (var n = 1; n <= count; n++) out[id][color].push(base + n + (n <= 2 ? ".jpg" : ".png"));
      });
      var mp = mugPrefix[id] || id;
      out["mug_" + id] = { white: [
        "assets/catalog/image%20lou/mugs/" + id + "/" + mp + "mug_1.jpg",
        "assets/catalog/image%20lou/mugs/" + id + "/" + mp + "mug_2.jpg"
      ] };
    });
    out.mug_flower = { white: [
      "assets/catalog/image%20lou/mugs/flower/flowermug_2(1).jpg",
      "assets/catalog/image%20lou/mugs/flower/flowermug_2.jpg"
    ] };
    return out;
  })(),
  imageFallback: "assets/img/lou-logo.webp",

  /* Начало артикула → коллекция. Если в таблице появится
     колонка «коллекция», использоваться будет она. */
  collections: {
    book: "book", bus: "bus", cook: "cook", fix: "fix", noplans: "no-plans",
    flower: "flower", music: "music", photo: "photo", rain: "rain", sleep: "sleep"
  },

  /* Категория в таблице → внутренний код сайта.
     Сейчас в таблице «t_shits» с опечаткой — учтено. */
  categoryMap: {
    "t_shits": "tshirt",
    "t_shirts": "tshirt",
    "tshirt": "tshirt",
    "футболка": "tshirt",
    "mug": "mug",
    "mugs": "mug",
    "кружка": "mug",
    "cup": "mug"
  },

  /* Названия цветов для покупателя */
  colorNames: {
    black: { vi: "Đen",       en: "Black", ru: "Чёрный" },
    white: { vi: "Trắng",     en: "White", ru: "Белый" },
    moss:  { vi: "Xanh rêu",  en: "Moss",  ru: "Мох" },
    ivory: { vi: "Trắng ngà", en: "Ivory", ru: "Слоновая кость" },
    cream: { vi: "Kem",       en: "Cream", ru: "Кремовый" }
  },

  /* Как показывать цвет кружком в карточке */
  colorSwatch: {
    black: "#25241F", white: "#FFFFFF", moss: "#77745B",
    ivory: "#F6F0E5", cream: "#F0E6D2"
  },

  /* Порядок размеров */
  sizeOrder: ["XS", "S", "M", "L", "XL", "XXL"],

  /* --- КОРЗИНА И ЗАКАЗЫ ------------------------------------- */
  orderFormName: "lou-order",
  orderEmail: "hello@loubeyou.com",

  /* URL Google Apps Script Web App для приёма заказов.
     Замени на свой URL после деплоя скрипта.
     Пока пусто — используется резервный mailto. */
  orderScriptUrl: "https://script.google.com/macros/s/AKfycbxyOi1KnDRUqZT2dZf4iT_aALgpllm-Txh_wd_-pQEIhBfJ86BhOFVf2kBLRVs_lmnA3w/exec",

  /* --- ДОСТАВКА ---------------------------------------------- */
  shipping: {
    flatRate: 30000,
    freeFrom: 500000
  },

  /* --- ОСТАТКИ ----------------------------------------------- */
  stock: {
    manyThreshold: 50,
    lowThreshold: 5
  },

  /* --- КОНТАКТЫ ---------------------------------------------- */
  instagram: "https://www.instagram.com/lou_be_you?igsh=MW0xNmQ4N2QwMmltdw%3D%3D&utm_source=qr",

  /* --- ЯЗЫК ПО УМОЛЧАНИЮ ------------------------------------- */
  defaultLang: "en",

  /* --- ТАБЛИЦА РАЗМЕРОВ -------------------------------------- */
  sizeChartImage: ""
};
