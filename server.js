const express = require("express");
const app = express();

app.use(express.json());

// simple memory database
let users = {};

// CPX POSTBACK (receives earnings)
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

// CHECK BALANCE
app.get("/balance/:userId", (req, res) => {
  const balance = users[req.params.userId] || 0;
  res.json({ balance });
});

// START SERVER
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
