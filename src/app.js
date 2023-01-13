import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db(); //O padrão é test
});

const server = express();
server.use(cors());
server.use(json());

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const exist = await db.collection("participants").findOne({ name });

  if (!name) return res.status(422).send("name deve ser string não vazio");

  if (exist) return res.status(409).send("usuario em uso");

  try {
    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });

    await db.collection("messages").insertOne({
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

server.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((users) => {
      res.send(users);
    });
});

server.listen(5000, () => console.log("Tst"));
