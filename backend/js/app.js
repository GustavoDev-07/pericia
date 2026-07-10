import express from 'express';
import cors from 'cors';

import rotasUsuarios from './routes/usuarios.js'
import rotasFeedbacks from './routes/feedbacks.js'
import rotasDispositivos from './routes/dispositivos.js'

const app = express();

app.use(cors())
app.use(express.json());

app.use('/api/auth', rotasUsuarios);
app.use('/api/feedbacks', rotasFeedbacks);
app.use('/api/dispositivos', rotasDispositivos);
app.use('/uploads', express.static('uploads'));

export default app;