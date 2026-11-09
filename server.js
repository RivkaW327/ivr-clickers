const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// אתחול Firebase Admin
// יש להדביק כאן את כתובת ה-Realtime Database שלך
admin.initializeApp({
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
});
const db = admin.database();

// נקודת הקצה שאליה ימות המשיח פונה
app.get('/api/ivr', async (req, res) => {
  // פרמטרים שמתקבלים אוטומטית מימות המשיח
  const phone = req.query.ApiPhone || req.query.phone || "anon";
  const digits = req.query.ApiDigits; // ההקשה של המשתמש (1, 2, 3)

  try {
    // 1. בדיקת השאלה הנוכחית והאם ההצבעה פתוחה
    const stateSnap = await db.ref('gameState').once('value');
    const state = stateSnap.val() || { currentQuestion: 0, isOpenForVoting: true };

    const { currentQuestion, isOpenForVoting } = state;

    // 2. אם המשתמש הקיש תשובה (1, 2, או 3)
    if (digits && ['1', '2', '3'].includes(digits)) {
      if (isOpenForVoting) {
        // שמירת ההצבעה לפי מספר הטלפון תחת השאלה הפעילה
        await db.ref(`votes/question_${currentQuestion}/${phone}`).set({
          choice: digits,
          timestamp: Date.now()
        });

        // הודעה קולית שהתשובה נקלטה, ולולאת המתנה לשאלה הבאה
        // read שומר את השיחה פתוחה וממתין להקשה הבאה בלי לנתק
        const responseText = "id_list_message=t-תשובתך נקלטה.&read=t-המתינו לשאלה הבאה=ApiDigits,no,1,1,15,Number,no";
        return res.send(responseText);
      } else {
        const responseText = "id_list_message=t-ההצבעה לשאלה זו נסגרה.&read=t-המתינו לפתיחת השאלה הבאה=ApiDigits,no,1,1,10,Number,no";
        return res.send(responseText);
      }
    }

    // 3. כניסה ראשונית לשלוחה או מעבר שאלה – בקשת הקשה מהמשתמש
    // קולט תו אחד (1-3) וממתין עד 10 שניות
    const prompt = "read=t-בחרו תשובה אחת, שתיים או שלוש=ApiDigits,no,1,1,10,Number,no";
    return res.send(prompt);

  } catch (error) {
    console.error("שגיאה בטיפול בשיחה:", error);
    return res.send("id_list_message=t-חלה שגיאה במערכת.&hangup");
  }
});

// בדיקת תקינות פשוטה בדפדפן
app.get('/', (req, res) => {
  res.send('שרת קליקרים פעיל ומאזין לימות המשיח');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
