import executarQuery from "./db.js";

async function registrarLog(usuarioId, usuarioNome, acao, detalhes) {
    const query = `
        INSERT INTO logsAuditoria (usuarioId, usuarioNome, acao, detalhes) 
        VALUES (?, ?, ?, ?)
    `;
    try {
        await executarQuery(query, [usuarioId || null, usuarioNome || 'Sistema', acao, detalhes]);
    } catch (error) {
        console.error("Falha ao gravar log de auditoria:", error);
    }
}

export {registrarLog};