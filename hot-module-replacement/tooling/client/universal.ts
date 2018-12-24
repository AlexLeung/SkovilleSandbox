import 'universal-fetch';
import {config} from '../json-intake';
async function run() {
    const response = await fetch(`http://localhost:${config.port}/main.js`);
    if(!response.ok) throw new Error("unable to load main.js from dev server");
    const script = await response.text();
    eval(script);
}
run().catch((error) => console.error(error));