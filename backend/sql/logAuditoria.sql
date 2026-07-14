-- Active: 1770140835489@@127.0.0.1@3306@pericia
USE pericia;
CREATE TABLE IF NOT EXISTS logsAuditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuarioId INT DEFAULT NULL, 
    usuarioNome VARCHAR(100) DEFAULT 'Sistema/Visitante',
    acao VARCHAR(150) NOT NULL,  
    detalhes TEXT NOT NULL,       
    criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE SET NULL
);