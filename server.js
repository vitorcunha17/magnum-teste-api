const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(cors()); // Use o CORS aqui para permitir requisições de diferentes origens
app.use(bodyParser.json());

// Simulação de bank de dados de usuários
let users = [];

// Middleware para verificar o token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token)
    return res.status(403).send({ auth: false, message: "No token provided." });

  jwt.verify(token, "your_secret_pixKey", (err, decoded) => {
    // Adicione sua pixKey secreta aqui
    if (err)
      return res
        .status(500)
        .send({ auth: false, message: "Failed to authenticate token." });
    req.userId = decoded.id;
    next();
  });
};

// Rota de registro de usuário
app.post("/register", (req, res) => {
  const hashedPassword = bcrypt.hashSync(req.body.password, 8);
  const user = {
    id: users.length + 1,
    email: req.body.email,
    password: hashedPassword,
  };
  users.push(user);
  res.status(200).send({ message: "User registered successfully!" });
});

// Rota de login
app.post("/login", (req, res) => {
  const user = users.find((u) => u.email === req.body.email);
  if (!user) return res.status(404).send("No user found.");

  const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
  if (!passwordIsValid)
    return res.status(401).send({ auth: false, token: null });

  const token = jwt.sign({ id: user.id }, "your_secret_pixKey", {
    expiresIn: 86400,
  }); // Expira em 24 horas, adicione sua pixKey secreta aqui

  res.status(200).send({ auth: true, token: token });
});

// Rota de logout
app.post("/logout", (req, res) => {
  res.status(200).send({ auth: false, token: null });
});

// Rota protegida (exemplo)
app.get("/me", verifyToken, (req, res) => {
  const user = users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).send("No user found.");

  res.status(200).send(user);
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Definir o array de transferências fora das rotas
let transferencias = [{
    "transactionType": "TED",
    "bank": "001",
    "agency": "1234",
    "account": "123456-7",
    "value": "1002",
    "transferDate": "2023-04-01",
    "description": "Pagamento de serviço"
},
{
    "transactionType": "TED",
    "bank": "001",
    "agency": "1234",
    "account": "123456-7",
    "value": "1001",
    "transferDate": "2023-04-01",
    "description": "Pagamento de serviço"
},
{
    "transactionType": "TED",
    "bank": "001",
    "agency": "1234",
    "account": "123456-7",
    "value": "1004",
    "transferDate": "2024-06-25T03:00:00.000Z",
    "description": "Pagamento de serviço"
},
{
    "description" : "teste",
    "pixKey" : "45134552843",
    "transactionType" : "PIX",
    "transferDate" : "2024-06-25T03:00:00.000Z",
    "value" : "500"
}
];

app.post("/transfer", (req, res) => {
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

  // Criar um objeto de transferência com os dados recebidos
  const transferencia = {
    transactionType,
    bank,
    agency,
    account,
    pixKey,
    value,
    transferDate,
    description,
  };

  // Salvar a transferência no array
  transferencias.push(transferencia);

  // Responder com sucesso
  res.status(200).send({ message: "Transferência realizada com sucesso!" });
});

app.get("/transfers", (req, res) => {
  res.status(200).send(transferencias);
});
