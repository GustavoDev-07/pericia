USE pericia;
DROP TABLE IF EXISTS clientes;
CREATE TABLE usuarios(

    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(250) NOT NULL,
    email VARCHAR (100),
    cpfCnpj  VARCHAR(14) NOT NULL UNIQUE,
    dataNascimento VARCHAR(10),
    senha VARCHAR(12)

);

SELECT
    nome,
    email,
    cpfCnpj,
    dataNascimento,
    senha
FROM
    clientes;
