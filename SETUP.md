# השבוע שלי · הוראות הקמה

אתר סטטי (HTML/CSS/JS) בלי שלב build. ההתחברות עם Google והשמירה בענן עובדות דרך Firebase (חינמי בהיקף הזה).

## 1. יצירת פרויקט Firebase
1. נכנסים ל-https://console.firebase.google.com ויוצרים פרויקט חדש (אפשר לכבות את Google Analytics).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**, בוחרים מייל תמיכה ושומרים.
3. **Build → Firestore Database → Create database**. בוחרים מיקום (למשל `eur3`) ומצב **production**.
4. בלשונית **Rules** מדביקים את התוכן של `firestore.rules` מהתיקייה הזו ולוחצים **Publish**.
5. **Project settings (גלגל השיניים) → Your apps → Web (`</>`)**, נותנים שם ונרשמים.
   מעתיקים את האובייקט `firebaseConfig` שמופיע אל הקובץ `firebase-config.js`.

## 2. Deploy ב-Vercel
- מעלים את התיקייה ל-GitHub ומייבאים ב-Vercel.
- Framework Preset: **Other**. את Build Command ו-Output Directory משאירים ריקים.

## 3. אישור הדומיין
ב-Firebase: **Authentication → Settings → Authorized domains → Add domain**,
ומוסיפים את הכתובת מ-Vercel (למשל `hashavua-sheli.vercel.app`) וגם כל דומיין פרטי אם יש.
`localhost` כבר מאושר כברירת מחדל, אז אפשר לבדוק גם מקומית.

## בדיקה מקומית
המודולים לא נטענים מ-`file://`, לכן צריך שרת קטן:
```
py -m http.server 5173
```
ואז לפתוח http://localhost:5173

## איך הנתונים נשמרים
- מחוברת עם Google: כל שבוע נשמר ב-`users/{uid}/weeks/{YYYY-MM-DD}` ומסתנכרן בין כל המכשירים.
- בלי חשבון: נשמר רק בדפדפן הנוכחי. בהתחברות הראשונה, מה שנשמר במכשיר עולה אוטומטית לחשבון.
