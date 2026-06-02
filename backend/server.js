import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'

const app = express();

app.use(cors())
app.use(express.json());

app.post('/login', async(req, res) => {
    const {email, senha} = req.body;

    if (email === 'teste' && senha === '123456'){

        const token = jwt.sign({id: 1, email}, 'SEGREDO_SUPER_SECRETO', {expiresIn: '1h'})

        return res.json({auth: true, token});
    }

    return res.status(401).json({mensagem: 'Login ou senha inválidos!'})
});

app.listen(3000, () => {
    console.log("Servidor online em : http://localhost:3000")
})