require('universal-fetch');
async function run() {
    const response = await fetch('http://localhost:8080/main.js');
    if(!response.ok) throw new Error("unable to load main.js from dev server");
    const script = await response.text();
    eval(script);
}
run().catch((error) => console.error(error));