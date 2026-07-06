import { Router } from "express";
const router = Router();

router.post('/feedback/:id', async (req, res) => {

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

export default router;