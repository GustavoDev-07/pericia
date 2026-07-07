-- Active: 1775677760955@@127.0.0.1@3306
USE pericia;
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios(

    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(250) NOT NULL,
    email VARCHAR (100) NOT NULL,
    cpfCnpj  VARCHAR(14) NOT NULL UNIQUE,
    dataNascimento VARCHAR(10) NOT NULL,
    senha VARCHAR(12) NOT NULL

);

SELECT
    nome,
    email,
    cpfCnpj,
    dataNascimento,
    senha
FROM
    clientes;
