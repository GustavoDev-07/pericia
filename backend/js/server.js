import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import executarQuery from './db.js';

const app = express();

app.use(cors())
app.use(express.json());

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (email === 'teste' && senha === '123456') {

        const token = jwt.sign({ id: 1, email }, 'SEGREDO_SUPER_SECRETO', { expiresIn: '1h' })

        return res.json({ auth: true, token });
    }

    return res.status(401).json({ mensagem: 'Login ou senha inválidos!' })
});

app.get('/cadastro', async(req, res) => {
    res.sendFile(path.join(__dirname, 'cadastro.html'))
});

app.post('/cadastro', async (req, res) => {
    // const{nome, email, data_nascimento, cpf_cnpj, senha, confirmacao_senha} = req.body;

    var query = `
        INSERT INTO usuarios(
            nome,
            email,
            data_nascimento,
            cpf_cnpj,
            senha
        )VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
        )
    `

    var usuario = [
        req.body.nome,
        req.body.email,
        req.body.data_nascimento,
        req.body.cpf_cnpj,
        req.body.senha
    ];

    let resultado = await executarQuery(query, usuario);

    try {
        res.send({
            insertId: resultado[0].insertId
        })
    }
    catch {
        res.send({
            insertId: null
        })
    }
})

app.get('/meus-servicos:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const [linhas] = await db.query(
            'SELECT * FROM usuarios WHERE id = ?',
            [userId]
        );

        if (linhas.length === 0) {
            return res.status(404).json({ mensagem: 'Nenhum dispositivo encontrado para este usuário.' });
        }

        return res.json(linhas);
        
        }catch (error) {
            console.error('Erro ao buscar dados: ', error)
            res.status(500).json({ erro: 'Erro interno do servidor.' })
        }

})

app.post('/feedback:id', async (req, res) => {

    var query = `
    INSERT INTO feedback(
        nome, 
        email,
        assunto,
        mensagem
    )VALUES (
        ?,
        ?,
        ?,
        ?
    )
    `

    var feedback = [
        req.body.nome,
        req.body.email,
        req.body.assunto,
        req.body.mensagem
    ]

    let resultado = await executarQuery(query, feedback);

    try {
        res.send({
            insertId: resultado[0].insertId
        })
    }
    catch {
        res.send({
            insertId: null
        })
    }
})

app.listen(3000, () => {
    console.log("Servidor online em: http://localhost:3000")
})