import * as t from 'io-ts';
import {PathReporter} from 'io-ts/lib/PathReporter';

const ConfigSchema = t.type({
    port: t.number
});
const decodedResult = t.exact(ConfigSchema).decode(require('../ts-hmr.json'));
if(decodedResult.isLeft()) {
    PathReporter.report(decodedResult);
    //process.exit();
    throw new Error();
}
export const config = decodedResult.value;