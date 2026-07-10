/* ============================================================
   TIL (UZ / RU) — o'zbekcha matnni ruschaga almashtiruvchi lug'at
   Butun ilovada emas, asosiy oqim (bosh sahifa, dashboard, ariza
   to'ldirish, holat, navigatsiya) uchun. Lug'atda yo'q matn
   o'zbekcha qoladi (xavfsiz fallback).
   ============================================================ */

const UZ_RU = {
  // Pastki navigatsiya / umumiy
  'Asosiy': 'Главная',
  'Arizalar': 'Заявки',
  'Xabar': 'Уведомления',
  'Profil': 'Профиль',
  'Orqaga': 'Назад',
  'Kirish': 'Войти',
  'Chiqish': 'Выйти',
  'Saqlash': 'Сохранить',
  'Bekor': 'Отмена',
  'Yopish': 'Закрыть',
  'Yuborish': 'Отправить',
  'Davom etish': 'Продолжить',
  "Qaytadan urinib ko'ring": 'Попробуйте ещё раз',

  // Landing
  'Imkoniyatlar': 'Возможности',
  'Qanday ishlaydi': 'Как это работает',
  'Aloqa': 'Контакты',

  // Login / OTP
  'Telefon raqamingiz': 'Ваш номер телефона',
  "Tasdiqlash kodi": 'Код подтверждения',
  'Kodni kiriting': 'Введите код',
  'Kod yuborildi': 'Код отправлен',
  "Ro'yxatdan o'tish": 'Регистрация',

  // Dashboard
  'Yangi ariza': 'Новая заявка',
  "Arizalarim": 'Мои заявки',
  'Bonus': 'Бонус',
  'Yordam': 'Помощь',
  "Ma'lumotlarni tahrirlash": 'Редактировать данные',
  'Ism va aloqa': 'Имя и контакты',
  'Barcha arizalar': 'Все заявки',
  'Savol va aloqa': 'Вопросы и связь',

  // Ariza oqimi (flow)
  'Ariza turi': 'Тип заявки',
  'Yangi polis': 'Новый полис',
  'Yangilash': 'Продление',
  'Texpasport': 'Техпаспорт',
  'Avto turi': 'Тип авто',
  'Yengil avto': 'Легковой авто',
  'Yuk avto': 'Грузовой авто',
  'Hudud': 'Регион',
  'Muddat': "Срок",
  'Haydovchilar': 'Водители',
  "To'lov usuli": 'Способ оплаты',
  'Tasdiqlash': 'Подтверждение',
  'Arizani tasdiqlang': 'Подтвердите заявку',
  "Ma'lumotlarni tekshiring": 'Проверьте данные',
  'Arizani yuborish': 'Отправить заявку',
  'Davlat raqami': 'Гос. номер',
  "To'lov": 'Оплата',
  'Jami narx': 'Итоговая цена',
  "Polis kim uchun?": 'Для кого полис?',
  "O'zim uchun": 'Для себя',
  'Boshqa odam uchun': 'Для другого человека',
  'Avtomobil turi': 'Тип автомобиля',
  'Eski polis': 'Старый полис',
  'Texpassport': 'Техпаспорт',
  'qadam': 'шаг',
  'Operator bilan chat': 'Чат с оператором',

  // Holat sahifasi
  'Ariza holati': 'Статус заявки',
  'Ariza raqami': 'Номер заявки',
  'Holat': 'Статус',
  'Tayyor!': 'Готово!',
  "Polisingiz tayyor — yuklab oling": 'Ваш полис готов — скачайте его',
  'Rad etildi': 'Отклонено',
  'Jarayonda': 'В процессе',
  'Arizangiz ko\'rib chiqilmoqda': 'Ваша заявка рассматривается',
  'Polis hujjati': 'Документ полиса',
  "Yuklab olish": 'Скачать',
  'Jarayon bosqichlari': 'Этапы процесса',
  "Operator bilan bog'lanish": 'Связаться с оператором',
  'Xizmatimizni baholang': 'Оцените наш сервис',

  // Bildirishnomalar
  'Bildirishnomalar': 'Уведомления',
  "Bildirishnoma yo'q": 'Нет уведомлений',

  // Profil
  "Ko'rinish": 'Оформление',
  'Rang': 'Цвет',
  'Til': 'Язык',

  // Bosh sahifa (landing)
  "O'zbekistonda raqamli sug'urta": 'Цифровое страхование в Узбекистане',
  "Avto sug'urta": 'Автостраховка',
  'bir necha daqiqada': 'за несколько минут',
  "Ofisga borib navbatda turmang. Hujjatni suratga oling, biz polisingizni rasmiylashtiramiz va to'g'ridan-to'g'ri sug'urta kompaniyasiga davlat narxida to'laysiz.":
    'Не стойте в очереди в офисе. Сфотографируйте документ — мы оформим ваш полис, а вы оплатите напрямую страховой компании по государственной цене.',
  'Boshlash': 'Начать',
  'daq': 'мин',
  "O'rtacha vaqt": 'Среднее время',
  'ta': '',
  'Barcha hudud': 'Все регионы',
  'Xavfsiz': 'Безопасно',
  "To'lov qabul qilindi": 'Оплата принята',
  'daqiqada': 'минуты',
  'Hammasi bitta ilovada': 'Всё в одном приложении',
  "Sug'urta rasmiylashtirish uchun kerak bo'lgan barcha narsa — qulay va tez": 'Всё необходимое для оформления страховки — удобно и быстро',
  'Telegram orqali kirish': 'Вход через Telegram',
  "Telefon raqamingizni ulang — tasdiqlash kodi avtomatik keladi. SMS to'lovsiz va parolsiz.": 'Привяжите номер телефона — код подтверждения придёт автоматически. Без платных SMS и паролей.',
  'Suratga oling': 'Сфотографируйте',
  "Texpassport rasmini oling — ma'lumotlar avtomatik aniqlanadi. Qo'lda kiritish shart emas.": 'Сделайте фото техпаспорта — данные определятся автоматически. Вводить вручную не нужно.',
  'Tezkor narx': 'Быстрая цена',
  "Avto turi, hudud va muddatni tanlang — narx darhol ko'rsatiladi. Yashirin to'lov yo'q.": 'Выберите тип авто, регион и срок — цена покажется сразу. Скрытых платежей нет.',
  'Bir qadamda yangilash': 'Продление в один шаг',
  "Eski polis rasmini yuklang — qolgan ma'lumotlar saqlanadi.": 'Загрузите фото старого полиса — остальные данные сохранятся.',
  "Qulay to'lov": 'Удобная оплата',
  "Payme, Click yoki bank kartasi orqali to'g'ridan-to'g'ri kompaniyaga.": 'Через Payme, Click или банковскую карту напрямую компании.',
  'PDF polis': 'PDF полис',
  "Tayyor polis PDF formatda. Xohlagan vaqtda yuklab oling va ko'rsating.": 'Готовый полис в формате PDF. Скачивайте и показывайте в любое время.',
  'Jarayon': 'Процесс',
  "To'rt oddiy qadam": 'Четыре простых шага',
  "Arizadan polisgacha — soddalashtirilgan jarayon": 'От заявки до полиса — упрощённый процесс',
  "Ariza to'ldirish": 'Заполнение заявки',
  "Avto ma'lumotlari va hujjat rasmlarini yuboring": 'Отправьте данные авто и фото документов',
  "Payme, Click yoki karta orqali to'lang": 'Оплатите через Payme, Click или картой',
  'Polisni oling': 'Получите полис',
  "Tayyor polisni PDF formatda yuklab oling": 'Скачайте готовый полис в формате PDF',
  'Hoziroq boshlang': 'Начните прямо сейчас',
  "Bir necha daqiqada sug'urta polisingizni rasmiylashtiring. Tez, qulay va ishonchli.": 'Оформите страховой полис за несколько минут. Быстро, удобно и надёжно.',
  'Ariza topshirish': 'Подать заявку',
  "O'zbekistonda avtomobil sug'urtasini onlayn rasmiylashtirish xizmati. «EVAZ» MChJ.": 'Сервис онлайн-оформления автостраховки в Узбекистане. ООО «EVAZ».',
  'Xizmatlar': 'Услуги',
  'Yangi polis': 'Новый полис',
  'Polisni yangilash': 'Продление полиса',
  'Telegram orqali yozish': 'Написать в Telegram',
  'Maxfiylik siyosati': 'Политика конфиденциальности',
  "Farg'ona viloyati, O'zbekiston": 'Ферганская область, Узбекистан',
  'Ariza': 'Заявка',

  // Login qadamlari
  "Sug'urta endi": 'Страховка теперь',
  'oson va tez': 'легко и быстро',
  'Bosh sahifa': 'Главная страница',
  'Tizimga kirish': 'Вход в систему',
  'va': 'и',
  'ni bosing': ' — нажмите эти кнопки',
  'raqamiga yuborilgan': 'отправлен на номер',
  '6 xonali kodni kiriting': 'Введите 6-значный код',
  'Kod olish': 'Получить код',
  'Telefon bilan kirish': 'Вход по телефону',
  'Telefon raqam': 'Номер телефона',
  'Kod Telegram orqali keladi': 'Код придёт через Telegram',

  // Dashboard
  'Assalomu alaykum,': 'Здравствуйте,',
  "Sug'urta polisini rasmiylashtiring": 'Оформите страховой полис',
  "Bir necha daqiqada, ofisga bormasdan": 'За несколько минут, не выходя из дома',
  "3-5 daqiqada to'ldiring": 'Заполните за 3-5 минут',
  "Sug'urta olish uchun shu yerdan boshlang!": 'Начните оформление страховки отсюда!',
  'DAROMAD': 'ДОХОД',
  "Do'stingizni taklif qiling — pul ishlang!": 'Пригласите друга — зарабатывайте!',
  'Bu — sizning shaxsiy daromad manbaingiz': 'Это ваш личный источник дохода',
  "Havolangizni do'stingizga yuboring": 'Отправьте свою ссылку другу',
  "Do'stingiz sug'urta arizasini to'ldiradi": 'Друг заполнит заявку на страховку',
  "To'lov qilib, ariza yakunlangach": 'После оплаты и завершения заявки',
  'sizga bonus tushadi': 'вам придёт бонус',
  'Holatlarni kuzating': 'Отслеживайте статусы',
  'Yangiliklar': 'Новости',
  'Tez yangilash': 'Быстрое продление',
  'Sozlamalar': 'Настройки',
  '100% xavfsiz': '100% безопасно',
  "Ma'lumotlaringiz shifrlangan kanallar orqali himoyalangan": 'Ваши данные защищены зашифрованными каналами',

  // Ariza to'ldirish qadamlari
  'Qanday ariza?': 'Какая заявка?',
  'Yangi polis yoki mavjudini yangilash': 'Новый полис или продление существующего',
  'Birinchi marta rasmiylashtirish': 'Оформление в первый раз',
  'Eski polis asosida tez yangilash': 'Быстрое продление на основе старого полиса',
  'Avtomobil turini tanlang': 'Выберите тип автомобиля',
  "Sug'urta narxi turga bog'liq": 'Цена страховки зависит от типа',
  'Hududingizni tasdiqlang': 'Подтвердите ваш регион',
  "Davlat raqamidan avtomatik aniqlandi — noto'g'ri bo'lsa o'zgartiring": 'Определён автоматически по гос. номеру — если неверно, измените',
  "Avtomobil ro'yxatdan o'tgan hudud": 'Регион регистрации автомобиля',
  "Sug'urta muddati": 'Срок страховки',
  'Muddat va qoplamani tanlang': 'Выберите срок и покрытие',
  "Avtomobil ma'lumotlari": 'Данные автомобиля',
  "Texpassport rasmini oling — ma'lumotlar avtomatik aniqlanadi": 'Сфотографируйте техпаспорт — данные определятся автоматически',
  'Eski polisingiz': 'Ваш старый полис',
  'Mavjud polis rasmini yuklang (1 ta rasm)': 'Загрузите фото текущего полиса (1 фото)',
  'Avtomobil egasi': 'Владелец автомобиля',
  "Qo'shimcha haydovchilar": 'Дополнительные водители',
  "Cheklanmagan sug'urta — avtomobil egasining pasporti (yoki ID kartasi) suratga olinadi": 'Неограниченная страховка — фотографируется паспорт (или ID-карта) владельца',
  "Ixtiyoriy — yangi haydovchi qo'shmoqchi bo'lsangiz, hujjatini yuklang (5 tagacha)": 'Необязательно — если хотите добавить водителя, загрузите его документ (до 5)',
  "Cheklangan sug'urta — har bir haydovchi hujjati suratga olinadi (5 tagacha)": 'Ограниченная страховка — фотографируется документ каждого водителя (до 5)',
  "Haydovchi qo'shish": 'Добавить водителя',
  "To'lov usulini tanlang": 'Выберите способ оплаты',
  "Sug'urta kompaniyasiga to'lov": 'Оплата страховой компании',
  'Mijoz telefon raqami': 'Номер телефона клиента',
  'Mijoz ismi': 'Имя клиента',
  'ixtiyoriy': 'необязательно',
  "Do'stingiz yoki boshqa odam uchun polis — uning raqamini kiriting": 'Полис для друга или другого человека — введите его номер',
  'Yangilash': 'Продление',
  'Avtomobil': 'Автомобиль',
  'Bonus chegirma': 'Бонусная скидка',
  "Yuborish orqali siz ma'lumotlaringiz to'g'riligini tasdiqlaysiz": 'Отправляя, вы подтверждаете достоверность своих данных',

  // Holat sahifasi
  "Iltimos, qaytadan ariza yuboring": 'Пожалуйста, отправьте заявку заново',
  "Arizangiz ko'rib chiqilmoqda": 'Ваша заявка рассматривается',
  'Yuklab olish': 'Скачать',
  "To'lov uchun SMS orqali havola yuborildi — telefoningizni tekshiring": 'Ссылка для оплаты отправлена по SMS — проверьте телефон',
  "To'lovni amalga oshirish": 'Оплатить',
  'Fikringizni yozing': 'Напишите отзыв',

  // STATUS_LABEL qiymatlari (config.js) — mijoz ko'radigan holat nomlari
  'Yangi': 'Новая', "Ko'rib chiqilmoqda": 'На рассмотрении', 'Biriktirildi': 'Назначена',
  'Hujjat kerak': 'Нужен документ', 'Tasdiqlandi': 'Подтверждена', "To'lov kutilmoqda": 'Ожидает оплаты',
  "To'landi": 'Оплачена', 'Polis tayyorlanmoqda': 'Полис готовится', 'Polis tayyor': 'Полис готов',
  'Yakunlandi': 'Завершена', 'Kutilmoqda': 'В ожидании',

  // Avtomobil turlari
  'Yengil avtomobil': 'Легковой автомобиль',
  'Sedan, hatchback, universal, SUV': 'Седан, хэтчбек, универсал, внедорожник',
  'Yuk avtomobili': 'Грузовой автомобиль',
  'Yuk mashinalari va tijorat transporti': 'Грузовики и коммерческий транспорт',
  'Aniqlandi': 'Определено',

  // Hududlar (viloyatlar)
  'Toshkent shahri': 'г. Ташкент',
  'Toshkent viloyati': 'Ташкентская область',
  'Sirdaryo': 'Сырдарья',
  'Jizzax': 'Джизак',
  'Samarqand': 'Самарканд',
  "Farg'ona": 'Фергана',
  'Namangan': 'Наманган',
  'Andijon': 'Андижан',
  'Qashqadaryo': 'Кашкадарья',
  'Surxondaryo': 'Сурхандарья',
  'Buxoro': 'Бухара',
  'Navoiy': 'Навои',
  'Xorazm': 'Хорезм',
  "Qoraqalpog'iston": 'Каракалпакстан',

  // Muddat (duration) kartalar
  'Mashhur': 'Популярно',
  '1 yil': '1 год',
  '6 oy': '6 месяцев',
  '20 kun': '20 дней',
  'Cheklovli': 'С ограничением',
  'Cheklovsiz': 'Без ограничения',
};

function getLang() {
  return localStorage.getItem('oson_lang') || 'uz';
}
function setLangPref(l) {
  localStorage.setItem('oson_lang', l === 'ru' ? 'ru' : 'uz');
}
// Berilgan o'zbekcha matnni joriy til bo'yicha almashtiradi (topilmasa o'zbekcha qoladi)
function tt(uzText) {
  if (getLang() !== 'ru') return uzText;
  return UZ_RU[uzText] || uzText;
}
