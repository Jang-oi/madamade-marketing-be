import express from "express";
import cors from 'cors';
import router from './src/routes/router.js'

const app = express();

app.use(cors());
app.use(express.json());
app.use('/mada/api/v1', router);

export default app;