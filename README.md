# Sistema de Transferências Bancárias

Este projeto é uma API simples para gerenciar transferências bancárias, suportando tanto transferências do tipo TED quanto PIX.

## Tecnologias Utilizadas

- Node.js
- Express

## Funcionalidades

- Realizar transferências do tipo TED ou PIX.
- Listar todas as transferências realizadas.

## Como Executar

Para executar este projeto localmente, siga os passos abaixo:

1. Clone o repositório para sua máquina local.
2. Navegue até a pasta do projeto via terminal.
3. Execute `npm install` para instalar as dependências.
4. Execute `node server.js` para iniciar o servidor.
5. O servidor estará rodando em `http://localhost:3000`.

## Endpoints

### POST /transfer

Realiza uma transferência. Os campos necessários variam de acordo com o tipo de transferência:

- **Campos comuns:** `transactionType`, `value`, `transferDate`.
- **TED:** Além dos campos comuns, `bank`, `agency`, `account`.
- **PIX:** Além dos campos comuns, `pixKey`.

Exemplo de corpo da requisição para TED:

```json
{
  "transactionType": "TED",
  "bank": "001",
  "agency": "1234",
  "account": "123456-7",
  "value": 1000.00,
  "transferDate": "2023-04-01"
}

Exemplo de corpo da requisição para PIX:

```json
{
  "transactionType": "PIX",
  "pixKey": "email@example.com",
  "value": 500.00,
  "transferDate": "2023-04-01"
}