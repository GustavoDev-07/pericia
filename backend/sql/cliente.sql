-- Active: 1770140835489@@127.0.0.1@3306@pericia
USE pericia;

-- ATENÇÃO: o DROP TABLE abaixo APAGA todos os dados da tabela "usuarios" (e, em cascata,
-- qualquer tabela com FOREIGN KEY ... ON DELETE CASCADE apontando para ela, como
-- "dispositivos"). NÃO rode este script em produção (ex.: banco já em uso no Railway).
-- Esta linha deveria estar em um script separado de reset/seed de ambiente de
-- desenvolvimento, fora do fluxo normal de criação do banco.
DROP TABLE IF EXISTS usuarios;
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(70) NOT NULL,
    dataNascimento DATE,
    cpfCnpj VARCHAR(20) UNIQUE,
    role ENUM('cliente', 'perito', 'logistica', 'admin') DEFAULT 'cliente',
    statusAprovacao ENUM('nenhum', 'pendente', 'aprovado', 'recusado') DEFAULT 'nenhum',
    criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);