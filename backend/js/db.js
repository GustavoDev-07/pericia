import mysql from 'mysql2/promise.js'

async function conectar() {
    const conexao = mysql.createConnection({
        host: '',
        port: 3306,
        user: 'root',
        password: '',
        database: 'pericia'
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
        console.log('Erro ao executar Query: ${erro}')
    }
    finally{
        await conexao.end();
    }
}
export default executarQuery;