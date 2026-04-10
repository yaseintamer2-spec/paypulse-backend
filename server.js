const express = require("express");
const app = express();

app.use(express.json());

// --------------------
// MEMORY DATABASE
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
app.get("/cpx-postback", (req, res) => {
  console.log("CPX REQUEST:", req.query);

  const userId = req.query.user_id;
  const amountUsd = Number(req.query.amount_usd);
  const amountLocal = Number(req.query.amount_local);
  const transId = req.query.trans_id;
  const status = Number(req.query.status);

  // VALIDATION (prevents invalid request error)
  if (!userId || !transId || isNaN(amountUsd) || isNaN(status)) {
    console.log("INVALID REQUEST:", req.query);
    return res.status(400).send("invalid request");
  }

  // INIT USER
  if (!users[userId]) {
    users[userId] = {
      balance: 0,
      transactions: {}
    };
  }

  // STATUS 1 = PENDING (ADD MONEY)
  if (status === 1) {
    if (!users[userId].transactions[transId]) {
      users[userId].transactions[transId] = amountUsd;
      users[userId].balance += amountUsd;

      console.log(`ADD: ${userId} +${amountUsd}`);
    }
  }

  // STATUS 2 = REVERSED (REMOVE MONEY)
  if (status === 2) {
    const amount = users[userId].transactions[transId];

    if (amount) {
      users[userId].balance -= amount;
      delete users[userId].transactions[transId];

      console.log(`REVERSE: ${userId} -${amount}`);
    }
  }

  res.send("ok");
});

// --------------------
// BALANCE API
// --------------------
app.get("/balance/:userId", (req, res) => {
  const userId = req.params.userId;

  res.json({
    userId: userId,
    balance: users[userId]?.balance || 0
  });
});

// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("PayPulse running on port", PORT);
});
