import 'universal-fetch';
export const port = 8080;
async function run() {
    const response = await fetch(`http://localhost:${port}/main.js`);
    if(!response.ok) throw new Error("unable to load main.js from dev server");
    const script = await response.text();
    eval(script);
}
run().catch((error) => console.error(error));