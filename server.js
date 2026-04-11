const express = require("express");
const app = express();

app.use(express.json());

// =====================
// SUPABASE SETUP
// =====================
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://bhiyffflmcygmplbiify.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoaXlmZmZsbWN5Z21wbGJpaWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDEwODQsImV4cCI6MjA5MTQxNzA4NH0.7a4VP4ol0WI9Vv5-j3B8PWk8buUOG68oZjXi7xJYvfE"
);

// =====================
// HOME ROUTE
// =====================
app.get("/", (req, res) => {
  res.send("PayPulse backend is running");
});

// =====================
// CPX POSTBACK
// =====================
app.get("/cpx-postback", async (req, res) => {
  const userId = req.query.user_id;
  const amountUsd = Number(req.query.amount_usd);
  const transId = req.query.trans_id;
  const status = Number(req.query.status);

  if (!userId || !transId || isNaN(amountUsd) || isNaN(status)) {
    return res.status(400).send("invalid request");
  }

  // =====================
  // GET USER
  // =====================
  let { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)
    .single();

  // CREATE USER IF NOT EXISTS
  if (!user) {
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        user_id: userId,
        balance: 0
      })
      .select()
      .single();

    user = newUser;
  }

  // =====================
  // SPLIT LOGIC (35% YOU / 65% USER)
  // =====================
  const userCut = amountUsd * 0.65;
  const adminCut = amountUsd * 0.35;

  // =====================
  // ADD MONEY
  // =====================
  if (status === 1) {
    await supabase
      .from("users")
      .update({
        balance: user.balance + userCut
      })
      .eq("user_id", userId);

    console.log("Admin earned:", adminCut);
  }

  // =====================
  // REVERSE MONEY
  // =====================
  if (status === 2) {
    await supabase
      .from("users")
      .update({
        balance: user.balance - userCut
      })
      .eq("user_id", userId);
  }

  console.log("CPX EVENT:", req.query);

  res.send("ok");
});

// =====================
// BALANCE API
// =====================
app.get("/balance/:userId", async (req, res) => {
  const userId = req.params.userId;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)
    .single();

  res.json({
    userId,
    balance: data?.balance || 0
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("PayPulse running on port", PORT);
});
