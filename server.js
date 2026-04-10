const express = require("express");
const app = express();

app.use(express.json());

/*
  SIMPLE IN-MEMORY DATABASE
  (resets if server restarts)
*/
let users = {};

// HOME ROUTE (fixes "Not Found")
app.get("/", (req, res) => {
  res.send("PayPulse backend is running");
});

// CPX POSTBACK ROUTE
// CPX sends reward data here
app.get("/cpx-postback", (req, res) => {
  const userId = req.query.ext_user_id;
  const reward = parseFloat(req.query.reward_value);

  if (!userId || !reward) {
    return res.send("missing data");
  }

  if (!users[userId]) {
    users[userId] = 0;
  }

  users[userId] += reward;

  console.log(`User ${userId} earned ${reward}`);

  res.send("ok");
});

// BALANCE CHECK ROUTE
app.get("/balance/:userId", (req, res) => {
  const userId = req.params.userId;

  res.json({
    user: userId,
    balance: users[userId] || 0
  });
});

// START SERVER
app.listen(3000, () => {
  console.log("PayPulse backend running on port 3000");
});
