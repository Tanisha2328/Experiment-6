const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ===============================
// 1. MongoDB Connection
// ===============================
mongoose.connect("mongodb://127.0.0.1:27017/bankDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ===============================
// 2. Schemas
// ===============================
const accountSchema = new mongoose.Schema({
    name: String,
    balance: Number
});

const transactionSchema = new mongoose.Schema({
    from: String,
    to: String,
    amount: Number,
    status: String,
    date: { type: Date, default: Date.now }
});

const Account = mongoose.model("Account", accountSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

// ===============================
// 3. Transfer Money (ACID Transaction)
// ===============================
app.post("/transfer", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { from, to, amount } = req.body;

        const sender = await Account.findOne({ name: from }).session(session);
        const receiver = await Account.findOne({ name: to }).session(session);

        if (!sender || !receiver) {
            throw new Error("Account not found");
        }

        if (sender.balance < amount) {
            throw new Error("Insufficient balance");
        }

        // Debit sender
        sender.balance -= amount;
        await sender.save({ session });

        // Credit receiver
        receiver.balance += amount;
        await receiver.save({ session });

        // Log transaction
        await Transaction.create([{
            from,
            to,
            amount,
            status: "SUCCESS"
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: "Transaction Successful" });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        res.status(400).json({
            message: "Transaction Failed",
            error: error.message
        });
    }
});

// ===============================
// 4. Create Account
// ===============================
app.post("/create", async (req, res) => {
    const { name, balance } = req.body;

    const acc = new Account({ name, balance });
    await acc.save();

    res.json({ message: "Account created", acc });
});

// ===============================
// 5. View Accounts
// ===============================
app.get("/accounts", async (req, res) => {
    const data = await Account.find();
    res.json(data);
});

// ===============================
// 6. View Transactions (Audit Log)
// ===============================
app.get("/transactions", async (req, res) => {
    const data = await Transaction.find();
    res.json(data);
});

// ===============================
// 7. Start Server
// ===============================
app.listen(3000, () => {
    console.log("Server running on port 3000");
});