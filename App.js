import express from "express";
import cors from 'cors';
import router from './src/routes/router.js'
import {defaultPath} from "./src/utils/common.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(`${defaultPath}/build`));

app.get('*', (req, res) => {
    res.sendFile(`${defaultPath}/build/index.html`);
});
app.use('/mada/api/v1', router);

export default app;