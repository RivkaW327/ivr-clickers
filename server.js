const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// זיכרון פנימי לניהול המשחק וההצבעות (ללא צורך במסד חיצוני)
let gameState = {
  currentQuestion: 0,
  isOpenForVoting: true
};

// מבנה: { 0: { "0501234567": "1", "0527654321": "3" } }
let votes = {};

// 1. ממשק מול ימות המשיח (שיחות טלפון)
app.get('/api/ivr', (req, res) => {
  const phone = req.query.ApiPhone || req.query.phone || "anon";
  const digits = req.query.ApiDigits; // מקש שהוקש: 1, 2 או 3

  const currentQ = gameState.currentQuestion;

  if (digits && ['1', '2', '3'].includes(digits)) {
    if (gameState.isOpenForVoting) {
      if (!votes[currentQ]) votes[currentQ] = {};
      votes[currentQ][phone] = digits; // שמירת ההצבעה

      const responseText = "id_list_message=t-תשובתך נקלטה.&read=t-המתינו לשאלה הבאה=ApiDigits,no,1,1,15,Number,no";
      return res.send(responseText);
    } else {
      const responseText = "id_list_message=t-ההצבעה לשאלה זו נסגרה.&read=t-המתינו לפתיחת השאלה הבאה=ApiDigits,no,1,1,10,Number,no";
      return res.send(responseText);
    }
  }

  // תפריט כניסה או המתנה להקשה
  const prompt = "read=t-בחרו תשובה אחת שתיים או שלוש=ApiDigits,no,1,1,10,Number,no";
  return res.send(prompt);
});

// 2. עדכון מצב השאלה ממסך המשחק (HTML)
app.get('/api/set-question', (req, res) => {
  const q = parseInt(req.query.q) || 0;
  const open = req.query.open !== 'false';

  gameState.currentQuestion = q;
  gameState.isOpenForVoting = open;

  if (!votes[q]) votes[q] = {};
  res.json({ success: true, gameState });
});

// 3. משיכת תוצאות בזמן אמת למסך המשחק
app.get('/api/get-votes', (req, res) => {
  const q = parseInt(req.query.q) || gameState.currentQuestion;
  const qVotes = votes[q] || {};

  const counts = { '1': 0, '2': 0, '3': 0 };
  const allPhones = Object.keys(qVotes);
  const total = allPhones.length;

  allPhones.forEach(phone => {
    const val = qVotes[phone];
    if (counts[val] !== undefined) counts[val]++;
  });

  res.json({
    question: q,
    counts,
    total,
    isOpen: gameState.isOpenForVoting
  });
});

// בדיקת תקינות
app.get('/', (req, res) => {
  res.send('שרת הקליקרים פעיל ועובד עצמאית.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
