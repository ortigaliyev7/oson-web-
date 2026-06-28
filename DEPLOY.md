# Oson Sug'urtam Web — Joylash (Deployment) qo'llanmasi

Bu qo'llanma web ilovani internetga joylab, mijozlar bilan ishlay boshlash uchun.
Backend allaqachon Railway'da jonli (`https://api.osugurta.uz`) — faqat web fayllarni
joylash va bitta sozlamani qo'shish kerak.

---

## 🎯 Eng tez yo'l: GitHub Pages (tavsiya etiladi)

Siz GitHub Pages'dan allaqachon foydalanyapsiz (privacy sahifalari uchun), shuning
uchun bu eng tanish va tez yo'l.

### 1-qadam. Yangi repozitoriy yarating

1. GitHub'ga kiring (`ortigaliyev7`)
2. **New repository** bosing
3. Nomi: `oson-web`
4. **Public** tanlang
5. **Create repository**

### 2-qadam. Fayllarni yuklang

**Variant A — Sayt orqali (oson):**
1. `oson-web` repozitoriysida **"uploading an existing file"** bosing
2. `oson-web` papkasidagi BARCHA fayl va papkalarni (index.html, admin.html, css/, js/)
   sudrab tashlang (drag & drop)
3. **Commit changes** bosing

**Variant B — Git orqali (kompyuterda):**
```bash
cd oson-web
git init
git add .
git commit -m "Oson Sug'urtam web ilova"
git branch -M main
git remote add origin https://github.com/ortigaliyev7/oson-web.git
git push -u origin main
```

### 3-qadam. GitHub Pages'ni yoqing

1. Repozitoriyda **Settings** → **Pages**
2. **Source:** `Deploy from a branch`
3. **Branch:** `main`, papka: `/ (root)`
4. **Save**
5. 1-2 daqiqa kuting

Sayt manzili:
- **Mijoz:** `https://ortigaliyev7.github.io/oson-web/`
- **Admin:** `https://ortigaliyev7.github.io/oson-web/admin.html`

---

## ⚠️ 4-qadam. ENG MUHIM — CORS ruxsatini bering

Backend xavfsizlik uchun faqat ruxsat etilgan domenlardan so'rov qabul qiladi.
Web saytni joylagandan keyin uning domenini Railway'ga qo'shish **SHART**, aks holda
sayt ochilsa ham, hech narsa yuklanmaydi ("Internetga ulanishda xatolik" chiqadi).

1. **Railway.app** → loyihangiz → backend xizmati
2. **Variables** (o'zgaruvchilar) bo'limi
3. `ALLOWED_ORIGINS` o'zgaruvchisini toping (yo'q bo'lsa — yangi qo'shing)
4. Qiymatini shunday qiling (vergul bilan, probelsiz):

```
ALLOWED_ORIGINS=https://ortigaliyev7.github.io,https://osugurta.uz,https://www.osugurta.uz
```

5. **Saqlang** — Railway avtomatik qayta ishga tushadi (1-2 daqiqa)

> 💡 Faqat GitHub Pages'da ishlatsangiz, `https://ortigaliyev7.github.io` yetarli.
> osugurta.uz domenini ulasangiz — uni ham qo'shing.

---

## 🌐 (Ixtiyoriy) osugurta.uz domenini ulash

Saytni `https://osugurta.uz` manzilida ishlatish uchun (api.osugurta.uz — bu backend,
ular har xil; root domen hozir bo'sh).

### GitHub Pages'da custom domain:

1. `oson-web` repo → **Settings** → **Pages** → **Custom domain**
2. `osugurta.uz` (yoki `app.osugurta.uz`) yozing → **Save**

### ahost.uz (DNS) sozlamalari:

Agar **app.osugurta.uz** subdomendan foydalansangiz (eng oson, api bilan to'qnashmaydi):
| Turi | Nomi | Qiymat |
|------|------|--------|
| CNAME | `app` | `ortigaliyev7.github.io` |

Agar **root osugurta.uz** ishlatsangiz, GitHub Pages'ning 4 ta A-yozuvi:
| Turi | Nomi | Qiymat |
|------|------|--------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

> DNS yangilanishi 1-24 soat olishi mumkin. Keyin `ALLOWED_ORIGINS`ga
> shu domenni qo'shishni unutmang (4-qadam).

---

## ✅ 5-qadam. Tekshirish

1. Mijoz saytini oching → telefon raqami bilan kirib ko'ring (SMS kod keladi)
2. Admin panelni oching → `admin` + parol bilan kiring
3. Test ariza yuboring → admin panelda ko'rinishini tekshiring

Agar "Internetga ulanishda xatolik" chiqsa → 4-qadam (CORS) bajarilmagan.
Brauzerda **F12 → Console**'da `CORS` so'zi bo'lsa, aniq shu muammo.

---

## 🔑 Admin kirish ma'lumotlari

- **Login:** `admin`
- **Parol:** Railway'da `HEAD_ADMIN_PASSWORD` o'zgaruvchisida o'rnatilgan

Boshqa xodimlar (operator, buxgalter) uchun admin panel ichidan akkaunt qo'shiladi.

---

## 📝 Sozlamalarni o'zgartirish

Narxlar, hududlar, muddatlarni o'zgartirish kerak bo'lsa — `js/config.js` faylini
tahrirlang (PRICES jadvali, REGIONS, DURATIONS). O'zgartirgach, faylni GitHub'ga
qayta yuklang — sayt avtomatik yangilanadi.

---

## Xulosa — qadamlar ketma-ketligi

1. ✅ GitHub'da `oson-web` repo yarating (Public)
2. ✅ Fayllarni yuklang
3. ✅ Settings → Pages → main/root → yoqing
4. ⚠️ Railway → Variables → `ALLOWED_ORIGINS`ga domen qo'shing (ENG MUHIM)
5. ✅ Tekshiring (mijoz + admin kirib ko'ring)
6. 🌐 (ixtiyoriy) osugurta.uz domenini ulang

Tayyor! Endi Play Market'ni kutmasdan, sayt orqali mijozlar bilan ishlay olasiz.
