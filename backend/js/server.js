import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import executarQuery from './db.js';

const app = express();

app.use(cors())
app.use(express.json());

// app.post('/login', async (req, res) => {
//     const { email, senha } = req.body;

//     if (email === 'teste' && senha === '123456') {

//         const token = jwt.sign({ id: 1, email }, 'SEGREDO_SUPER_SECRETO', { expiresIn: '1h' })

//         return res.json({ auth: true, token });
//     }

//     return res.status(401).json({ mensagem: 'Login ou senha inválidos!' })
// });

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    // 1. Validação básica de campos vazios
    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios!' });
    }

    // 2. Query para buscar o usuário pelo e-mail
    const query = 'SELECT id, nome, email, senha FROM usuarios WHERE email = ?';

    try {
        const resultado = await executarQuery(query, [email]);

        // Dependendo do mysql2, o resultado pode vir direto ou dentro de uma array
        const usuarios = resultado.insertId === undefined ? resultado : resultado[0];

        // 3. Verifica se o usuário foi encontrado
        if (!usuarios || usuarios.length === 0) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        const usuarioEncontrado = usuarios[0];

        // 4. Verifica se a senha bate
        // NOTA: Se você salvou a senha criptografada no cadastro, precisará usar o bcrypt aqui.
        // Se salvou em texto limpo (apenas para testes), a comparação direta funciona:
        if (usuarioEncontrado.senha !== senha) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        // 5. Se tudo estiver certo, gera o Token JWT com os dados reais do banco
        const token = jwt.sign(
            { id: usuarioEncontrado.id, email: usuarioEncontrado.email }, 
            'SEGREDO_SUPER_SECRETO', 
            { expiresIn: '1h' }
        );

        // Retorna sucesso para o Frontend
        return res.json({ 
            auth: true, 
            token, 
            usuario: { nome: usuarioEncontrado.nome, email: usuarioEncontrado.email } 
        });

    } catch (erro) {
        console.error('Erro ao verificar login no banco:', erro);
        return res.status(500).json({ mensagem: 'Erro interno no servidor ao tentar logar.' });
    }
});

// app.get('/cadastro', async(req, res) => {
//     res.sendFile(path.join(__dirname, 'cadastro.html'))
// });

app.post('/cadastro', async (req, res) => {
    // const{nome, email, data_nascimento, cpf_cnpj, senha, confirmacao_senha} = req.body;

    var query = `
        INSERT INTO usuarios(
            nome,
            email,
            dataNascimento,
            cpfCnpj,
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
        req.body.dataNascimento,
        req.body.cpfCnpj,
        req.body.senha
    ];

    let resultado = await executarQuery(query, usuario);

    try {
        let resultado = await executarQuery(query, usuario);
        res.send({
            insertId: resultado.insertId || (resultado[0] && resultado[0].insertId)
        })
    }
    catch (erro) {
        console.error("Erro ao cadastrar:", erro);
        res.status(500).send({
            insertId: null,
            mensagem: "Erro ao salvar no banco de dados."
        });
    }
})

app.get('/meus-servicos/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const [linhas] = await executarQuery(
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

app.post('/feedback/:id', async (req, res) => {

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