import jwt from 'jsonwebtoken';

export function verificarToken(req, res, next) {
    const authHeader = req.headears['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({mensagem: "Acesso negado. Token não fornecido."})
    }

    jwt.verify(token, 'SEGREDO', (error, usuarioDecodificado) => {
        if (error) {
            return res.status(403).json({mensagem: "Token inválido ou expirado."});
        }

        req.usuario = usuarioDecodificado
        next();
    });
}

export function permitirCargos(cargosPermitidos) {
    return(req, res, next) => {
        if (!req.usuario || !cargosPermitidos.includes(req.usuario.role)) {
            return res.status(403).json({mensagem: "Acesso negado. Nível de permissão insuficiente."})
        }
        next();
    };
}