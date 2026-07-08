import { Router } from "express";
const router = Router();

router.post('/enviar', async (req, res) => {

    if (!nome || !email || !assunto || !mensagem) {
        return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }

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


    try {
        let resultado = await executarQuery(query, feedback);

        return res.status(201).json({
            mensagem: "Feedback enviado com sucesso!",
            insertId: resultado.insertId
        });
    } catch (error) {
        console.error("Erro ao salvar feedback:", error);
        return res.status(500).json({ erro: "Erro interno ao salvar feedback." });
    }
})

export default router;