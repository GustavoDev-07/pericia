import express from 'express';
const dirname = import.meta.dirname

const app = express();

app.use(express.static(dirname))

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
})