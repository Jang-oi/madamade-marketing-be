import express from "express";
import cors from 'cors';
import router from './src/routes/router.js'
const app = express();

app.use(cors());
app.use(express.json());
app.use('/', router);

app.listen(3001, () => {
    console.log('서버 시작');
});