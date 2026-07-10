import mysql from 'mysql2/promise.js'

async function conectar() {
    const conexao = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DB
    });
    
    return conexao
};

async function executarQuery(query, params=[]) {
    const conexao = await conectar()

    try{
        const resultado = await conexao.execute(query, params);
        return resultado;
    }
    catch (erro){
        console.log(`Erro ao executar Query: ${erro}`)
    }
    finally{
        await conexao.end();
    }
}
export default executarQuery;