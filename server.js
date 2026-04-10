const express = require("express");
const app = express();

app.use(express.json());

let users = {};

// HOME (fixes "Not Found")
app.get("/", (req, res) => {
  res.send("PayPulse backend is running");
});

// CPX POSTBACK
app.get("/cpx-postback", (req, res) => {
  const userId = req.query.ext_user_id;
  const reward = Number(req.query.reward_value);

  if (!userId || !reward) {
    return res.status(400).send("bad request");
  }

  if (!users[userId]) users[userId] = 0;

  users[userId] += reward;

  res.send("ok");
});

// BALANCE
app.get("/balance/:userId", (req, res) => {
  const userId = req.params.userId;

  res.json({
    userId,
    balance: users[userId] || 0
  });
});

app.listen(3000, () => {
  console.log("running");
});
