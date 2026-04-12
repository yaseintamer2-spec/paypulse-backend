// ===============================
// PAYPULSE BACKEND (PRODUCTION)
// ===============================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// ENV VARIABLES (PUT IN RENDER)
// ===============================

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const CPX_APP_ID = process.env.CPX_APP_ID;
const CPX_SECRET = process.env.CPX_SECRET;

// profit split
const USER_PERCENT = 0.60;
const PLATFORM_PERCENT = 0.40;

// ===============================
// INIT SUPABASE
// ===============================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===============================
// HEALTH CHECK
// ===============================

app.get("/", (req, res) => {
  res.send("API running");
});

// ===============================
// CREATE USER
// ===============================

app.post("/create-user", async (req, res) => {
  const { userId, email } = req.body;

  const { data, error } = await supabase
    .from("users")
    .insert({
      user_id: userId,
      email: email,
      balance: 0,
      profile_completed: false,
      bonus_claimed: false
    });

  if (error) return res.status(500).json({ error });

  res.json({ success: true });
});

// ===============================
// GET BALANCE
// ===============================

app.get("/balance/:userId", async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) return res.status(500).json({ error });

  res.json({ balance: data.balance });
});

// ===============================
// COMPLETE PROFILE (+$1 BONUS)
// ===============================

app.post("/complete-profile", async (req, res) => {
  const { userId, country, gender, birth_year } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return res.status(500).json({ error });

  if (user.profile_completed) {
    return res.json({ message: "Already completed" });
  }

  let newBalance = user.balance;

  if (!user.bonus_claimed) {
    newBalance += 1.0;
  }

  await supabase
    .from("users")
    .update({
      country,
      gender,
      birth_year,
      profile_completed: true,
      bonus_claimed: true,
      balance: newBalance
    })
    .eq("user_id", userId);

  res.json({ success: true, newBalance });
});

// ===============================
// GET SURVEYS (CPX API)
// ===============================

app.get("/get-surveys/:userId", async (req, res) => {
  const { userId } = req.params;

  const userIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = encodeURIComponent(req.headers["user-agent"]);

  const secureHash = crypto
    .createHash("md5")
    .update(userId + "-" + CPX_SECRET)
    .digest("hex");

  const url = `https://live-api.cpx-research.com/api/get-surveys.php?app_id=${CPX_APP_ID}&ext_user_id=${userId}&output_method=api&ip_user=${userIP}&user_agent=${userAgent}&limit=12&secure_hash=${secureHash}`;

  try {
    const response = await axios.get(url);
    const surveys = response.data.surveys || [];

    // modify payout for user (60%)
    const formatted = surveys.map((s) => ({
      id: s.id,
      payout: s.payout,
      loi: s.loi,
      conversion_rate: s.conversion_rate,
      reward_user: (s.payout * USER_PERCENT).toFixed(2),
      href: s.href
    }));

    res.json({ surveys: formatted });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch surveys" });
  }
});

// ===============================
// CPX POSTBACK (EARNINGS)
// ===============================

app.get("/cpx-postback", async (req, res) => {
  const { user_id, amount_usd, trans_id, status } = req.query;

  if (!user_id || !amount_usd || !trans_id) {
    return res.status(400).send("Missing params");
  }

  // check duplicate transaction
  const { data: existing } = await supabase
    .from("transactions")
    .select("*")
    .eq("trans_id", trans_id)
    .single();

  if (existing) {
    return res.send("Duplicate ignored");
  }

  const amount = parseFloat(amount_usd);
  const userAmount = amount * USER_PERCENT;
  const platformAmount = amount * PLATFORM_PERCENT;

  // get user
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", user_id)
    .single();

  if (!user) return res.send("User not found");

  let newBalance = user.balance;

  if (status == 1) {
    newBalance += userAmount;
  }

  if (status == 2) {
    newBalance -= userAmount;
  }

  // update balance
  await supabase
    .from("users")
    .update({ balance: newBalance })
    .eq("user_id", user_id);

  // save transaction
  await supabase.from("transactions").insert({
    trans_id,
    user_id,
    amount: userAmount,
    platform_amount: platformAmount,
    status: status == 1 ? "completed" : "reversed"
  });

  res.send("OK");
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
