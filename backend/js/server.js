import app from './app.js'

const PORTA = 3000;

app.listen(PORTA, () => {
    console.log("Servidor online em: http://localhost:3000")
})