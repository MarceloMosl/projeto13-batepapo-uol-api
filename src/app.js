import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();

const app = express();
const PORT = 5000;
app.use(cors());
app.use(json());

let db;
const mongoClient = new MongoClient(process.env.DATABASE_URL);

const dbWasConnected = await mongoClient.connect();

if (dbWasConnected) db = mongoClient.db();

removeUsers();

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const exist = await db.collection("participants").findOne({ name });

  if (exist) return res.status(409).send("usuario ja existe");

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
  const limit = req.query.limit;
  const user = req.headers.user;
  if ((limit && isNaN(req.query.limit)) || limit <= 0)
    return res.status(422).send("quantidade de mensagens invalida");
  try {
    const messages = await db
      .collection("messages")
      .find({ $or: [{ to: user }, { from: user }, { to: "Todos" }] })
      .toArray();

    if (!limit) return res.send(messages.reverse());
    res.send(messages.slice(-limit).reverse());
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

app.post("/status", async (req, res) => {
  const { user } = req.headers;
  if (!user) return res.status(400).send("Bad request");
  try {
    const userOnline = await db
      .collection("participants")
      .findOne({ name: user });

    if (!userOnline) return res.status(404).send("usuario nao existe");

    await db
      .collection("participants")
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });

    return res.send(200);
  } catch (error) {
    res.send(error);
  }
});

setInterval(removeUsers, 8000);

async function removeUsers() {
  const inativeTime = Date.now() - 10000;
  try {
    const inativeUsers = await db.collection("participants").find({}).toArray();
    inativeUsers.forEach(async (element) => {
      if (element.lastStatus < inativeTime) {
        await db.collection("participants").deleteOne({ name: element.name });

        await db.collection("messages").insertOne({
          from: element.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format("HH:mm:ss"),
        });
      }
    }); // delete User
  } catch (error) {
    return error;
  }
}

// DELETE

app.delete("/messages/:id", async (req, res) => {
  const user = req.headers.user;
  const id = req.params;

  const msgs = await db.collection("messages").findOne({ _id: ObjectId(id) });

  if (!msgs) return res.status(404).send("mensagem nao existe");
  console.log(msgs);

  if (msgs.from === user) {
    await db.collection("messages").deleteOne({ _id: ObjectId(id) });
    return res.status(200).send("Mensagem Excluida");
  } else {
    return res.status(401).send("Não autorizado");
  }
});

app.listen(PORT, () => console.log("Tst"));
