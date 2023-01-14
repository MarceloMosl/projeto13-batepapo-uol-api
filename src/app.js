import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();

const app = express();
const PORT = 5000;
app.use(cors());
app.use(json());

// const mongoClient = new MongoClient(process.env.MONGO_URL);
// let db;

// mongoClient.connect(() => {
//   db = mongoClient.db();
// });

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);

const dbWasConnected = await mongoClient.connect();

if (dbWasConnected) db = mongoClient.db();

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const exist = await db.collection("participants").findOne({ name });

  if (exist) return res.status(409);

  const schemaJoi = joi.object({
    name: joi.string().required(),
  });

  const validate = schemaJoi.validate(req.body);

  if (validate.error) {
    const errors = validate.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });

    db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((users) => {
      res.send(users);
    });
});

app.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  if (typeof limit == String || limit <= 0)
    return res.status(422).send("quantidade de mensagens invalida");
  try {
    const messages = await db.collection("messages").find().toArray();
    if (!limit) return res.send(messages);
    res.send(messages.slice(-limit));
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const user = req.headers.user;

  const schemaMsg = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required(),
  });

  const validate = schemaMsg.validate(req.body);

  if (validate.error) {
    const errors = validate.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const userExists = await db
      .collection("participants")
      .findOne({ name: user });
    if (!userExists) return res.status(422).send("Usuario Não Existe");

    db.collection("messages").insertOne({
      to,
      text,
      type,
      from: user,
      time: dayjs().format("HH:mm:ss"),
    });
    res.status(201).send("mensagem enviada");
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.listen(PORT, () => console.log("Tst"));
