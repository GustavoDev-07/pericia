import express from 'express';
import cors from 'cors';

const rotasUsuarios = require('./routes/usuarios.js')
const rotasFeedbacks = require('./routes/feedbacks.js')
const rotasDispositivos = require('./routes/dispositivos.js')

const app = express();

app.use(cors())
app.use(express.json());

app.use('/api/auth', rotasUsuarios);
app.use('/api/feedbacks', rotasFeedbacks);
app.use('/api/dispositivos', rotasDispositivos);

app.listen(3000, () => {
    console.log("Servidor online em: http://localhost:3000")
}); 