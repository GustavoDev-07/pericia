import express from 'express';
import path from 'path';

const dirname = path.resolve(import.meta.dirname, '..')

const app = express();

app.use(express.static(dirname))

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
})