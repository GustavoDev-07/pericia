-- Active: 1775677760955@@127.0.0.1@3306@pericia
USE pericia;

DROP TABLE usuarios;
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
