import express from "express";
import cors from 'cors';
import path from 'path';
import router from './src/routes/router.js'

const app = express();
const __dirname = path.resolve();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'resources/app/build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'resources/app/build', 'index.html'));
});
app.use('/mada/api/v1', router);

export default app;