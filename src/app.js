import express from "express";
import cors from "cors";
import { json } from "express/lib/response";

const server = express();
server.use(cors());
server.use(json);

server.listen(5000, () => console.log("Tst"));
