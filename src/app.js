import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("projeto14"); //O padrão é test
});

const server = express();
server.use(cors());
server.use(json());

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  if (!name)
    return res.sendStatus(422).send(alert("name deve ser string não vazio"));

  const exist = await db.collection("participants").findOne({ name });

  if (exist) return res.sendStatus(409).send(alert("usuario em uso"));

  try {
    db.collection("participants").insertOne({ name });
    res.send("usuario Cadastrado");
  } catch (err) {
    res.send(err);
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
