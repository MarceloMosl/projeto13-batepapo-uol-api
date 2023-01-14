import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);
let db;

mongoClient.connect(() => {
  db = mongoClient.db();
});

const app = express();
const PORT = 5000;
app.use(cors());
app.use(json());

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const exist = await db.collection("participants").findOne({ name });

  if (!name) return res.status(422).send("name deve ser string não vazio");

  if (exist) return res.status(409).send("usuario em uso");

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
  try {
    const messages = await db.collection("messages").find().toArray();
    if (!limit) return res.send(messages.reverse());
    res.send(messages.slice(-limit).reverse());
  } catch (error) {
    res.status(500).send(error);
  }
});

app.listen(PORT, () => console.log("Tst"));
