import { Router } from "express";
import { permitirCargos, verificarToken } from "../autenticacao";
const router = Router();

router.get('/meus-servicos/', verificarToken, permitirCargos(['cliente', 'perito', 'admin']), async (req, res) => {
    const userId = req.usuario.id;

    try {
        const [linhas] = await executarQuery(
            'SELECT * FROM dispositivos WHERE usuario_id = ?',
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

export default router;