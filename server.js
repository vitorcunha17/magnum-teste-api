const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const { MongoClient, ServerApiVersion, Decimal128 } = require("mongodb");
const mongoose = require("mongoose");

const uri =
  "mongodb+srv://vitorribeirocunha:teste123@cluster0.sodwbus.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const tokenSecret = "0P0MGJJzZuFdA5W1HGbS8dtv7WgPt5Ks";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

async function connectToDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

// Middleware para verificar o token JWT
const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token) {
    console.log("No token provided.");
    return res.status(403).send({ auth: false, message: "No token provided." });
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length); // Remove "Bearer " from the token
  }

  jwt.verify(token, tokenSecret, (err, decoded) => {
    if (err) {
      console.log("Failed to authenticate token:", err.message);
      return res
        .status(500)
        .send({ auth: false, message: "Failed to authenticate token." });
    }
    req.userId = decoded.id;
    next();
  });
};

// Rota de registro de usuário
app.post("/register", async (req, res) => {
  try {
    const hashedPassword = bcrypt.hashSync(req.body.password, 8);
    const db = client.db("magnum-test-db");
    const result = await db.collection("users").insertOne({
      email: req.body.email,
      password: hashedPassword,
      saldo: Decimal128.fromString("0.00") // Inicializa o saldo com 0.00
    });
    res.status(200).send({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send("There was a problem registering the user.");
  }
});

// Rota de login
app.post("/login", async (req, res) => {
  try {
    const db = client.db("magnum-test-db");
    const user = await db
      .collection("users")
      .findOne({ email: req.body.email });
    if (!user) return res.status(404).send("No user found.");

    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      user.password
    );
    if (!passwordIsValid)
      return res.status(401).send({ auth: false, token: null });

    const token = jwt.sign({ id: user._id }, tokenSecret, {
      expiresIn: 86400,
    });

    res.status(200).send({ auth: true, token: token });
  } catch (error) {
    console.error("Error on the server:", error);
    res.status(500).send("Error on the server.");
  }
});

// Rota de logout
app.post("/logout", (req, res) => {
  res.status(200).send({ auth: false, token: null });
});

// Rota protegida para visualizar o saldo
app.get("/balance", verifyToken, async (req, res) => {
  try {
    const db = client.db("magnum-test-db");
    const user = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(req.userId) });
    if (!user) return res.status(404).send("No user found.");
    res.status(200).send({ saldo: user.saldo.toString() });
  } catch (error) {
    console.error("Error fetching user's balance:", error);
    res.status(500).send("There was a problem fetching the user's balance.");
  }
});

// Rota protegida (exemplo)
app.get("/me", verifyToken, async (req, res) => {
  try {
    const db = client.db("magnum-test-db");
    const user = await db
      .collection("users")
      .findOne({ _id: new mongoose.Types.ObjectId(req.userId) });
    if (!user) return res.status(404).send("No user found.");
    res.status(200).send(user);
  } catch (error) {
    console.error("Error finding user:", error);
    res.status(500).send("There was a problem finding the user.");
  }
});

// Rota para criar uma nova transferência
app.post("/transfer", verifyToken, async (req, res) => {
  const {
    transactionType,
    bank,
    agency,
    account,
    pixKey,
    value,
    transferDate,
    description,
  } = req.body;

  // Validação básica dos campos obrigatórios
  if (!transactionType || !value || !transferDate) {
    return res.status(400).send({
      message: "Campos obrigatórios: transactionType, value, transferDate.",
    });
  }

  if (transactionType === "TED" && (!bank || !agency || !account)) {
    return res.status(400).send({
      message: "Para TED, campos obrigatórios: bank, agência, account.",
    });
  }

  if (transactionType === "PIX" && !pixKey) {
    return res.status(400).send({
      message: "Para PIX, campo obrigatório: pixKey.",
    });
  }

  try {
    const db = client.db("magnum-test-db");
    const user = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(req.userId) });
    if (!user) return res.status(404).send("No user found.");

    const currentSaldo = parseFloat(user.saldo.toString());
    const transferValue = parseFloat(value);
    const newSaldo = currentSaldo - transferValue;

    if (newSaldo < 0) {
      return res.status(400).send({ message: "Saldo insuficiente." });
    }

    const transferencia = {
      userId: req.userId, // Adiciona o ID do usuário
      transactionType,
      bank,
      agency,
      account,
      pixKey,
      value: Decimal128.fromString(transferValue.toFixed(2)), // Garante que o valor seja ponto flutuante
      transferDate,
      description,
    };

    // Atualiza o saldo do usuário
    await db.collection("users").updateOne(
      { _id: new mongoose.Types.ObjectId(req.userId) },
      { $set: { saldo: Decimal128.fromString(newSaldo.toFixed(2)) } } // Garante que o saldo seja ponto flutuante
    );

    await db.collection("transfers").insertOne(transferencia);
    res.status(200).send({ message: "Transferência realizada com sucesso!" });
  } catch (error) {
    console.error("Error saving the transfer:", error);
    res.status(500).send("There was a problem saving the transfer.");
  }
});

// Rota para obter todas as transferências de um usuário
app.get("/transfers", verifyToken, async (req, res) => {
  try {
    const db = client.db("magnum-test-db");
    const transferencias = await db
      .collection("transfers")
      .find({ userId: req.userId })
      .toArray();
    res.status(200).send(transferencias);
  } catch (error) {
    console.error("Error retrieving the transfers:", error);
    res.status(500).send("There was a problem retrieving the transfers.");
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectToDB();
});
