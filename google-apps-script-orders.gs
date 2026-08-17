/* =============================================================
   Lou Be You — Google Apps Script: приём заказов
   =============================================================

   ЧТО ДЕЛАЕТ:
   1. Принимает POST-запрос с данными заказа из формы на сайте
   2. Сохраняет заказ в Google-таблицу (лист «Orders»)
   3. Отправляет email с информацией о заказе

   КАК УСТАНОВИТЬ:
   1. Открой https://script.google.com → Новый проект
   2. Скопируй этот код, замени содержимое Code.gs
   3. Нажми «Развернуть» → «Новое развёртывание»
   4. Тип: «Веб-приложение»
   5. Выполнять от: «Мне» (your account)
   6. Доступ: «Все» (Anyone)
   7. Нажми «Развернуть», скопируй URL
   8. Вставь URL в config.js → orderScriptUrl
   ============================================================= */

/* ---------- Настройки ---------- */
var NOTIFY_EMAIL = "nastakinski1991@gmail.com";
var SHEET_NAME   = "Orders";       // название листа в таблице
var SPREADSHEET_ID = "";           // ID таблицы (оставь пустым — скрипт создаст новую)

/* ---------- Обработка POST ---------- */
function doPost(e) {
  try {
    var data;
    if (e.postData && e.postData.type === "application/json") {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    /* Сохраняем в таблицу */
    saveToSheet_(data);

    /* Отправляем email */
    sendOrderEmail_(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ---------- Для тестирования через GET ---------- */
function doGet(e) {
  return ContentService
    .createTextOutput("Lou Be You Order API is running.")
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ---------- Сохранение в Google Sheets ---------- */
function saveToSheet_(data) {
  var ss;
  if (SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    /* Если ID не указан — используем таблицу, привязанную к скрипту,
       или создаём новую */
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (_) {
      ss = SpreadsheetApp.create("Lou Be You — Orders");
      Logger.log("Created spreadsheet: " + ss.getUrl());
    }
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Date", "Order ID", "Name", "Phone", "Email", "Zalo",
      "Province", "District", "Address", "Full Address",
      "Note", "Items", "Total", "Language"
    ]);
    sheet.getRange(1, 1, 1, 14).setFontWeight("bold");
  }

  sheet.appendRow([
    new Date(),
    data.order_id   || "",
    data.name        || "",
    data.phone       || "",
    data.email       || "",
    data.zalo        || "",
    data.province    || "",
    data.district    || "",
    data.address     || "",
    data.fullAddress || "",
    data.note        || "",
    data.order_items || "",
    data.order_total || "",
    data.language    || ""
  ]);
}

/* ---------- Отправка email ---------- */
function sendOrderEmail_(data) {
  var items = (data.order_items || "").replace(/\n/g, "<br>");

  var html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">'
    + '<h2 style="color:#5B6B4A;border-bottom:2px solid #5B6B4A;padding-bottom:10px">'
    + '🛒 Новый заказ ' + (data.order_id || '') + '</h2>'

    + '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
    + row_("Имя", data.name)
    + row_("Телефон", data.phone)
    + row_("Email", data.email)
    + (data.zalo ? row_("Zalo", data.zalo) : "")
    + row_("Провинция", data.province)
    + row_("Район", data.district)
    + row_("Адрес", data.address)
    + row_("Язык сайта", langLabel_(data.language))
    + '</table>'

    + '<h3 style="color:#5B6B4A;margin-top:24px">Товары:</h3>'
    + '<div style="background:#f9f7f3;padding:14px 18px;border-radius:8px;font-size:14px;line-height:1.7">'
    + items + '</div>'

    + '<div style="margin-top:16px;font-size:18px;font-weight:bold">'
    + 'Итого: ' + (data.order_total || '') + '</div>'

    + (data.note
      ? '<div style="margin-top:12px;padding:10px 14px;background:#fffbe6;border-radius:6px">'
        + '<strong>Заметка:</strong> ' + data.note + '</div>'
      : '')

    + '<hr style="margin-top:30px;border:none;border-top:1px solid #ddd">'
    + '<p style="font-size:12px;color:#999">Lou Be You · loubeyou.shop</p>'
    + '</div>';

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: "Lou Be You — заказ " + (data.order_id || ""),
    htmlBody: html
  });
}

function row_(label, value) {
  return '<tr>'
    + '<td style="padding:6px 12px 6px 0;font-weight:bold;color:#555;white-space:nowrap;vertical-align:top">' + label + '</td>'
    + '<td style="padding:6px 0">' + (value || '—') + '</td>'
    + '</tr>';
}

function langLabel_(code) {
  var map = { vi: "Tiếng Việt", en: "English", ru: "Русский" };
  return map[code] || code || "—";
}
