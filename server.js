const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// זיכרון המשחק
let gameState = {
  currentQuestion: 0,
  isOpenForVoting: true
};

let votes = {};

// 1. ממשק מול ימות המשיח
app.get('/api/ivr', (req, res) => {
  const phone = req.query.ApiPhone || req.query.phone || "anon";
  
  let rawVote = req.query.Vote;
  if (!rawVote && req.query.ApiDigits && !['1', '2', '3'].includes(req.query.ApiExtension)) {
    rawVote = req.query.ApiDigits;
  }

  const vote = Array.isArray(rawVote) ? String(rawVote[rawVote.length - 1]).trim() : (rawVote ? String(rawVote).trim() : null);
  const currentQ = gameState.currentQuestion;

  console.log(`[IVR Call] Phone: ${phone} | Pressed: "${vote}" | Current Q: ${currentQ} | IsOpen: ${gameState.isOpenForVoting}`);

  // מקרה א': נקלטה לחיצה על 1, 2 או 3
  if (vote && ['1', '2', '3'].includes(vote)) {
    if (gameState.isOpenForVoting) {
      if (!votes[currentQ]) votes[currentQ] = {};
      votes[currentQ][phone] = vote;

      console.log(`-> Vote SAVED for Q${currentQ}: Phone ${phone} voted ${vote}`);

      // אומר "נקלט", מאפשר להקיש מיד שוב (yes), קולט ספרה אחת ללא שום בקשת אישור (digits,no,no)
      const responseText = "read=t-נקלט=Vote,yes,1,1,60,digits,no,no";
      return res.send(responseText);
    } else {
      console.log(`-> Vote REJECTED: Voting is closed for Q${currentQ}`);
      const responseText = "read=t-ההצבעה סגורה=Vote,yes,1,1,60,digits,no,no";
      return res.send(responseText);
    }
  }

  // מקרה ב': כניסה ראשונית או המתנה לשאלה
  // משמיע הנחיה קצרה וממתין להקשה שתיקלט מיד ללא אישור
  const prompt = "read=t-נא לבחור תשובה=Vote,yes,1,1,60,digits,no,no";
  return res.send(prompt);
});

// 2. עדכון מצב השאלה ממסך המשחק (HTML)
app.get('/api/set-question', (req, res) => {
  const q = parseInt(req.query.q, 10);
  if (!isNaN(q)) {
    gameState.currentQuestion = q;
  }
  gameState.isOpenForVoting = req.query.open !== 'false';

  if (!votes[gameState.currentQuestion]) {
    votes[gameState.currentQuestion] = {};
  }

  console.log(`[UI State] Switched to Question: ${gameState.currentQuestion} | Open: ${gameState.isOpenForVoting}`);
  res.json({ success: true, gameState });
});

// 3. משיכת תוצאות בזמן אמת למסך המשחק
app.get('/api/get-votes', (req, res) => {
  let q = parseInt(req.query.q, 10);
  if (isNaN(q)) q = gameState.currentQuestion;

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

// משפט בדיקה לווידוא שהגרסה החדשה עלתה לאוויר
app.get('/', (req, res) => {
  res.send('גרסה 3 פעילה: ללא אישור הקשה');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
