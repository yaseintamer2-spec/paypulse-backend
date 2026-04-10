const express = require("express");
const app = express();

app.use(express.json());

// --------------------
// SIMPLE DATABASE (RAM)
// --------------------
let users = {};

// --------------------
// HOME ROUTE
// --------------------
app.get("/", (req, res) => {
  res.send("PayPulse backend is running");
});

// --------------------
// CPX POSTBACK
// --------------------
// CPX sends:
// ext_user_id = user id
// reward_value = money earned
// --------------------
app.get("/cpx-postback", (req, res) => {
  const userId = req.query.ext_user_id;
  const reward = Number(req.query.reward_value);

  if (!userId || isNaN(reward)) {
    return res.status(400).send("invalid request");
  }

  if (!users[userId]) {
    users[userId] = 0;
  }

  users[userId] += reward;

  console.log(`User ${userId} earned ${reward}`);

  res.send("ok");
});

// --------------------
// BALANCE CHECK
// --------------------
app.get("/balance/:userId", (req, res) => {
  const userId = req.params.userId;

  res.json({
    userId: userId,
    balance: users[userId] || 0
  });
});

// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("PayPulse running on port", PORT);
});
