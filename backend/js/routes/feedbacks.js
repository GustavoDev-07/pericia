import { Router } from "express";
const router = Router();

router.post('/enviar', async (req, res) => {
    
    const { nome, email, assunto, mensagem } = req.body;

    if (!nome || !email || !assunto || !mensagem) {
        return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }

    const dadosFeedback = [nome, email, assunto, mensagem];

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

    
    try {
        let [resultado] = await executarQuery(query, dadosFeedback);
        return res.status(201).json({
            mensagem: "Feedback enviado com sucesso!",
            insertId: resultado.insertId || (resultado[0] && resultado[0].insertId)
        });
    }
    catch (error) {
        console.error("Erro ao salvar feedback:", error);
        return res.status(500).json({ erro: "Erro interno ao salvar feedback." });
    }
})

export default router;